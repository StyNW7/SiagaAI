/**
 * Siaga Risk Engine — deterministic hazard scoring.
 *
 * Principle: "Algorithm calculates. AI communicates."
 * Every score here is a transparent, documented product heuristic (see
 * docs/METHODOLOGY.md). The LLM never produces or alters these numbers.
 *
 * Each hazard = Σ (normalised indicator × weight). When an indicator's data
 * source is unavailable its weight is redistributed proportionally across the
 * available indicators, and confidence is reduced accordingly.
 */
import { formatDistance, formatNumber } from '@/lib/format';
import { levelFromScore } from '@/lib/risk-levels';
import { clamp, piecewise, round } from '@/lib/utils';
import type { Confidence, HazardScore, HazardSignals, HazardType, RiskFactor } from './types';
import { t } from '@/lib/i18n';

type FactorInput = Omit<RiskFactor, 'effectiveWeight' | 'contribution' | 'available'> & {
  normalized: number | null;
};

/** Minimum share of weight that must be backed by data for a hazard to be scored. */
export const MIN_COVERAGE = 0.4;

/** Without any thermal detection within 100 km, fire-weather alone cannot exceed this. */
export const FIRE_WEATHER_ONLY_CAP = 35;

export const WEIGHTS = {
  fire: { proximity: 0.3, recency: 0.2, dryness: 0.15, wind: 0.15, airQuality: 0.2 },
  smoke: { pm25: 0.5, upwind: 0.3, visibility: 0.2 },
  flood: { rain24h: 0.35, intensity: 0.25, river: 0.2, warning: 0.2 },
  weather: { thunderstorm: 0.35, gust: 0.25, rainProbability: 0.2, heat: 0.2 },
} as const;

/** Breakpoint curves — documented in METHODOLOGY.md. */
export const CURVES = {
  hotspotDistanceKm: [
    [0, 100],
    [5, 100],
    [25, 70],
    [50, 40],
    [100, 10],
    [150, 0],
  ] as [number, number][],
  hotspotDensity50: [
    [0, 0],
    [3, 30],
    [10, 60],
    [30, 90],
    [60, 100],
  ] as [number, number][],
  hotspotRecencyH: [
    [0, 100],
    [6, 100],
    [24, 65],
    [48, 30],
    [96, 0],
  ] as [number, number][],
  humidity: [
    [30, 100],
    [45, 80],
    [60, 45],
    [75, 15],
    [90, 0],
  ] as [number, number][],
  windKmh: [
    [0, 0],
    [5, 10],
    [15, 45],
    [25, 80],
    [35, 100],
  ] as [number, number][],
  pm25: [
    [0, 0],
    [15, 5],
    [35, 30],
    [55, 55],
    [150, 90],
    [250, 100],
  ] as [number, number][],
  upwindCount: [
    [0, 0],
    [2, 30],
    [10, 65],
    [30, 90],
    [60, 100],
  ] as [number, number][],
  visibilityM: [
    [0, 100],
    [1000, 85],
    [3000, 55],
    [5000, 30],
    [10000, 0],
  ] as [number, number][],
  // BMKG daily rainfall classes: ringan <20, sedang 20–50, lebat 50–100, sangat lebat 100–150, ekstrem >150 mm
  rain24h: [
    [0, 0],
    [5, 5],
    [20, 35],
    [50, 65],
    [100, 90],
    [150, 100],
  ] as [number, number][],
  // BMKG hourly classes: ringan 1–5, sedang 5–10, lebat 10–20, sangat lebat >20 mm/jam
  rainHourly: [
    [0, 0],
    [5, 15],
    [10, 45],
    [20, 75],
    [30, 95],
    [40, 100],
  ] as [number, number][],
  riverRatio: [
    [0, 0],
    [1, 0],
    [1.5, 30],
    [2, 55],
    [3, 85],
    [4, 100],
  ] as [number, number][],
  thunderHours: [
    [0, 0],
    [1, 55],
    [3, 80],
    [6, 100],
  ] as [number, number][],
  gustKmh: [
    [0, 0],
    [20, 10],
    [40, 45],
    [60, 80],
    [75, 100],
  ] as [number, number][],
  rainProbability: [
    [0, 0],
    [40, 15],
    [70, 55],
    [90, 85],
    [100, 100],
  ] as [number, number][],
  tempMax: [
    [31, 0],
    [33, 30],
    [35, 60],
    [37, 85],
    [40, 100],
  ] as [number, number][],
};

