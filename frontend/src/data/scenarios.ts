/**
 * Demo scenarios — SIMULATED data so judges can evaluate high-risk behaviour
 * from any location/season. Every screen shows a persistent "Mode Skenario"
 * banner while a scenario is active; scenario data is never presented as live.
 *
 * Patterns are modelled on typical dry-season peat-fire episodes and
 * wet-season extreme rainfall, but the numbers are synthetic.
 */
import { describeWmo } from '@/lib/weather-codes';
import { t } from '@/lib/i18n';
import type {
  AirQuality,
  Hotspot,
  HotspotDataset,
  OfficialWarning,
  RiverDischarge,
  UserLocation,
  WeatherBundle,
} from '@/types/domain';
import { summarizeNext24h } from '@/services/weather/open-meteo';
import { CITY_BY_SLUG } from './cities';

export type ScenarioId = 'karhutla-kalteng' | 'banjir-jakarta';

export interface ScenarioMeta {
  id: ScenarioId;
  title: string;
  subtitle: string;
  emoji: string;
  location: UserLocation;
}

const city = (slug: string): UserLocation => {
  const c = CITY_BY_SLUG[slug];
  return {
    id: `scenario-${slug}`,
    name: c.name,
    region: c.province,
    provinceCode: c.provinceCode,
    lat: c.lat,
    lon: c.lon,
    source: 'preset',
  };
};

export const SCENARIOS: Record<ScenarioId, ScenarioMeta> = {
  'karhutla-kalteng': {
    id: 'karhutla-kalteng',
    get title() {
      return t('Puncak Karhutla & Kabut Asap', 'Peak Wildfire & Haze');
    },
    get subtitle() {
      return t(
        'Palangka Raya, Kalimantan Tengah — simulasi musim kemarau',
        'Palangka Raya, Central Kalimantan — dry-season simulation',
      );
    },
    emoji: '🔥',
    location: city('palangka-raya'),
  },
  'banjir-jakarta': {
    id: 'banjir-jakarta',
    get title() {
      return t('Hujan Ekstrem & Banjir', 'Extreme Rain & Flooding');
    },
    get subtitle() {
      return t(
        'Jakarta Utara, DKI Jakarta — simulasi puncak musim hujan',
        'North Jakarta, DKI Jakarta — peak rainy-season simulation',
      );
    },
    emoji: '🌊',
    location: city('jakarta-utara'),
  },
};

/** Mulberry32 — deterministic PRNG so the scenario looks identical on every visit. */
function prng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const hourStart = (now: number) => Math.floor(now / 3_600_000) * 3_600_000;
const wibHour = (t: number) => (new Date(t).getUTCHours() + 7) % 24;

interface ScenarioData {
  weather: WeatherBundle;
  airQuality: AirQuality;
  hotspots: HotspotDataset;
  river: RiverDischarge;
  warnings: OfficialWarning[];
}

const provenance = (source: string) => ({
  source: `${t('SIMULASI', 'SIMULATION')} — ${source}`,
  fetchedAt: new Date().toISOString(),
  mode: 'scenario' as const,
});

function karhutla(now: number): ScenarioData {
  const rand = prng(2019);
  const t0 = hourStart(now);
  const hourly = Array.from({ length: 74 }, (_, i) => {
    const ts = t0 + (i - 2) * 3_600_000;
    const h = wibHour(ts);
    const day = h >= 9 && h <= 17;
    return {
      time: new Date(ts).toISOString(),
      temperature: day ? 33 + rand() * 2.5 : 26 + rand() * 2,
      humidity: day ? 38 + rand() * 8 : 62 + rand() * 10,
      precipitation: 0,
      precipitationProbability: Math.round(rand() * 8),
      weatherCode: 45,
      windSpeed: day ? 18 + rand() * 8 : 8 + rand() * 5,
      windGust: day ? 30 + rand() * 10 : 15 + rand() * 6,
      windDirection: 130 + rand() * 15,
    };
  });
  // Hotspots concentrated S–SE of the city (upwind for an ESE wind), peat-land pattern.
  const hotspots: Hotspot[] = Array.from({ length: 140 }, (_, i) => {
    const cluster = i % 3;
    const center =
      cluster === 0
        ? { lat: -2.55, lon: 114.1 }
        : cluster === 1
          ? { lat: -2.85, lon: 114.25 }
          : { lat: -2.35, lon: 113.75 };
    const lat = center.lat + (rand() - 0.5) * 0.35;
    const lon = center.lon + (rand() - 0.5) * 0.35;
    const age = rand() * (cluster === 2 ? 60 : 30);
    return {
      id: `sim-${i}`,
      lat,
      lon,
      time: new Date(now - age * 3_600_000).toISOString(),
      satellite: ['N20', 'N21', 'N'][i % 3],
      confidence: rand() > 0.3 ? 'nominal' : 'high',
      frp: Math.round((3 + rand() * 40) * 10) / 10,
      dayNight: rand() > 0.4 ? 'D' : 'N',
      provinceCode: '62',
    };
  });
  const cur = hourly[2];
  return {
    weather: {
      current: {
        time: cur.time,
        temperature: 34,
        humidity: 41,
        windSpeed: 21,
        windDirection: 135,
        windGust: 34,
        weatherCode: 45,
        description: t('Udara kabur / asap', 'Haze / smoke'),
        visibility: 1200,
        cloudCover: 20,
        apparentTemperature: 37,
      },
      hourly,
      daily: [0, 1, 2, 3].map((d) => ({
        date: new Date(now + d * 86_400_000).toISOString().slice(0, 10),
        tempMax: 35,
        tempMin: 25,
        precipitationSum: 0,
        precipitationProbabilityMax: 8,
        weatherCode: 45,
      })),
      next24h: summarizeNext24h(hourly, now),
      provenance: provenance(t('Cuaca kemarau ekstrem', 'Extreme dry-season weather')),
    },
    airQuality: {
      pm25: 168,
      pm10: 210,
      usAqi: 218,
      hourly: hourly.map((h) => ({
        time: h.time,
        pm25:
          wibHour(new Date(h.time).getTime()) >= 11 && wibHour(new Date(h.time).getTime()) <= 15
            ? 85 + rand() * 25
            : 150 + rand() * 60,
      })),
      provenance: provenance(t('PM2.5 kabut asap', 'Haze PM2.5')),
    },
    hotspots: {
      hotspots,
      latestDetection: new Date(now - 1.2 * 3_600_000).toISOString(),
      provenance: provenance(t('Titik panas pola gambut', 'Peatland hotspot pattern')),
    },
    river: {
      forecastMax: 120,
      baseline: 210,
      ratio: 0.57,
      series: [],
      provenance: provenance(t('Debit sungai surut', 'Receding river discharge')),
    },
    warnings: [],
  };
}

