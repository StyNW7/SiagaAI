import { useEffect, useRef } from 'react';
import { useAlerts } from '@/features/alerts/use-alerts';
import { useHistoryStore, useSettings } from '@/stores';
import { t } from '@/lib/i18n';

/**
 * Side-effects only:
 *  - records an hourly risk snapshot (Risk History),
 *  - raises a local PWA notification for new critical/warning alerts (opt-in).
 */
export function RiskRecorder() {
  const { alerts, view } = useAlerts();
  const record = useHistoryStore((s) => s.record);
  const notifications = useSettings((s) => s.notifications);
  const { assessment, location, scenario } = view;
  const notified = useRef<Set<string>>(new Set(JSON.parse(sessionStorage.getItem('siaga.notified') ?? '[]')));

  useEffect(() => {
    if (!assessment) return;
    record({
      time: assessment.computedAt,
      locationName: location.name,
      lat: location.lat,
      lon: location.lon,
      score: assessment.location.score,
      personalScore: assessment.personal.score,
      level: assessment.location.level,
      primaryHazard: assessment.location.primaryHazard,
      hazards: {
        flood: assessment.hazards.flood.score,
        fire: assessment.hazards.fire.score,
        smoke: assessment.hazards.smoke.score,
        weather: assessment.hazards.weather.score,
      },
      scenario: !!scenario,
    });
  }, [assessment, location, scenario, record]);

  useEffect(() => {
    if (!notifications || typeof Notification === 'undefined' || Notification.permission !== 'granted')
      return;
    const fresh = alerts
      .filter((a) => (a.level === 'critical' || a.level === 'warning') && !notified.current.has(a.id))
      .slice(0, 2);
    if (!fresh.length) return;
    navigator.serviceWorker?.getRegistration().then((reg) => {
      for (const a of fresh) {
        notified.current.add(a.id);
        const opts = {
          body: `${a.description.slice(0, 140)}\n${t('Sumber', 'Source')}: ${a.source}`,
          icon: '/icons/icon-192.png',
          badge: '/icons/icon-192.png',
          tag: a.id,
        };
        if (reg) reg.showNotification(a.title, opts);
        else new Notification(a.title, opts);
      }
      sessionStorage.setItem('siaga.notified', JSON.stringify([...notified.current]));
    });
  }, [alerts, notifications]);

  return null;
}