const confidenceFrom = (coverage: number): Confidence =>
  coverage >= 0.85 ? 'high' : coverage >= 0.6 ? 'medium' : 'low';

/** Combines factors with proportional weight redistribution. Exported for tests. */
export function combineFactors(
  hazard: HazardType,
  inputs: FactorInput[],
  headline: string,
  cap?: number,
): HazardScore {
  const nominal = inputs.reduce((s, f) => s + f.weight, 0);
  const availableWeight = inputs.filter((f) => f.normalized != null).reduce((s, f) => s + f.weight, 0);
  const coverage = nominal > 0 ? availableWeight / nominal : 0;

  const factors: RiskFactor[] = inputs.map((f) => {
    const available = f.normalized != null;
    const effectiveWeight = available && availableWeight > 0 ? f.weight / availableWeight : 0;
    const normalized = f.normalized == null ? null : round(clamp(f.normalized), 1);
    return {
      ...f,
      normalized,
      available,
      effectiveWeight: round(effectiveWeight, 3),
      contribution: normalized == null ? 0 : round(normalized * effectiveWeight, 1),
    };
  });

  const available = coverage >= MIN_COVERAGE;
  let score = available ? factors.reduce((s, f) => s + f.contribution, 0) : 0;
  let note: string | undefined;
  if (cap != null && score > cap) {
    score = cap;
    note = t(
      `Dibatasi ${cap} karena tidak ada deteksi termal satelit dalam radius 100 km.`,
      `Capped at ${cap} because there are no satellite thermal detections within 100 km.`,
    );
  }
  score = Math.round(clamp(score));

  return {
    hazard,
    score,
    level: levelFromScore(score),
    available,
    confidence: available ? confidenceFrom(coverage) : 'low',
    coverage: round(coverage, 2),
    factors,
    headline: available
      ? headline
      : t('Data belum cukup untuk menilai bahaya ini.', 'Not enough data to assess this hazard yet.'),
    note,
  };
}

const na = () => t('Tidak tersedia', 'Not available');

