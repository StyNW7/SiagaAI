import { describe, expect, it } from 'vitest';
import { levelFromScore } from '@/lib/risk-levels';
import { piecewise } from '@/lib/utils';
import {
  assessRisk,
  combineFactors,
  composite,
  computeModifier,
  FIRE_WEATHER_ONLY_CAP,
  MODIFIER_BOUNDS,
  scoreFire,
  scoreFlood,
  scoreSmoke,
  summarizeHotspots,
  warningsForProvince,
} from './index';
import type { HazardSignals, PersonalContext } from './types';
import type { Hotspot, OfficialWarning } from '@/types/domain';

const calm: HazardSignals = {
  weather: {
    temperature: 29,
    humidity: 80,
    windSpeed: 8,
    windDirection: 90,
    visibility: 10000,
    weatherCode: 2,
    precip24h: 2,
    precipMaxHourly: 1,
    precipProbMax: 30,
    thunderstormHours: 0,
    gustMax: 18,
    tempMax: 31,
  },
  airQuality: { pm25: 12, usAqi: 40 },
  hotspots: {
    nearestKm: null,
    count25: 0,
    count50: 0,
    count100: 0,
    upwindCount150: 0,
    latestHoursAgo: null,
    frpSum50: 0,
  },
  river: { ratio: 0.9, forecastMax: 100 },
  officialWarning: { active: false, count: 0, titles: [] },
};

const karhutla: HazardSignals = {
  ...calm,
  weather: {
    ...calm.weather!,
    humidity: 42,
    windSpeed: 22,
    precip24h: 0,
    precipMaxHourly: 0,
    visibility: 1500,
    tempMax: 34,
  },
  airQuality: { pm25: 160, usAqi: 210 },
  hotspots: {
    nearestKm: 8,
    count25: 14,
    count50: 38,
    count100: 70,
    upwindCount150: 25,
    latestHoursAgo: 3,
    frpSum50: 900,
  },
};

const student: PersonalContext = {
  occupation: 'student',
  transport: 'motorcycle',
  exposure: 'moderate',
  activity: 'mixed',
};
const office: PersonalContext = {
  occupation: 'office',
  transport: 'car',
  exposure: 'low',
  activity: 'indoor',
};

describe('utility curves', () => {
  it('interpolates piecewise breakpoints and clamps at the ends', () => {
    const pts: [number, number][] = [
      [0, 0],
      [10, 50],
      [20, 100],
    ];
    expect(piecewise(-5, pts)).toBe(0);
    expect(piecewise(5, pts)).toBe(25);
    expect(piecewise(15, pts)).toBe(75);
    expect(piecewise(99, pts)).toBe(100);
  });

  it('maps scores to documented categories', () => {
    expect(levelFromScore(0)).toBe('safe');
    expect(levelFromScore(20)).toBe('safe');
    expect(levelFromScore(21)).toBe('low');
    expect(levelFromScore(60)).toBe('moderate');
    expect(levelFromScore(61)).toBe('high');
    expect(levelFromScore(81)).toBe('critical');
  });
});

describe('weight redistribution', () => {
  it('redistributes the weight of unavailable factors proportionally', () => {
    const r = combineFactors(
      'smoke',
      [
        { key: 'a', label: 'A', displayValue: '', normalized: 80, weight: 0.5, source: '' },
        { key: 'b', label: 'B', displayValue: '', normalized: null, weight: 0.3, source: '' },
        { key: 'c', label: 'C', displayValue: '', normalized: 40, weight: 0.2, source: '' },
      ],
      'x',
    );
    expect(r.coverage).toBe(0.7);
    // 80 × 0.5/0.7 + 40 × 0.2/0.7 = 68.57
    expect(r.score).toBe(69);
    expect(r.confidence).toBe('medium');
  });

  it('refuses to score when coverage is below the minimum', () => {
    const r = combineFactors(
      'flood',
      [
        { key: 'a', label: 'A', displayValue: '', normalized: 90, weight: 0.2, source: '' },
        { key: 'b', label: 'B', displayValue: '', normalized: null, weight: 0.8, source: '' },
      ],
      'x',
    );
    expect(r.available).toBe(false);
    expect(r.score).toBe(0);
  });
});

