import { describe, expect, it } from 'vitest';
import { prettifyBmkgRegion } from '@/lib/bmkg-region';
import { findOutdoorWindows } from '@/features/risk/engine/timing';
import type { HourlyOutdoorPoint } from '@/features/risk/engine/types';

describe('prettifyBmkgRegion', () => {
  it('splits compressed BMKG region names and compass words', () => {
    expect(prettifyBmkgRegion('43 km BaratLaut MALUKUBRTDAYA')).toBe('43 km Barat Laut Maluku Barat Daya');
    expect(prettifyBmkgRegion('130 km BaratDaya MALUKUTENGGARA')).toBe('130 km Barat Daya Maluku Tenggara');
  });
  it('falls back to title case for unknown words', () => {
    expect(prettifyBmkgRegion('12 km Tenggara XYZABC')).toBe('12 km Tenggara Xyzabc');
  });
  it('keeps already readable text intact', () => {
    expect(prettifyBmkgRegion('Pusat gempa berada di laut 79 km Barat Daya Kab. Garut')).toBe(
      'Pusat gempa berada di laut 79 km Barat Daya Kab. Garut',
    );
  });
});

describe('findOutdoorWindows', () => {
  it('merges back-to-back windows into one span', () => {
    // 05:00–21:00 WIB on a calm day, all hours identical → the two best windows touch.
    const base = Date.parse('2026-11-23T05:00:00+07:00');
    const points: HourlyOutdoorPoint[] = Array.from({ length: 17 }, (_, i) => ({
      time: new Date(base + i * 3_600_000).toISOString(),
      index: i < 6 ? 5 : 60,
      rain: 0,
      heat: 0,
      air: 0,
      storm: 0,
    }));
    const windows = findOutdoorWindows(points);
    expect(windows).toHaveLength(1);
    expect(Date.parse(windows[0].start)).toBe(base);
    expect(Date.parse(windows[0].end)).toBe(base + 6 * 3_600_000);
  });
  it('never returns overlapping windows when hour strings use a different format', () => {
    const base = Date.parse('2026-11-23T05:00:00+07:00');
    const points: HourlyOutdoorPoint[] = Array.from({ length: 17 }, (_, i) => ({
      // Open-Meteo style local timestamps with offset (not toISOString format).
      time:
        new Date(base + i * 3_600_000 + 7 * 3_600_000).toISOString().replace('Z', '').slice(0, 16) + '+07:00',
      index: i % 5 === 0 ? 50 : 10,
      rain: 0,
      heat: 0,
      air: 0,
      storm: 0,
    }));
    const w = findOutdoorWindows(points);
    for (let i = 1; i < w.length; i++)
      expect(Date.parse(w[i].start)).toBeGreaterThan(Date.parse(w[i - 1].end));
  });
});