export function scoreFire(s: HazardSignals): HazardScore {
  const h = s.hotspots;
  const w = s.weather;
  const aq = s.airQuality;

  const distance = h ? (h.nearestKm == null ? 0 : piecewise(h.nearestKm, CURVES.hotspotDistanceKm)) : null;
  const density = h ? piecewise(h.count50, CURVES.hotspotDensity50) : null;
  const proximity = distance == null || density == null ? null : 0.65 * distance + 0.35 * density;

  // Recency is scaled by local density: one isolated (possibly industrial) detection
  // should not weigh like an active fire cluster. Full weight from 5 detections ≤50 km.
  const densityFactor = h ? 0.3 + 0.7 * Math.min(1, h.count50 / 5) : 1;
  const recency = h
    ? h.latestHoursAgo == null
      ? 0
      : piecewise(h.latestHoursAgo, CURVES.hotspotRecencyH) * densityFactor
    : null;

  const rainDamping = w ? 1 / (1 + w.precip24h / 5) : 1;
  const dryness = w?.humidity != null ? piecewise(w.humidity, CURVES.humidity) * rainDamping : null;
  const wind = w?.windSpeed != null ? piecewise(w.windSpeed, CURVES.windKmh) : null;
  const air = aq?.pm25 != null ? piecewise(aq.pm25, CURVES.pm25) : null;

  const noNearby = h != null && h.count100 === 0;

  const headline = !h
    ? t(
        'Data titik panas tidak tersedia; penilaian memakai kondisi cuaca.',
        'Hotspot data unavailable; assessment uses weather conditions.',
      )
    : h.nearestKm == null || h.nearestKm > 150
      ? t('Tidak ada titik panas satelit dalam radius 150 km.', 'No satellite hotspots within 150 km.')
      : t(
          `${h.count50} titik panas ≤50 km, terdekat ${formatDistance(h.nearestKm)}.`,
          `${h.count50} hotspot${h.count50 === 1 ? '' : 's'} ≤50 km, nearest ${formatDistance(h.nearestKm)}.`,
        );

  return combineFactors(
    'fire',
    [
      {
        key: 'proximity',
        label: t('Kedekatan & kepadatan titik panas', 'Hotspot proximity & density'),
        displayValue: h
          ? h.nearestKm == null
            ? t('Tidak ada dalam 150 km', 'None within 150 km')
            : t(
                `Terdekat ${formatDistance(h.nearestKm)} · ${h.count50} titik ≤50 km`,
                `Nearest ${formatDistance(h.nearestKm)} · ${h.count50} points ≤50 km`,
              )
          : na(),
        normalized: proximity,
        weight: WEIGHTS.fire.proximity,
        source: 'NASA FIRMS',
      },
      {
        key: 'recency',
        label: t('Kebaruan deteksi', 'Detection recency'),
        displayValue: h
          ? h.latestHoursAgo == null
            ? t('Tidak ada deteksi ≤100 km', 'No detections ≤100 km')
            : t(`${Math.round(h.latestHoursAgo)} jam lalu`, `${Math.round(h.latestHoursAgo)} h ago`)
          : na(),
        normalized: recency,
        weight: WEIGHTS.fire.recency,
        source: 'NASA FIRMS',
      },
      {
        key: 'dryness',
        label: t('Kekeringan lingkungan', 'Environmental dryness'),
        displayValue:
          w?.humidity != null
            ? t(
                `RH ${Math.round(w.humidity)}% · hujan 24j ${formatNumber(w.precip24h, 1)} mm`,
                `RH ${Math.round(w.humidity)}% · 24h rain ${formatNumber(w.precip24h, 1)} mm`,
              )
            : na(),
        normalized: dryness,
        weight: WEIGHTS.fire.dryness,
        source: 'BMKG / Open-Meteo',
      },
      {
        key: 'wind',
        label: t('Kondisi angin', 'Wind conditions'),
        displayValue: w?.windSpeed != null ? `${Math.round(w.windSpeed)} ${t('km/jam', 'km/h')}` : na(),
        normalized: wind,
        weight: WEIGHTS.fire.wind,
        source: 'BMKG / Open-Meteo',
      },
      {
        key: 'airQuality',
        label: t('Kualitas udara (PM2.5)', 'Air quality (PM2.5)'),
        displayValue: aq?.pm25 != null ? `${Math.round(aq.pm25)} µg/m³` : na(),
        normalized: air,
        weight: WEIGHTS.fire.airQuality,
        source: 'CAMS via Open-Meteo',
      },
    ],
    headline,
    noNearby ? FIRE_WEATHER_ONLY_CAP : undefined,
  );
}

