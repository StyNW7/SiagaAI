/**
 * Builds the structured, privacy-minimised context sent to the AI.
 * Coordinates are rounded to ~1 km; no names/emails are included.
 */
import type { AiContext, Hazard } from '@ai/contracts';
import { selectActions, type ActionTag } from '@/data/preparedness';
import type { FamilyMemberRisk } from '@/features/risk/engine/family';
import { PERSONA_LABELS } from '@/features/risk/engine/exposure';
import { describeWindow } from '@/features/risk/engine/timing';
import type { HazardType, OutdoorWindow, RiskAssessment } from '@/features/risk/engine/types';
import { compass } from '@/lib/format';
import { haversineKm } from '@/lib/geo';
import type { DataMode, Earthquake, PersonalProfile, UserLocation, WeatherBundle } from '@/types/domain';

const AGE: Record<string, string> = {
  infant: 'balita',
  child: 'anak',
  teen: 'remaja',
  adult: 'dewasa',
  elderly: 'lansia',
};

export function profileTags(p: PersonalProfile, hasFamily = false): ActionTag[] {
  const tags: ActionTag[] = [];
  if (p.transport === 'motorcycle') tags.push('motorcycle');
  if (p.transport === 'walking') tags.push('walking');
  if (p.transport === 'car') tags.push('car');
  if (p.transport === 'public') tags.push('public');
  if (p.occupation === 'outdoor' || p.exposure === 'high' || p.activity === 'outdoor') tags.push('outdoor');
  if (p.occupation === 'student') tags.push('student');
  if (p.occupation === 'merchant') tags.push('merchant');
  if (p.occupation === 'office') tags.push('office');
  if (hasFamily) tags.push('family');
  return tags;
}

export interface ContextInput {
  location: UserLocation;
  assessment: RiskAssessment;
  profile: PersonalProfile;
  weather?: WeatherBundle | null;
  dataMode: DataMode;
  scenarioName?: string;
  earthquake?: Earthquake | null;
  warningTitles: string[];
  windows: OutdoorWindow[];
  family?: FamilyMemberRisk[];
  hotspotSource?: string;
  region?: AiContext['region'];
}

export function buildAiContext(i: ContextInput): AiContext {
  const a = i.assessment;
  const hazards = Object.fromEntries(
    (['flood', 'fire', 'smoke', 'weather'] as HazardType[]).map((k) => {
      const h = a.hazards[k];
      return [
        k,
        {
          score: h.score,
          level: h.level,
          personalScore: a.personal.hazards[k].score,
          headline: h.headline,
          available: h.available,
          topFactors: h.factors
            .filter((f) => f.available)
            .sort((x, y) => y.contribution - x.contribution)
            .slice(0, 2)
            .map((f) => ({ label: f.label, value: f.displayValue })),
        },
      ];
    }),
  ) as AiContext['risk']['hazards'];

  const levels = Object.fromEntries(
    (Object.keys(hazards) as Hazard[]).map((k) => [k, a.personal.hazards[k].level]),
  ) as Record<HazardType, RiskAssessment['location']['level']>;
  const guidance = selectActions(
    levels,
    profileTags(i.profile, (i.family?.length ?? 0) > 1),
    undefined,
    12,
  ).map((x) => x.text);

  const s = a.signals;
  const quakeDistance = i.earthquake ? haversineKm(i.location, i.earthquake) : null;

  return {
    location: {
      name: i.location.name,
      region: i.location.region,
      lat: Math.round(i.location.lat * 100) / 100,
      lon: Math.round(i.location.lon * 100) / 100,
    },
    dataMode: i.dataMode,
    scenarioName: i.scenarioName,
    generatedAt: new Date().toISOString(),
    risk: {
      location: { score: a.location.score, level: a.location.level, primaryHazard: a.location.primaryHazard },
      personal: {
        score: a.personal.score,
        level: a.personal.level,
        primaryHazard: a.personal.primaryHazard,
        modifier: a.personal.modifierAvg,
      },
      hazards,
    },
    weather:
      i.weather && s.weather
        ? {
            description: i.weather.current.description,
            temperature: s.weather.temperature,
            humidity: s.weather.humidity,
            windSpeed: s.weather.windSpeed,
            windFrom: s.weather.windDirection != null ? compass(s.weather.windDirection) : null,
            rain24hMm: s.weather.precip24h,
            rainPeakMmPerHour: s.weather.precipMaxHourly,
            rainProbabilityMax: s.weather.precipProbMax,
            thunderstormHours: s.weather.thunderstormHours,
            source: i.weather.provenance.source,
          }
        : null,
    airQuality: s.airQuality,
    hotspots: s.hotspots
      ? {
          nearestKm: s.hotspots.nearestKm != null ? Math.round(s.hotspots.nearestKm) : null,
          within50km: s.hotspots.count50,
          upwind: s.hotspots.upwindCount150,
          latestHoursAgo: s.hotspots.latestHoursAgo != null ? Math.round(s.hotspots.latestHoursAgo) : null,
          source: i.hotspotSource ?? 'NASA FIRMS',
        }
      : null,
    officialWarnings: i.warningTitles.slice(0, 5),
    earthquake:
      i.earthquake && quakeDistance != null && quakeDistance < 500
        ? {
            magnitude: i.earthquake.magnitude,
            region: i.earthquake.region,
            time: i.earthquake.time,
            distanceKm: Math.round(quakeDistance),
          }
        : null,
    profile: {
      occupation: PERSONA_LABELS.occupation[i.profile.occupation],
      transport: PERSONA_LABELS.transport[i.profile.transport],
      exposure: PERSONA_LABELS.exposure[i.profile.exposure],
      activity: PERSONA_LABELS.activity[i.profile.activity],
    },
    family: i.family?.map((f) => ({
      name: f.member.name,
      relation: f.member.relation,
      ageGroup: AGE[f.member.ageGroup] ?? 'dewasa',
      level: f.level,
      priority: f.priority,
    })),
    saferOutdoorWindows: i.windows.map(describeWindow),
    guidance,
    region: i.region ?? null,
  };
}
