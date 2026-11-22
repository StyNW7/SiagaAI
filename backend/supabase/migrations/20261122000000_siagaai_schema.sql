-- ═══════════════════════════════════════════════════════════════════════════
-- SiagaAI — Supabase schema
-- Privacy by design: no precise GPS by default (coordinates rounded client-side),
-- no medical data, Row Level Security on every user-owned table.
-- ═══════════════════════════════════════════════════════════════════════════

create extension if not exists "pgcrypto";

-- ── Enumerations ────────────────────────────────────────────────────────────
do $$ begin
  create type occupation as enum ('student', 'office', 'outdoor', 'merchant', 'other');
  create type transport as enum ('walking', 'motorcycle', 'car', 'public');
  create type exposure_level as enum ('low', 'moderate', 'high');
  create type daily_activity as enum ('indoor', 'mixed', 'outdoor');
  create type age_group as enum ('infant', 'child', 'teen', 'adult', 'elderly');
  create type community_hazard as enum ('fire', 'smoke', 'flood', 'weather');
  create type verification_status as enum ('unverified', 'confirmed', 'rejected');
exception when duplicate_object then null;
end $$;

-- ── Profiles (personal context for the risk engine) ────────────────────────
create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  display_name text check (char_length(display_name) <= 30),
  occupation occupation not null default 'student',
  transport transport not null default 'motorcycle',
  outdoor_exposure exposure_level not null default 'moderate',
  daily_activity daily_activity not null default 'mixed',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ── Family members (age group & exposure only) ─────────────────────────────
create table if not exists public.family_members (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 40),
  relation text not null check (char_length(relation) <= 30),
  age_group age_group not null,
  activity daily_activity not null default 'mixed',
  outdoor_exposure exposure_level not null default 'moderate',
  created_at timestamptz not null default now()
);
create index if not exists family_members_user_idx on public.family_members (user_id);

-- ── Saved locations (only when the user explicitly saves them) ─────────────
create table if not exists public.saved_locations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(name) <= 80),
  region text,
  province_code text,
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  created_at timestamptz not null default now()
);
create index if not exists saved_locations_user_idx on public.saved_locations (user_id);

-- ── Risk snapshots (coarse ±1 km coordinates) ──────────────────────────────
create table if not exists public.risk_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  location_name text not null,
  latitude numeric(6, 2) not null,
  longitude numeric(6, 2) not null,
  fire_score smallint check (fire_score between 0 and 100),
  smoke_score smallint check (smoke_score between 0 and 100),
  flood_score smallint check (flood_score between 0 and 100),
  weather_score smallint check (weather_score between 0 and 100),
  overall_score smallint not null check (overall_score between 0 and 100),
  personal_score smallint check (personal_score between 0 and 100),
  source_timestamp timestamptz not null,
  created_at timestamptz not null default now()
);
create index if not exists risk_snapshots_user_time_idx on public.risk_snapshots (user_id, created_at desc);

-- ── Action plans (AI output, stored as validated JSON) ─────────────────────
create table if not exists public.action_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  risk_snapshot_id uuid references public.risk_snapshots (id) on delete set null,
  content jsonb not null,
  created_at timestamptz not null default now()
);
create index if not exists action_plans_user_idx on public.action_plans (user_id, created_at desc);

-- ── Community reports (public read, authenticated write, never "official") ─
create table if not exists public.community_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  hazard_type community_hazard not null,
  description text not null check (char_length(description) between 15 and 500),
  location_name text,
  latitude numeric(7, 3) not null,
  longitude numeric(7, 3) not null,
  image_url text,
  author_name text check (char_length(author_name) <= 40),
  verification_status verification_status not null default 'unverified',
  confirmations integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists community_reports_time_idx on public.community_reports (created_at desc);

-- ── AI conversations (optional audit of context, no free-text PII) ─────────
create table if not exists public.ai_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  task text not null,
  context jsonb not null,
  provider text,
  created_at timestamptz not null default now()
);

-- ── updated_at trigger ─────────────────────────────────────────────────────
create or replace function public.touch_updated_at() returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;
drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch before update on public.profiles for each row execute function public.touch_updated_at();

-- ═══ Row Level Security ════════════════════════════════════════════════════
alter table public.profiles enable row level security;
alter table public.family_members enable row level security;
alter table public.saved_locations enable row level security;
alter table public.risk_snapshots enable row level security;
alter table public.action_plans enable row level security;
alter table public.community_reports enable row level security;
alter table public.ai_conversations enable row level security;

-- Owner-only access for personal tables.
do $$
declare t text;
begin
  foreach t in array array['profiles', 'family_members', 'saved_locations', 'risk_snapshots', 'action_plans', 'ai_conversations'] loop
    execute format('drop policy if exists "%1$s_owner_all" on public.%1$I', t);
    execute format(
      'create policy "%1$s_owner_all" on public.%1$I for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id)',
      t
    );
  end loop;
end $$;

-- Community: anyone can read; authenticated users insert/delete only their own rows.
drop policy if exists "community_read_all" on public.community_reports;
create policy "community_read_all" on public.community_reports for select using (true);
drop policy if exists "community_insert_own" on public.community_reports;
create policy "community_insert_own" on public.community_reports for insert to authenticated
  with check (auth.uid() = user_id and verification_status = 'unverified');
drop policy if exists "community_delete_own" on public.community_reports;
create policy "community_delete_own" on public.community_reports for delete to authenticated using (auth.uid() = user_id);

-- Confirmations go through a SECURITY DEFINER function (no direct UPDATE grant).
create or replace function public.confirm_report(report_id uuid) returns integer
language sql security definer set search_path = public as $$
  update public.community_reports set confirmations = confirmations + 1
  where id = report_id and auth.uid() is not null
  returning confirmations;
$$;
grant execute on function public.confirm_report(uuid) to authenticated;

-- ═══ Storage: community photos ═════════════════════════════════════════════
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('community', 'community', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

drop policy if exists "community_photos_read" on storage.objects;
create policy "community_photos_read" on storage.objects for select using (bucket_id = 'community');
drop policy if exists "community_photos_upload_own_folder" on storage.objects;
create policy "community_photos_upload_own_folder" on storage.objects for insert to authenticated
  with check (bucket_id = 'community' and (storage.foldername(name))[1] = auth.uid()::text);

-- ═══ Realtime: live community feed ═════════════════════════════════════════
do $$ begin
  alter publication supabase_realtime add table public.community_reports;
exception when duplicate_object then null;
end $$;
