import type { AlertLevel, Earthquake } from '@/types/domain';

/**
 * Alert level of an earthquake *for this user*: magnitude sets the ceiling, distance and
 * age lower it. A tsunami-potential quake stays critical. A strong but distant (or days-old)
 * quake is information, not a critical alert, for someone 2,000 km away.
 */
export function quakeLevel(q: Earthquake, distanceKm = 0, now = Date.now()): AlertLevel {
  const tsunami = /berpotensi tsunami/i.test(q.potential) && !/tidak berpotensi/i.test(q.potential);
  if (tsunami) return 'critical';
  if (now - new Date(q.time).getTime() > 3 * 86_400_000) return 'info';
  const order: AlertLevel[] = ['info', 'advisory', 'warning', 'critical'];
  const base = q.magnitude >= 7 ? 3 : q.magnitude >= 6 ? 2 : q.magnitude >= 5 ? 1 : 0;
  const drop = distanceKm <= 300 ? 0 : distanceKm <= 1000 ? 1 : 3;
  return order[Math.max(0, base - drop)];
}
