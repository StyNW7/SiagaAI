/* ─────────────────────────────────────────────────────────────────────────────
   Core domain types shared across services, the risk engine and the UI.
   ───────────────────────────────────────────────────────────────────────── */

export interface GeoPoint {
  lat: number;
  lon: number;
}

export type LocationSource = 'gps' | 'search' | 'preset' | 'saved' | 'default';

export interface UserLocation extends GeoPoint {
  id: string;
  name: string;
  /** Province / region label, e.g. "Kalimantan Tengah". */
  region?: string;
  provinceCode?: string;
  source: LocationSource;
  accuracyM?: number;
}

/* ── Data provenance ─────────────────────────────────────────────────────── */

export type DataMode = 'live' | 'snapshot' | 'scenario' | 'cached';
export type FreshnessStatus = 'fresh' | 'aging' | 'stale' | 'unavailable';

export interface Provenance {
  source: string;
  /** When the provider says the data was produced/issued (ISO). */
  issuedAt?: string;
  /** When SiagaAI fetched it (ISO). */
  fetchedAt: string;
  mode: DataMode;
  url?: string;
}

/* ── Weather ─────────────────────────────────────────────────────────────── */

export interface WeatherNow {
  time: string;
  temperature: number | null;
  humidity: number | null;
  /** km/h */
  windSpeed: number | null;
  /** Degrees the wind is coming FROM (meteorological convention). */
  windDirection: number | null;
  windGust: number | null;
  /** WMO weather interpretation code (BMKG codes are mapped onto this). */
  weatherCode: number | null;
  description: string;
  /** metres */
  visibility: number | null;
  cloudCover: number | null;
  apparentTemperature: number | null;
}

export interface HourlyWeather {
  time: string;
  temperature: number | null;
  humidity: number | null;
  precipitation: number | null;
  precipitationProbability: number | null;
  weatherCode: number | null;
  windSpeed: number | null;
  windGust: number | null;
  windDirection: number | null;
}

export interface DailyWeather {
  date: string;
  tempMax: number | null;
  tempMin: number | null;
  precipitationSum: number | null;
  precipitationProbabilityMax: number | null;
  weatherCode: number | null;
}

export interface BmkgForecastEntry {
  localTime: string;
  utcTime: string;
  temperature: number;
  humidity: number;
  windSpeed: number;
  windDirection: number;
  windDirectionText: string;
  cloudCover: number;
  precipitation: number;
  weatherCode: number;
  description: string;
  visibilityText: string;
  icon?: string;
}

export interface BmkgForecast {
  adm4: string;
  village: string;
  district: string;
  city: string;
  province: string;
  entries: BmkgForecastEntry[];
  provenance: Provenance;
}

export interface WeatherSummary24h {
  precipitationSum: number;
  precipitationMaxHourly: number;
  precipitationProbabilityMax: number;
  gustMax: number;
  temperatureMax: number;
  thunderstormHours: number;
  heavyRainHours: number;
}

export interface WeatherBundle {
  current: WeatherNow;
  hourly: HourlyWeather[];
  daily: DailyWeather[];
  next24h: WeatherSummary24h;
  bmkg?: BmkgForecast;
  provenance: Provenance;
}

/* ── Air quality ─────────────────────────────────────────────────────────── */

export interface AirQuality {
  pm25: number | null;
  pm10: number | null;
  usAqi: number | null;
  hourly: { time: string; pm25: number | null }[];
  provenance: Provenance;
}

/* ── Hydrology ───────────────────────────────────────────────────────────── */

export interface RiverDischarge {
  /** m³/s — highest forecast value in the next 7 days. */
  forecastMax: number | null;
  /** m³/s — mean of the past 30 days (baseline). */
  baseline: number | null;
  ratio: number | null;
  series: { date: string; discharge: number | null; forecast: boolean }[];
  provenance: Provenance;
}

/* ── Hotspots ────────────────────────────────────────────────────────────── */

export type HotspotConfidence = 'low' | 'nominal' | 'high';

export interface Hotspot extends GeoPoint {
  id: string;
  /** Acquisition time ISO (UTC). */
  time: string;
  satellite: string;
  confidence: HotspotConfidence;
  /** Fire radiative power (MW). */
  frp: number;
  dayNight: 'D' | 'N';
  provinceCode: string | null;
}

export interface HotspotDataset {
  hotspots: Hotspot[];
  latestDetection: string | null;
  provenance: Provenance;
}

/* ── Official alerts ─────────────────────────────────────────────────────── */

export interface OfficialWarning {
  id: string;
  title: string;
  description: string;
  province: string | null;
  areas: string[];
  link: string;
  publishedAt: string;
  expiresAt: string | null;
  hazard: 'rain' | 'wind' | 'storm' | 'other';
}

export interface Earthquake extends GeoPoint {
  id: string;
  time: string;
  magnitude: number;
  depthKm: number;
  region: string;
  potential: string;
  felt?: string;
  shakemapUrl?: string;
}

export type AlertLevel = 'critical' | 'warning' | 'advisory' | 'info';
export type AlertOrigin = 'official' | 'siaga' | 'community';

export interface SiagaAlert {
  id: string;
  level: AlertLevel;
  category: string;
  title: string;
  description: string;
  location: string;
  time: string;
  source: string;
  sourceUrl?: string;
  updatedAt: string;
  origin: AlertOrigin;
  point?: GeoPoint;
}

/* ── Personal context ────────────────────────────────────────────────────── */

export type Occupation = 'student' | 'office' | 'outdoor' | 'merchant' | 'other';
export type Transport = 'walking' | 'motorcycle' | 'car' | 'public';
export type ExposureLevel = 'low' | 'moderate' | 'high';
export type DailyActivity = 'indoor' | 'mixed' | 'outdoor';

export interface PersonalProfile {
  displayName: string;
  occupation: Occupation;
  transport: Transport;
  exposure: ExposureLevel;
  activity: DailyActivity;
}

export type AgeGroup = 'infant' | 'child' | 'teen' | 'adult' | 'elderly';

export interface FamilyMember {
  id: string;
  name: string;
  relation: string;
  ageGroup: AgeGroup;
  activity: DailyActivity;
  exposure: ExposureLevel;
}

export interface SavedLocation extends GeoPoint {
  id: string;
  name: string;
  region?: string;
  provinceCode?: string;
  createdAt: string;
}

/* ── Community ───────────────────────────────────────────────────────────── */

export type CommunityHazard = 'fire' | 'smoke' | 'flood' | 'weather';

export interface CommunityReport extends GeoPoint {
  id: string;
  hazard: CommunityHazard;
  description: string;
  locationName: string;
  imageUrl?: string;
  createdAt: string;
  author: string;
  confirmations: number;
  isExample?: boolean;
  mine?: boolean;
}
