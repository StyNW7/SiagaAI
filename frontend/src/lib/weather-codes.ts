/** WMO weather interpretation codes (Open-Meteo) → Bahasa Indonesia. */
const WMO: Record<number, string> = {
  0: 'Cerah',
  1: 'Cerah berawan',
  2: 'Berawan sebagian',
  3: 'Berawan',
  45: 'Berkabut',
  48: 'Kabut beku',
  51: 'Gerimis ringan',
  53: 'Gerimis',
  55: 'Gerimis lebat',
  56: 'Gerimis beku',
  57: 'Gerimis beku',
  61: 'Hujan ringan',
  63: 'Hujan sedang',
  65: 'Hujan lebat',
  66: 'Hujan beku',
  67: 'Hujan beku',
  80: 'Hujan lokal ringan',
  81: 'Hujan lokal',
  82: 'Hujan lokal sangat lebat',
  95: 'Hujan disertai petir',
  96: 'Badai petir & hujan es',
  99: 'Badai petir hebat',
};

export const describeWmo = (code: number | null | undefined) =>
  code == null ? 'Tidak tersedia' : (WMO[code] ?? 'Berawan');

/**
 * BMKG weather codes → closest WMO code, so the risk engine can treat both
 * providers uniformly. Ref: BMKG Open Data "kode cuaca".
 */
const BMKG_TO_WMO: Record<number, number> = {
  0: 0, // Cerah
  1: 1, // Cerah berawan
  2: 1,
  3: 2, // Berawan
  4: 3, // Berawan tebal
  5: 45, // Udara kabur
  10: 45, // Asap
  45: 45, // Kabut
  60: 61, // Hujan ringan
  61: 63, // Hujan sedang
  63: 65, // Hujan lebat
  80: 81, // Hujan lokal
  95: 95, // Hujan petir
  97: 95, // Hujan petir
};

export const bmkgToWmo = (code: number) => BMKG_TO_WMO[code] ?? 3;

export const isThunderstorm = (code: number | null | undefined) => code != null && code >= 95;
export const isHeavyRain = (code: number | null | undefined) =>
  code != null && (code === 65 || code === 82 || code >= 95);

export type WeatherIconKey =
  'sun' | 'cloud-sun' | 'cloud' | 'fog' | 'drizzle' | 'rain' | 'heavy-rain' | 'storm';

export function weatherIconKey(code: number | null | undefined): WeatherIconKey {
  if (code == null) return 'cloud';
  if (code === 0) return 'sun';
  if (code <= 2) return 'cloud-sun';
  if (code === 3) return 'cloud';
  if (code === 45 || code === 48) return 'fog';
  if (code >= 51 && code <= 57) return 'drizzle';
  if (code === 65 || code === 82) return 'heavy-rain';
  if (code >= 95) return 'storm';
  return 'rain';
}
