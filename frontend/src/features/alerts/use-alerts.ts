import { useMemo } from 'react';
import { warningsForProvince } from '@/features/risk/engine/signals';
import type { HazardType } from '@/features/risk/engine/types';
import { useRiskAssessment } from '@/hooks/use-siaga-data';
import { haversineKm } from '@/lib/geo';
import { HAZARDS, RISK_LEVELS } from '@/lib/risk-levels';
import { formatDistance } from '@/lib/format';
import { t } from '@/lib/i18n';
import { useAlertReadStore } from '@/stores';
import type { AlertLevel, SiagaAlert } from '@/types/domain';
import { quakeLevel } from './quake-level';

export const ALERT_LEVELS: Record<
  AlertLevel,
  { readonly label: string; rank: number; color: string; soft: string; text: string }
> = {
  critical: {
    get label() {
      return t('Kritis', 'Critical');
    },
    rank: 0,
    color: '#A51E22',
    soft: 'var(--risk-critical-soft)',
    text: 'var(--risk-critical-text)',
  },
  warning: {
    get label() {
      return t('Peringatan', 'Warning');
    },
    rank: 1,
    color: '#E66B24',
    soft: 'var(--risk-high-soft)',
    text: 'var(--risk-high-text)',
  },
  advisory: {
    get label() {
      return t('Waspada', 'Advisory');
    },
    rank: 2,
    color: '#D99A22',
    soft: 'var(--risk-moderate-soft)',
    text: 'var(--risk-moderate-text)',
  },
  info: {
    get label() {
      return t('Informasi', 'Info');
    },
    rank: 3,
    color: '#3478C6',
    soft: 'var(--risk-low-soft)',
    text: 'var(--risk-low-text)',
  },
};

/** BMKG publishes quake bulletins in Indonesian; translate the standard phrases for English mode. */
export function localizeQuakeText(s: string): string {
  return t(
    s,
    s
      .replace(/tidak berpotensi tsunami/gi, 'No tsunami potential')
      .replace(/berpotensi tsunami/gi, 'Potential tsunami')
      .replace(
        /Gempa ini dirasakan untuk diteruskan pada masyarakat/gi,
        'This earthquake was felt; information relayed to the public',
      )
      .replace(/Gempa ini dirasakan/gi, 'This earthquake was felt')
      .replace(
        /(\d+)\s*km\s+(BaratLaut|TimurLaut|BaratDaya|Tenggara|Barat|Timur|Utara|Selatan)/g,
        (_, km: string, dir: string) => {
          const D: Record<string, string> = {
            BaratLaut: 'NW',
            TimurLaut: 'NE',
            BaratDaya: 'SW',
            Tenggara: 'SE',
            Barat: 'W',
            Timur: 'E',
            Utara: 'N',
            Selatan: 'S',
          };
          return `${km} km ${D[dir] ?? dir}`;
        },
      ),
  );
}

/**
 * Identity used for "read" receipts. The level is part of it, so an alert that escalates
 * (e.g. advisory → warning) shows up as unread again.
 */
export const alertReadKey = (a: Pick<SiagaAlert, 'id' | 'level'>) => `${a.id}|${a.level}`;

const emptyCounts = (): Record<AlertLevel, number> => ({ critical: 0, warning: 0, advisory: 0, info: 0 });

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
            ? t('Hujan lebat & petir', 'Heavy rain & lightning')
            : w.hazard === 'wind'
              ? t('Angin kencang', 'Strong winds')
              : t('Cuaca ekstrem', 'Extreme weather'),
        title: w.title,
        description: w.description,
        location: w.province ?? 'Indonesia',
        time: w.publishedAt,
        source:
          warnings.data?.provenance.mode === 'scenario'
            ? t('SIMULASI (bukan BMKG)', 'SIMULATION (not BMKG)')
            : t('BMKG — Peringatan Dini Cuaca', 'BMKG — Weather Early Warning'),
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
        level: quakeLevel(q, d),
        category: t('Gempabumi', 'Earthquake'),
        title: t(
          `Gempa M${q.magnitude.toFixed(1)} — ${q.region}`,
          `M${q.magnitude.toFixed(1)} earthquake — ${localizeQuakeText(q.region)}`,
        ),
        description: t(
          `Kedalaman ${q.depthKm} km. ${q.potential}${q.felt ? ` Dirasakan: ${q.felt}.` : ''} Sekitar ${formatDistance(d)} dari lokasi Anda.`,
          `Depth ${q.depthKm} km. ${localizeQuakeText(q.potential)}${q.felt ? ` Felt: ${q.felt}.` : ''} About ${formatDistance(d)} from your location.`,
        ),
        location: localizeQuakeText(q.region),
        time: q.time,
        source: t('BMKG — Informasi Gempabumi', 'BMKG — Earthquake Information'),
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
          title: t(
            `${HAZARDS[k].label} ${RISK_LEVELS[h.level].label.toLowerCase()} di ${location.name}`,
            `${RISK_LEVELS[h.level].label} ${HAZARDS[k].label.toLowerCase()} risk in ${location.name}`,
          ),
          description: t(
            `${h.headline} Skor indikatif ${h.score}/100 dari Siaga Risk Engine — bukan peringatan resmi.`,
            `${h.headline} Indicative score ${h.score}/100 from the Siaga Risk Engine — not an official warning.`,
          ),
          location: location.name,
          time: assessment.computedAt,
          source:
            dataMode === 'scenario'
              ? t('SiagaAI · Simulasi', 'SiagaAI · Simulation')
              : t('SiagaAI · Indikatif', 'SiagaAI · Indicative'),
          updatedAt: assessment.computedAt,
          origin: 'siaga',
        });
      }
    }
    return out.sort(
      (a, b) => ALERT_LEVELS[a.level].rank - ALERT_LEVELS[b.level].rank || b.time.localeCompare(a.time),
    );
  }, [warnings.data, earthquakes.data, assessment, location, dataMode]);

  const read = useAlertReadStore((s) => s.read);
  const { counts, unreadCounts } = useMemo(() => {
    const counts = emptyCounts();
    const unreadCounts = emptyCounts();
    for (const a of alerts) {
      counts[a.level] += 1;
      if (!read[alertReadKey(a)]) unreadCounts[a.level] += 1;
    }
    return { counts, unreadCounts };
  }, [alerts, read]);
  const isRead = (a: SiagaAlert) => !!read[alertReadKey(a)];
  const unreadTotal = Object.values(unreadCounts).reduce((n, c) => n + c, 0);
  /** Count shown on the bell / sidebar badge: unread critical + warning alerts. */
  const unreadUrgent = unreadCounts.critical + unreadCounts.warning;

  return { alerts, counts, unreadCounts, unreadTotal, unreadUrgent, isRead, view };
}
