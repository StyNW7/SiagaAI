const WIB = 'Asia/Jakarta';

const timeFmt = new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: WIB });
const dateFmt = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', timeZone: WIB });
const dateTimeFmt = new Intl.DateTimeFormat('id-ID', {
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: WIB,
});
const weekdayFmt = new Intl.DateTimeFormat('id-ID', { weekday: 'short', timeZone: WIB });
const longDateFmt = new Intl.DateTimeFormat('id-ID', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: WIB,
});

const toDate = (value: string | number | Date) => (value instanceof Date ? value : new Date(value));
const colon = (s: string) => s.replace(/\./g, ':');

export const formatTime = (value: string | number | Date) => `${colon(timeFmt.format(toDate(value)))} WIB`;
export const formatHour = (value: string | number | Date) => colon(timeFmt.format(toDate(value)));
export const formatDate = (value: string | number | Date) => dateFmt.format(toDate(value));
export const formatDateTime = (value: string | number | Date) =>
  `${colon(dateTimeFmt.format(toDate(value)))} WIB`;
export const formatWeekday = (value: string | number | Date) => weekdayFmt.format(toDate(value));
export const formatLongDate = (value: string | number | Date) => longDateFmt.format(toDate(value));

export function timeAgo(value: string | number | Date, now = Date.now()): string {
  const diff = Math.max(0, now - toDate(value).getTime());
  const min = Math.round(diff / 60000);
  if (min < 1) return 'baru saja';
  if (min < 60) return `${min} menit lalu`;
  const hours = Math.round(min / 60);
  if (hours < 24) return `${hours} jam lalu`;
  const days = Math.round(hours / 24);
  return `${days} hari lalu`;
}

export const hoursSince = (value: string | number | Date, now = Date.now()) =>
  (now - toDate(value).getTime()) / 3_600_000;

export const formatNumber = (value: number, digits = 0) =>
  new Intl.NumberFormat('id-ID', { maximumFractionDigits: digits, minimumFractionDigits: 0 }).format(value);

export function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  if (km < 10) return `${formatNumber(km, 1)} km`;
  return `${formatNumber(km)} km`;
}

const COMPASS = ['Utara', 'Timur Laut', 'Timur', 'Tenggara', 'Selatan', 'Barat Daya', 'Barat', 'Barat Laut'];
const COMPASS_SHORT = ['U', 'TL', 'T', 'TG', 'S', 'BD', 'B', 'BL'];
const idx = (deg: number) => Math.round((((deg % 360) + 360) % 360) / 45) % 8;

export const compass = (deg: number) => COMPASS[idx(deg)];
export const compassShort = (deg: number) => COMPASS_SHORT[idx(deg)];
