-- ═══════════════════════════════════════════════════════════════════════════
-- SiagaAI — competition demo account (idempotent).
--   Email    : demo@siagaai.id
--   Password : SiagaAI2026!
-- Runs automatically on `supabase db reset` (local). For a hosted project, run
-- this file once in the Supabase SQL editor after applying the migrations.
-- This is a public, clearly-labelled demo account with sample data only.
-- ═══════════════════════════════════════════════════════════════════════════

do $$
declare
  demo_id uuid := '5a1a6a00-0000-4000-8000-000000002026';
begin
  if not exists (select 1 from auth.users where email = 'demo@siagaai.id') then
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, recovery_token, email_change, email_change_token_new
    ) values (
      '00000000-0000-0000-0000-000000000000', demo_id, 'authenticated', 'authenticated',
      'demo@siagaai.id', extensions.crypt('SiagaAI2026!', extensions.gen_salt('bf')), now(),
      '{"provider":"email","providers":["email"]}', '{"name":"Demo User"}', now(), now(),
      '', '', '', ''
    );

    insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    values (
      gen_random_uuid(), demo_id, demo_id::text,
      jsonb_build_object('sub', demo_id::text, 'email', 'demo@siagaai.id', 'email_verified', true),
      'email', now(), now(), now()
    );
  else
    select id into demo_id from auth.users where email = 'demo@siagaai.id';
  end if;

  -- Profile (row is created by the on_auth_user_created trigger; upsert the demo context).
  insert into public.profiles (user_id, display_name, occupation, transport, outdoor_exposure, daily_activity)
  values (demo_id, 'Demo User', 'student', 'motorcycle', 'moderate', 'mixed')
  on conflict (user_id) do update set
    display_name = excluded.display_name,
    occupation = excluded.occupation,
    transport = excluded.transport,
    outdoor_exposure = excluded.outdoor_exposure,
    daily_activity = excluded.daily_activity;

  -- Three sample family members.
  if not exists (select 1 from public.family_members where user_id = demo_id) then
    insert into public.family_members (user_id, name, relation, age_group, activity, outdoor_exposure) values
      (demo_id, 'Nenek Sri', 'Nenek', 'elderly', 'indoor', 'low'),
      (demo_id, 'Adik Rafa', 'Saudara', 'child', 'mixed', 'moderate'),
      (demo_id, 'Ayah', 'Ayah', 'adult', 'outdoor', 'high');
  end if;

  -- Saved location: Palangka Raya (peatland — fire & smoke focus).
  if not exists (select 1 from public.saved_locations where user_id = demo_id) then
    insert into public.saved_locations (user_id, name, region, province_code, latitude, longitude)
    values (demo_id, 'Palangka Raya', 'Kalimantan Tengah', '62', -2.2097, 113.9135);
  end if;
end $$;