export function scoreSmoke(s: HazardSignals): HazardScore {
  const aq = s.airQuality;
  const h = s.hotspots;
  const w = s.weather;

  const pm = aq?.pm25 != null ? piecewise(aq.pm25, CURVES.pm25) : null;
  const upwind = h && w?.windDirection != null ? piecewise(h.upwindCount150, CURVES.upwindCount) : null;
  let visibility = w?.visibility != null ? piecewise(w.visibility, CURVES.visibilityM) : null;
  // BMKG "asap" (10) / "udara kabur" (5→45) observations raise the visibility indicator.
  if (w?.weatherCode === 45) visibility = Math.max(visibility ?? 0, 55);

  const headline =
    aq?.pm25 != null
      ? `PM2.5 ${Math.round(aq.pm25)} µg/m³${h && h.upwindCount150 > 0 ? t(`, ${h.upwindCount150} titik panas searah angin`, `, ${h.upwindCount150} upwind hotspots`) : ''}.`
      : t(
          'Data kualitas udara tidak tersedia; penilaian memakai titik panas & jarak pandang.',
          'Air-quality data unavailable; assessment uses hotspots & visibility.',
        );

  return combineFactors(
    'smoke',
    [
      {
        key: 'pm25',
        label: t('Konsentrasi PM2.5', 'PM2.5 concentration'),
        displayValue:
          aq?.pm25 != null
            ? `${Math.round(aq.pm25)} µg/m³${aq.usAqi != null ? ` · AQI ${aq.usAqi}` : ''}`
            : na(),
        normalized: pm,
        weight: WEIGHTS.smoke.pm25,
        source: 'CAMS via Open-Meteo',
      },
      {
        key: 'upwind',
        label: t('Titik panas searah angin (≤150 km)', 'Upwind hotspots (≤150 km)'),
        displayValue: upwind == null ? na() : t(`${h!.upwindCount150} titik`, `${h!.upwindCount150} points`),
        normalized: upwind,
        weight: WEIGHTS.smoke.upwind,
        source: t('NASA FIRMS + arah angin', 'NASA FIRMS + wind direction'),
      },
      {
        key: 'visibility',
        label: t('Jarak pandang', 'Visibility'),
        displayValue: w?.visibility != null ? `${formatNumber(w.visibility / 1000, 1)} km` : na(),
        normalized: visibility,
        weight: WEIGHTS.smoke.visibility,
        source: 'BMKG / Open-Meteo',
      },
    ],
    headline,
  );
}

export function scoreFlood(s: HazardSignals): HazardScore {
  const w = s.weather;
  const r = s.river;
  const warn = s.officialWarning;

  const rain = w ? piecewise(w.precip24h, CURVES.rain24h) : null;
  const intensity = w ? piecewise(w.precipMaxHourly, CURVES.rainHourly) : null;
  const river = r?.ratio != null ? piecewise(r.ratio, CURVES.riverRatio) : null;
  const warning = warn ? (warn.active ? 100 : 0) : null;

  const headline = warn?.active
    ? t(
        `Peringatan dini BMKG aktif di provinsi ini (${warn.count}).`,
        `BMKG early warning active in this province (${warn.count}).`,
      )
    : w
      ? t(
          `Hujan diperkirakan ${formatNumber(w.precip24h, 1)} mm dalam 24 jam, puncak ${formatNumber(w.precipMaxHourly, 1)} mm/jam.`,
          `Rain forecast ${formatNumber(w.precip24h, 1)} mm over 24 h, peaking at ${formatNumber(w.precipMaxHourly, 1)} mm/h.`,
        )
      : t('Data hujan tidak tersedia.', 'Rainfall data unavailable.');

  return combineFactors(
    'flood',
    [
      {
        key: 'rain24h',
        label: t('Akumulasi hujan 24 jam', '24-hour rainfall accumulation'),
        displayValue: w ? `${formatNumber(w.precip24h, 1)} mm` : na(),
        normalized: rain,
        weight: WEIGHTS.flood.rain24h,
        source: 'BMKG / Open-Meteo',
      },
      {
        key: 'intensity',
        label: t('Intensitas hujan puncak', 'Peak rainfall intensity'),
        displayValue: w ? `${formatNumber(w.precipMaxHourly, 1)} ${t('mm/jam', 'mm/h')}` : na(),
        normalized: intensity,
        weight: WEIGHTS.flood.intensity,
        source: 'Open-Meteo',
      },
      {
        key: 'river',
        label: t('Anomali debit sungai terdekat', 'Nearest river discharge anomaly'),
        displayValue:
          r?.ratio != null
            ? t(`${formatNumber(r.ratio, 1)}× rata-rata 30 hari`, `${formatNumber(r.ratio, 1)}× 30-day average`)
            : na(),
        normalized: river,
        weight: WEIGHTS.flood.river,
        source: 'GloFAS via Open-Meteo',
      },
      {
        key: 'warning',
        label: t('Peringatan dini cuaca BMKG', 'BMKG weather early warning'),
        displayValue: warn
          ? warn.active
            ? t(`${warn.count} peringatan aktif`, `${warn.count} active warnings`)
            : t('Tidak ada', 'None')
          : na(),
        normalized: warning,
        weight: WEIGHTS.flood.warning,
        source: 'BMKG Nowcast',
      },
    ],
    headline,
  );
}