function banjir(now: number): ScenarioData {
  const rand = prng(2020);
  const t0 = hourStart(now);
  const hourly = Array.from({ length: 74 }, (_, i) => {
    const ts = t0 + (i - 2) * 3_600_000;
    const h = wibHour(ts);
    const storm = (i >= 3 && i <= 8) || (i >= 26 && i <= 29);
    const precipitation = storm ? 14 + rand() * 20 : h >= 0 && h <= 6 ? 1 + rand() * 3 : rand() * 1.5;
    return {
      time: new Date(ts).toISOString(),
      temperature: storm ? 25 + rand() : 27 + rand() * 3,
      humidity: storm ? 95 : 85 + rand() * 8,
      precipitation: Math.round(precipitation * 10) / 10,
      precipitationProbability: storm ? 95 + Math.round(rand() * 5) : 60 + Math.round(rand() * 25),
      weatherCode: storm ? 95 : precipitation > 2 ? 63 : 61,
      windSpeed: storm ? 28 + rand() * 10 : 12 + rand() * 6,
      windGust: storm ? 50 + rand() * 15 : 22 + rand() * 8,
      windDirection: 280 + rand() * 20,
    };
  });
  const cur = hourly[2];
  const today = new Date(now).toISOString().slice(0, 10);
  const series = Array.from({ length: 37 }, (_, i) => {
    const date = new Date(now + (i - 30) * 86_400_000).toISOString().slice(0, 10);
    const base = 60 + rand() * 12;
    return {
      date,
      discharge: Math.round(i >= 30 ? base * (1.8 + (i - 30) * 0.25) : base),
      forecast: date >= today,
    };
  });
  return {
    weather: {
      current: {
        time: cur.time,
        temperature: 26,
        humidity: 94,
        windSpeed: 26,
        windDirection: 290,
        windGust: 52,
        weatherCode: 95,
        description: describeWmo(95),
        visibility: 4000,
        cloudCover: 100,
        apparentTemperature: 28,
      },
      hourly,
      daily: [0, 1, 2, 3].map((d) => ({
        date: new Date(now + d * 86_400_000).toISOString().slice(0, 10),
        tempMax: 29,
        tempMin: 24,
        precipitationSum: d === 0 ? 128 : 60,
        precipitationProbabilityMax: 100,
        weatherCode: 95,
      })),
      next24h: summarizeNext24h(hourly, now),
      provenance: provenance(t('Hujan ekstrem', 'Extreme rain')),
    },
    airQuality: {
      pm25: 14,
      pm10: 22,
      usAqi: 55,
      hourly: hourly.map((h) => ({ time: h.time, pm25: 10 + rand() * 8 })),
      provenance: provenance(t('Kualitas udara', 'Air quality')),
    },
    hotspots: { hotspots: [], latestDetection: null, provenance: provenance(t('Tidak ada titik panas', 'No hotspots')) },
    river: {
      forecastMax: 190,
      baseline: 66,
      ratio: 2.9,
      series,
      provenance: provenance(t('Debit sungai meningkat', 'Rising river discharge')),
    },
    warnings: [
      {
        id: 'SIM-JKT-1',
        title: t(
          'SIMULASI — Hujan Lebat disertai Petir di DKI Jakarta',
          'SIMULATION — Heavy Rain with Thunderstorms in DKI Jakarta',
        ),
        description: t(
          'SIMULASI DEMONSTRASI (bukan peringatan resmi). Hujan lebat disertai petir dan angin kencang berpotensi terjadi di Jakarta Utara, Jakarta Pusat, dan Jakarta Barat. Berpotensi menimbulkan genangan dan banjir lokal.',
          'DEMONSTRATION SIMULATION (not an official warning). Heavy rain with thunderstorms and strong winds may occur in North, Central and West Jakarta, potentially causing waterlogging and local flooding.',
        ),
        province: 'DKI Jakarta',
        areas: ['Jakarta Utara', 'Jakarta Pusat', 'Jakarta Barat'],
        link: 'https://www.bmkg.go.id/alerts/nowcast/id',
        publishedAt: new Date(now - 40 * 60_000).toISOString(),
        expiresAt: new Date(now + 4 * 3_600_000).toISOString(),
        hazard: 'storm',
      },
    ],
  };
}

export function buildScenario(id: ScenarioId, now = Date.now()): ScenarioData {
  return id === 'karhutla-kalteng' ? karhutla(now) : banjir(now);
}
