import { getLang, locale, t } from '@/lib/i18n';

const WIB = 'Asia/Jakarta';

type FmtKey = 'time' | 'date' | 'dateTime' | 'weekday' | 'longDate';
const OPTIONS: Record<FmtKey, Intl.DateTimeFormatOptions> = {
  time: { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: WIB },
  date: { day: 'numeric', month: 'short', timeZone: WIB },
  dateTime: { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false, timeZone: WIB },
  weekday: { weekday: 'short', timeZone: WIB },
  longDate: { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: WIB },
};

/** Intl formatters are cached per language. */
const cache = new Map<string, Intl.DateTimeFormat>();
function fmt(key: FmtKey) {
  const id = `${getLang()}:${key}`;
  let f = cache.get(id);
  if (!f) {
    f = new Intl.DateTimeFormat(locale(), OPTIONS[key]);
    cache.set(id, f);
  }
  return f;
}

const toDate = (value: string | number | Date) => (value instanceof Date ? value : new Date(value));
const colon = (s: string) => s.replace(/\./g, ':');

export const formatTime = (value: string | number | Date) => `${colon(fmt('time').format(toDate(value)))} WIB`;
export const formatHour = (value: string | number | Date) => colon(fmt('time').format(toDate(value)));
export const formatDate = (value: string | number | Date) => fmt('date').format(toDate(value));
export const formatDateTime = (value: string | number | Date) =>
  `${colon(fmt('dateTime').format(toDate(value)))} WIB`;
export const formatWeekday = (value: string | number | Date) => fmt('weekday').format(toDate(value));
export const formatLongDate = (value: string | number | Date) => fmt('longDate').format(toDate(value));

export function timeAgo(value: string | number | Date, now = Date.now()): string {
  const diff = Math.max(0, now - toDate(value).getTime());
  const min = Math.round(diff / 60000);
  if (min < 1) return t('baru saja', 'just now');
  if (min < 60) return t(`${min} menit lalu`, `${min} min ago`);
  const hours = Math.round(min / 60);
  if (hours < 24) return t(`${hours} jam lalu`, `${hours} h ago`);
  const days = Math.round(hours / 24);
  return t(`${days} hari lalu`, days === 1 ? '1 day ago' : `${days} days ago`);
}

export const hoursSince = (value: string | number | Date, now = Date.now()) =>
  (now - toDate(value).getTime()) / 3_600_000;

export const formatNumber = (value: number, digits = 0) =>
  new Intl.NumberFormat(locale(), { maximumFractionDigits: digits, minimumFractionDigits: 0 }).format(value);

export function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  if (km < 10) return `${formatNumber(km, 1)} km`;
  return `${formatNumber(km)} km`;
}

const COMPASS_ID = ['Utara', 'Timur Laut', 'Timur', 'Tenggara', 'Selatan', 'Barat Daya', 'Barat', 'Barat Laut'];
const COMPASS_EN = ['North', 'Northeast', 'East', 'Southeast', 'South', 'Southwest', 'West', 'Northwest'];
const COMPASS_SHORT_ID = ['U', 'TL', 'T', 'TG', 'S', 'BD', 'B', 'BL'];
const COMPASS_SHORT_EN = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
const idx = (deg: number) => Math.round((((deg % 360) + 360) % 360) / 45) % 8;

export const compass = (deg: number) => (getLang() === 'en' ? COMPASS_EN : COMPASS_ID)[idx(deg)];
export const compassShort = (deg: number) =>
  (getLang() === 'en' ? COMPASS_SHORT_EN : COMPASS_SHORT_ID)[idx(deg)];