export function scoreWeather(s: HazardSignals): HazardScore {
  const w = s.weather;
  const storm = w
    ? Math.max(
        piecewise(w.thunderstormHours, CURVES.thunderHours),
        w.weatherCode != null && w.weatherCode >= 95 ? 90 : 0,
      )
    : null;
  const gust = w ? piecewise(w.gustMax, CURVES.gustKmh) : null;
  const prob = w ? piecewise(w.precipProbMax, CURVES.rainProbability) : null;
  const heat = w ? piecewise(w.tempMax, CURVES.tempMax) : null;

  const headline = !w
    ? t('Data cuaca tidak tersedia.', 'Weather data unavailable.')
    : w.thunderstormHours > 0
      ? t(
          `Potensi hujan petir ${w.thunderstormHours} jam dalam 24 jam ke depan.`,
          `Possible thunderstorms for ${w.thunderstormHours} h in the next 24 hours.`,
        )
      : w.gustMax >= 40
        ? t(`Hembusan angin hingga ${Math.round(w.gustMax)} km/jam.`, `Wind gusts up to ${Math.round(w.gustMax)} km/h.`)
        : w.tempMax >= 35
          ? t(`Suhu maksimum mencapai ${Math.round(w.tempMax)}°C.`, `Maximum temperature reaches ${Math.round(w.tempMax)}°C.`)
          : t(`Peluang hujan maksimum ${Math.round(w.precipProbMax)}%.`, `Maximum rain probability ${Math.round(w.precipProbMax)}%.`);

  return combineFactors(
    'weather',
    [
      {
        key: 'thunderstorm',
        label: t('Potensi badai petir', 'Thunderstorm potential'),
        displayValue: w ? t(`${w.thunderstormHours} jam dalam 24 jam`, `${w.thunderstormHours} h in 24 h`) : na(),
        normalized: storm,
        weight: WEIGHTS.weather.thunderstorm,
        source: 'BMKG / Open-Meteo',
      },
      {
        key: 'gust',
        label: t('Hembusan angin maksimum', 'Maximum wind gust'),
        displayValue: w ? `${Math.round(w.gustMax)} ${t('km/jam', 'km/h')}` : na(),
        normalized: gust,
        weight: WEIGHTS.weather.gust,
        source: 'Open-Meteo',
      },
      {
        key: 'rainProbability',
        label: t('Peluang hujan maksimum', 'Maximum rain probability'),
        displayValue: w ? `${Math.round(w.precipProbMax)}%` : na(),
        normalized: prob,
        weight: WEIGHTS.weather.rainProbability,
        source: 'Open-Meteo',
      },
      {
        key: 'heat',
        label: t('Suhu maksimum', 'Maximum temperature'),
        displayValue: w ? `${Math.round(w.tempMax)}°C` : na(),
        normalized: heat,
        weight: WEIGHTS.weather.heat,
        source: 'BMKG / Open-Meteo',
      },
    ],
    headline,
  );
}

export function scoreAllHazards(signals: HazardSignals): Record<HazardType, HazardScore> {
  return {
    flood: scoreFlood(signals),
    fire: scoreFire(signals),
    smoke: scoreSmoke(signals),
    weather: scoreWeather(signals),
  };
}
