import { useMemo } from 'react';
import { warningsForProvince } from '@/features/risk/engine/signals';
import type { HazardType } from '@/features/risk/engine/types';
import { useRiskAssessment } from '@/hooks/use-siaga-data';
import { haversineKm } from '@/lib/geo';
import { HAZARDS, RISK_LEVELS } from '@/lib/risk-levels';
import { formatDistance } from '@/lib/format';
import type { AlertLevel, Earthquake, SiagaAlert } from '@/types/domain';

export const ALERT_LEVELS: Record<
  AlertLevel,
  { label: string; rank: number; color: string; soft: string; text: string }
> = {
  critical: { label: 'Kritis', rank: 0, color: '#A51E22', soft: '#FBEDED', text: '#7A1418' },
  warning: { label: 'Peringatan', rank: 1, color: '#E66B24', soft: '#FDF0E8', text: '#A4461A' },
  advisory: { label: 'Waspada', rank: 2, color: '#D99A22', soft: '#FDF6E8', text: '#8A5A0B' },
  info: { label: 'Informasi', rank: 3, color: '#3478C6', soft: '#EEF4FB', text: '#22579A' },
};

export function quakeLevel(q: Earthquake): AlertLevel {
  const tsunami = /berpotensi tsunami/i.test(q.potential) && !/tidak berpotensi/i.test(q.potential);
  if (tsunami || q.magnitude >= 7) return 'critical';
  if (q.magnitude >= 6) return 'warning';
  if (q.magnitude >= 5) return 'advisory';
  return 'info';
}

/** Unified Alert Center feed: official (BMKG) + SiagaAI indicative advisories. */
export function useAlerts() {
  const view = useRiskAssessment();
  const { location, warnings, earthquakes, assessment, dataMode } = view;

  const alerts = useMemo<SiagaAlert[]>(() => {
    const out: SiagaAlert[] = [];
    const list = warnings.data?.warnings ?? [];
    const local = new Set(warningsForProvince(list, location.region).map((w) => w.id));
    for (const w of list) {
      out.push({
        id: `bmkg-${w.id}`,
        level: local.has(w.id) ? 'warning' : 'advisory',
        category:
          w.hazard === 'storm'
            ? 'Hujan lebat & petir'
            : w.hazard === 'wind'
              ? 'Angin kencang'
              : 'Cuaca ekstrem',
        title: w.title,
        description: w.description,
        location: w.province ?? 'Indonesia',
        time: w.publishedAt,
        source:
          warnings.data?.provenance.mode === 'scenario'
            ? 'SIMULASI (bukan BMKG)'
            : 'BMKG — Peringatan Dini Cuaca',
        sourceUrl: w.link,
        updatedAt: warnings.data?.provenance.fetchedAt ?? w.publishedAt,
        origin: 'official',
      });
    }

    const quakes = [...(earthquakes.data?.significant ?? [])];
    const latest = earthquakes.data?.latest;
    if (latest && !quakes.some((q) => q.id === latest.id)) quakes.unshift(latest);
    for (const q of quakes.slice(0, 15)) {
      const d = haversineKm(location, q);
      out.push({
        id: `eq-${q.id}`,
        level: d > 600 && quakeLevel(q) !== 'critical' ? 'info' : quakeLevel(q),
        category: 'Gempabumi',
        title: `Gempa M${q.magnitude.toFixed(1)} — ${q.region}`,
        description: `Kedalaman ${q.depthKm} km. ${q.potential}${q.felt ? ` Dirasakan: ${q.felt}.` : ''} Sekitar ${formatDistance(d)} dari lokasi Anda.`,
        location: q.region,
        time: q.time,
        source: 'BMKG — Informasi Gempabumi',
        sourceUrl: 'https://www.bmkg.go.id/gempabumi/gempabumi-dirasakan',
        updatedAt: earthquakes.data?.provenance.fetchedAt ?? q.time,
        origin: 'official',
        point: { lat: q.lat, lon: q.lon },
      });
    }

    if (assessment) {
      for (const k of ['flood', 'fire', 'smoke', 'weather'] as HazardType[]) {
        const h = assessment.hazards[k];
        if (!h.available || h.score <= 40) continue;
        out.push({
          id: `siaga-${k}-${location.id}`,
          level: h.level === 'critical' ? 'critical' : h.level === 'high' ? 'warning' : 'advisory',
          category: HAZARDS[k].longLabel,
          title: `${HAZARDS[k].label} ${RISK_LEVELS[h.level].label.toLowerCase()} di ${location.name}`,
          description: `${h.headline} Skor indikatif ${h.score}/100 dari Siaga Risk Engine — bukan peringatan resmi.`,
          location: location.name,
          time: assessment.computedAt,
          source: dataMode === 'scenario' ? 'SiagaAI · Simulasi' : 'SiagaAI · Indikatif',
          updatedAt: assessment.computedAt,
          origin: 'siaga',
        });
      }
    }
    return out.sort(
      (a, b) => ALERT_LEVELS[a.level].rank - ALERT_LEVELS[b.level].rank || b.time.localeCompare(a.time),
    );
  }, [warnings.data, earthquakes.data, assessment, location, dataMode]);

  const counts = useMemo(
    () =>
      alerts.reduce((c, a) => ({ ...c, [a.level]: c[a.level] + 1 }), {
        critical: 0,
        warning: 0,
        advisory: 0,
        info: 0,
      } as Record<AlertLevel, number>),
    [alerts],
  );

  return { alerts, counts, view };
}