describe('hazard scoring', () => {
  it('keeps calm conditions safe/low', () => {
    const a = assessRisk(calm, student);
    expect(a.location.score).toBeLessThanOrEqual(40);
    expect(['safe', 'low']).toContain(a.location.level);
  });

  it('flags a dry-season karhutla scenario as high or critical', () => {
    expect(scoreFire(karhutla).score).toBeGreaterThan(70);
    expect(scoreSmoke(karhutla).score).toBeGreaterThan(70);
    const a = assessRisk(karhutla, student);
    expect(['high', 'critical']).toContain(a.location.level);
    expect(['fire', 'smoke']).toContain(a.location.primaryHazard);
  });

  it('does not treat a single distant detection like an active fire cluster', () => {
    const isolated: HazardSignals = {
      ...calm,
      hotspots: {
        nearestKm: 38,
        count25: 0,
        count50: 1,
        count100: 1,
        upwindCount150: 0,
        latestHoursAgo: 3,
        frpSum50: 5,
      },
    };
    expect(scoreFire(isolated).score).toBeLessThanOrEqual(40);
  });

  it('caps fire-weather when no thermal detection is within 100 km', () => {
    const dryNoFire: HazardSignals = {
      ...karhutla,
      hotspots: { ...calm.hotspots! },
    };
    expect(scoreFire(dryNoFire).score).toBeLessThanOrEqual(FIRE_WEATHER_ONLY_CAP);
  });

  it('treats an active BMKG warning plus extreme rain as high flood potential', () => {
    const storm: HazardSignals = {
      ...calm,
      weather: {
        ...calm.weather!,
        precip24h: 120,
        precipMaxHourly: 32,
        precipProbMax: 98,
        thunderstormHours: 4,
      },
      river: { ratio: 2.6, forecastMax: 800 },
      officialWarning: { active: true, count: 1, titles: ['Hujan Lebat'] },
    };
    expect(scoreFlood(storm).score).toBeGreaterThan(80);
  });

  it('never fabricates: missing sources lower confidence instead of assuming zero', () => {
    const noAq = scoreSmoke({ ...karhutla, airQuality: null });
    expect(noAq.factors.find((f) => f.key === 'pm25')?.available).toBe(false);
    expect(noAq.confidence).not.toBe('high');
  });
});

describe('personal exposure', () => {
  it('keeps the modifier within documented bounds', () => {
    const extreme: PersonalContext = {
      occupation: 'outdoor',
      transport: 'motorcycle',
      exposure: 'high',
      activity: 'outdoor',
      ageGroup: 'infant',
    };
    expect(computeModifier('smoke', extreme).value).toBe(MODIFIER_BOUNDS.max);
    const sheltered: PersonalContext = { ...office, ageGroup: 'adult' };
    expect(computeModifier('smoke', sheltered).value).toBeGreaterThanOrEqual(MODIFIER_BOUNDS.min);
  });

  it('gives a motorcycle commuter a higher personal score than an indoor office worker', () => {
    const a = assessRisk(karhutla, student);
    const b = assessRisk(karhutla, office);
    expect(a.personal.score).toBeGreaterThan(b.personal.score);
    expect(a.location.score).toBe(b.location.score);
  });

  it('composite is dominated by the primary hazard', () => {
    const c = composite({ flood: 70, fire: 10, smoke: 5, weather: 20 });
    expect(c.primaryHazard).toBe('flood');
    expect(c.score).toBe(Math.round(70 * 0.85 + 20 * 0.15));
  });
});

describe('hotspot proximity', () => {
  const now = Date.parse('2026-11-22T06:00:00Z');
  const mk = (lat: number, lon: number, hoursAgo: number): Hotspot => ({
    id: `${lat},${lon}`,
    lat,
    lon,
    time: new Date(now - hoursAgo * 3_600_000).toISOString(),
    satellite: 'N20',
    confidence: 'nominal',
    frp: 10,
    dayNight: 'D',
    provinceCode: '62',
  });
  const user = { lat: -2.2, lon: 113.9 };

  it('counts by radius, ignores stale detections and detects upwind sources', () => {
    const list = [mk(-2.25, 113.9, 2), mk(-2.6, 113.9, 10), mk(-2.2, 114.6, 5), mk(-2.21, 113.91, 100)];
    // wind FROM the south (180°) → hotspots south of the user are upwind
    const s = summarizeHotspots(user, list, 180, now);
    expect(s.count25).toBe(1);
    expect(s.count50).toBe(2);
    expect(s.count100).toBe(3);
    expect(s.upwindCount150).toBe(2);
    expect(s.latestHoursAgo).toBeCloseTo(2, 5);
    expect(s.nearestKm).toBeGreaterThan(5);
  });
});

describe('official warnings', () => {
  it('matches BMKG warnings to the user province regardless of formatting', () => {
    const w = [
      {
        id: '1',
        title: 'x',
        description: '',
        province: 'DKI Jakarta',
        areas: [],
        link: '',
        publishedAt: '',
        expiresAt: null,
        hazard: 'rain',
      },
    ] as OfficialWarning[];
    expect(warningsForProvince(w, 'Dki Jakarta')).toHaveLength(1);
    expect(warningsForProvince(w, 'Banten')).toHaveLength(0);
  });
});
