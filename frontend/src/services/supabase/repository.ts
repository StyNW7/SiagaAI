/**
 * Supabase data access (tables defined in backend/supabase/migrations).
 * All tables are protected by Row Level Security: users can only read/write
 * their own rows; community reports are publicly readable.
 */
import type { CommunityReport, FamilyMember, PersonalProfile, SavedLocation } from '@/types/domain';
import type { RiskSnapshot, SavedPlan } from '@/stores';
import { supabase } from './client';

const db = () => {
  if (!supabase) throw new Error('Supabase not configured');
  return supabase;
};

export async function pullUserData(userId: string) {
  const s = db();
  const [profile, family, locations, plans] = await Promise.all([
    s.from('profiles').select('*').eq('user_id', userId).maybeSingle(),
    s.from('family_members').select('*').eq('user_id', userId),
    s.from('saved_locations').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
    s
      .from('action_plans')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20),
  ]);
  return {
    profile: profile.data
      ? ({
          displayName: profile.data.display_name ?? '',
          occupation: profile.data.occupation,
          transport: profile.data.transport,
          exposure: profile.data.outdoor_exposure,
          activity: profile.data.daily_activity,
        } as PersonalProfile)
      : null,
    family: (family.data ?? []).map(
      (f) =>
        ({
          id: f.id,
          name: f.name,
          relation: f.relation,
          ageGroup: f.age_group,
          activity: f.activity,
          exposure: f.outdoor_exposure,
        }) as FamilyMember,
    ),
    locations: (locations.data ?? []).map(
      (l) =>
        ({
          id: l.id,
          name: l.name,
          region: l.region,
          provinceCode: l.province_code,
          lat: l.latitude,
          lon: l.longitude,
          createdAt: l.created_at,
        }) as SavedLocation,
    ),
    plans: (plans.data ?? []).map(
      (p) => ({ ...(p.content as SavedPlan), id: p.id, createdAt: p.created_at }) as SavedPlan,
    ),
  };
}

export async function pushProfile(userId: string, p: PersonalProfile) {
  await db()
    .from('profiles')
    .upsert(
      {
        user_id: userId,
        display_name: p.displayName,
        occupation: p.occupation,
        transport: p.transport,
        outdoor_exposure: p.exposure,
        daily_activity: p.activity,
      },
      { onConflict: 'user_id' },
    );
}

export async function replaceFamily(userId: string, members: FamilyMember[]) {
  const s = db();
  await s.from('family_members').delete().eq('user_id', userId);
  if (members.length)
    await s
      .from('family_members')
      .insert(
        members.map((m) => ({
          id: m.id,
          user_id: userId,
          name: m.name,
          relation: m.relation,
          age_group: m.ageGroup,
          activity: m.activity,
          outdoor_exposure: m.exposure,
        })),
      );
}

export async function replaceLocations(userId: string, list: SavedLocation[]) {
  const s = db();
  await s.from('saved_locations').delete().eq('user_id', userId);
  if (list.length)
    await s
      .from('saved_locations')
      .insert(
        list.map((l) => ({
          id: l.id,
          user_id: userId,
          name: l.name,
          region: l.region,
          province_code: l.provinceCode,
          latitude: l.lat,
          longitude: l.lon,
          created_at: l.createdAt,
        })),
      );
}

export async function upsertPlan(userId: string, plan: SavedPlan) {
  await db()
    .from('action_plans')
    .upsert({ id: plan.id, user_id: userId, content: plan, created_at: plan.createdAt });
}

export async function insertSnapshot(userId: string, s: RiskSnapshot) {
  if (s.scenario) return;
  await db()
    .from('risk_snapshots')
    .insert({
      user_id: userId,
      location_name: s.locationName,
      latitude: Math.round(s.lat * 100) / 100,
      longitude: Math.round(s.lon * 100) / 100,
      fire_score: s.hazards.fire,
      smoke_score: s.hazards.smoke,
      flood_score: s.hazards.flood,
      weather_score: s.hazards.weather,
      overall_score: s.score,
      personal_score: s.personalScore,
      source_timestamp: s.time,
    });
}

export async function fetchCommunityReports(): Promise<CommunityReport[]> {
  const { data } = await db()
    .from('community_reports')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(60);
  return (data ?? []).map(rowToReport);
}

export function rowToReport(r: Record<string, unknown>): CommunityReport {
  return {
    id: String(r.id),
    hazard: r.hazard_type as CommunityReport['hazard'],
    description: String(r.description ?? ''),
    locationName: String(r.location_name ?? ''),
    lat: Number(r.latitude),
    lon: Number(r.longitude),
    imageUrl: (r.image_url as string) ?? undefined,
    createdAt: String(r.created_at),
    author: String(r.author_name ?? 'Warga'),
    confirmations: Number(r.confirmations ?? 0),
  };
}

export async function uploadReportImage(userId: string, file: Blob): Promise<string | undefined> {
  const s = db();
  const path = `${userId}/${crypto.randomUUID()}.jpg`;
  const { error } = await s.storage
    .from('community')
    .upload(path, file, { contentType: 'image/jpeg', upsert: false });
  if (error) return undefined;
  return s.storage.from('community').getPublicUrl(path).data.publicUrl;
}

export async function insertCommunityReport(
  userId: string,
  r: Omit<CommunityReport, 'id' | 'createdAt' | 'confirmations'>,
) {
  const { data } = await db()
    .from('community_reports')
    .insert({
      user_id: userId,
      hazard_type: r.hazard,
      description: r.description,
      location_name: r.locationName,
      latitude: Math.round(r.lat * 1000) / 1000,
      longitude: Math.round(r.lon * 1000) / 1000,
      image_url: r.imageUrl,
      author_name: r.author,
      verification_status: 'unverified',
    })
    .select()
    .single();
  return data ? rowToReport(data) : null;
}
