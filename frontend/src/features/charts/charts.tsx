/**
 * Chart primitives (Recharts). Rules applied: one y-axis per chart (rain and
 * temperature are small multiples, never dual-axis), thin marks, rounded bar
 * ends, recessive grid, hover tooltip on every chart, single-series → no legend.
 */
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { HourlyOutdoorPoint } from '@/features/risk/engine/types';
import { formatDate, formatHour, formatWeekday } from '@/lib/format';
import { RISK_LEVELS, levelFromScore } from '@/lib/risk-levels';
import type { HourlyWeather } from '@/types/domain';
import { t } from '@/lib/i18n';

// Theme-aware: CSS variables resolve to the light or dark palette automatically.
const AXIS = { fontSize: 11, fill: 'var(--color-muted)' };
const GRID = 'var(--color-line)';
const CURSOR = 'var(--color-ink)';

function TipBox({
  title,
  rows,
}: {
  title: string;
  rows: { label: string; value: string; color?: string }[];
}) {
  return (
    <div className="rounded-xl border border-line bg-surface px-3 py-2 text-[12px] shadow-float">
      <div className="mb-1 font-semibold text-ink">{title}</div>
      {rows.map((r) => (
        <div key={r.label} className="flex items-center gap-2 text-neutral-700">
          {r.color && <span className="size-2 rounded-full" style={{ background: r.color }} />}
          <span className="text-muted">{r.label}</span>
          <span className="ml-auto pl-3 font-semibold tabular">{r.value}</span>
        </div>
      ))}
    </div>
  );
}

// Recharts tooltip payload rows are untyped user data.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Tp = { active?: boolean; payload?: ReadonlyArray<{ payload?: any }> };

export function HourlyWeatherCharts({ hourly, height = 92 }: { hourly: HourlyWeather[]; height?: number }) {
  const now = Date.now() - 3_600_000;
  const data = hourly
    .filter((h) => new Date(h.time).getTime() >= now)
    .slice(0, 24)
    .map((h) => ({
      t: h.time,
      label: formatHour(h.time),
      temp: h.temperature ?? null,
      rain: h.precipitation ?? 0,
      prob: h.precipitationProbability ?? 0,
    }));
  const tick = (i: number) => (i % 4 === 0 ? data[i]?.label : '');
  const tip = ({ active, payload }: Tp) =>
    active && payload?.length ? (
      <TipBox
        title={`${payload[0].payload.label} WIB`}
        rows={[
          { label: t('Suhu', 'Temp.'), value: `${Math.round(Number(payload[0].payload.temp))}°C`, color: '#E66B24' },
          { label: t('Hujan', 'Rain'), value: `${Number(payload[0].payload.rain).toFixed(1)} mm`, color: '#3478C6' },
          { label: t('Peluang', 'Chance'), value: `${payload[0].payload.prob}%` },
        ]}
      />
    ) : null;

  return (
    <div className="space-y-1" role="img" aria-label={t('Grafik suhu dan curah hujan 24 jam ke depan', 'Temperature and rainfall chart for the next 24 hours')}>
      <div className="flex items-baseline justify-between text-[11px] font-semibold text-muted">
        <span>{t('Suhu (°C)', 'Temperature (°C)')}</span>
      </div>
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={data} margin={{ top: 6, right: 6, left: -22, bottom: 0 }} syncId="wx">
          <defs>
            <linearGradient id="tempFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#E66B24" stopOpacity={0.22} />
              <stop offset="1" stopColor="#E66B24" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke={GRID} />
          <XAxis dataKey="label" tick={false} axisLine={false} tickLine={false} height={4} />
          <YAxis
            tick={AXIS}
            axisLine={false}
            tickLine={false}
            domain={['dataMin - 1', 'dataMax + 1']}
            tickCount={3}
            allowDecimals={false}
          />
          <Tooltip content={tip} cursor={{ stroke: CURSOR, strokeOpacity: 0.15 }} />
          <Area
            type="monotone"
            dataKey="temp"
            stroke="#E66B24"
            strokeWidth={2}
            fill="url(#tempFill)"
            dot={false}
            activeDot={{ r: 4, stroke: 'var(--color-surface)', strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
      <div className="flex items-baseline justify-between pt-1 text-[11px] font-semibold text-muted">
        <span>{t('Curah hujan (mm/jam)', 'Rainfall (mm/h)')}</span>
      </div>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart
          data={data}
          margin={{ top: 6, right: 6, left: -22, bottom: 0 }}
          syncId="wx"
          barCategoryGap={2}
        >
          <CartesianGrid vertical={false} stroke={GRID} />
          <XAxis
            dataKey="label"
            tick={AXIS}
            axisLine={false}
            tickLine={false}
            interval={0}
            tickFormatter={(_, i) => tick(i) ?? ''}
          />
          <YAxis
            tick={AXIS}
            axisLine={false}
            tickLine={false}
            allowDecimals={false}
            tickCount={3}
            domain={[0, (max: number) => Math.max(2, Math.ceil(max))]}
          />
          <Tooltip content={tip} cursor={{ fill: CURSOR, fillOpacity: 0.06 }} />
          <Bar dataKey="rain" fill="#3478C6" radius={[4, 4, 0, 0]} maxBarSize={14} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function OutdoorIndexChart({
  points,
  height = 120,
}: {
  points: HourlyOutdoorPoint[];
  height?: number;
}) {
  const data = points.map((p) => ({
    ...p,
    label: formatHour(p.time),
    color: RISK_LEVELS[levelFromScore(p.index)].color,
  }));
  return (
    <div role="img" aria-label={t('Indeks risiko aktivitas luar ruang per jam', 'Hourly outdoor activity risk index')}>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} margin={{ top: 6, right: 4, left: -24, bottom: 0 }} barCategoryGap={2}>
          <CartesianGrid vertical={false} stroke={GRID} />
          <XAxis dataKey="label" tick={AXIS} axisLine={false} tickLine={false} interval={3} />
          <YAxis tick={AXIS} axisLine={false} tickLine={false} domain={[0, 100]} ticks={[0, 50, 100]} />
          <ReferenceLine y={40} stroke="#D99A22" strokeDasharray="3 3" strokeOpacity={0.6} />
          <Tooltip
            cursor={{ fill: CURSOR, fillOpacity: 0.06 }}
            content={({ active, payload }: Tp) =>
              active && payload?.length ? (
                <TipBox
                  title={`${payload[0].payload.label} WIB · ${t('indeks', 'index')} ${payload[0].payload.index}`}
                  rows={[
                    { label: t('Hujan', 'Rain'), value: String(payload[0].payload.rain) },
                    { label: t('Petir', 'Lightning'), value: String(payload[0].payload.storm) },
                    { label: t('Panas', 'Heat'), value: String(payload[0].payload.heat) },
                    { label: t('Udara', 'Air'), value: String(payload[0].payload.air) },
                  ]}
                />
              ) : null
            }
          />
          <Bar
            dataKey="index"
            radius={[4, 4, 0, 0]}
            maxBarSize={16}
            shape={(p: unknown) => {
              const b = p as {
                x: number;
                y: number;
                width: number;
                height: number;
                payload: { color: string };
              };
              const r = Math.min(4, b.width / 2, b.height);
              return (
                <path
                  d={`M${b.x},${b.y + b.height} V${b.y + r} Q${b.x},${b.y} ${b.x + r},${b.y} H${b.x + b.width - r} Q${b.x + b.width},${b.y} ${b.x + b.width},${b.y + r} V${b.y + b.height} Z`}
                  fill={b.payload.color}
                />
              );
            }}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function DailyCountChart({
  daily,
  height = 110,
  color = '#E66B24',
  unit = t('titik', 'points'),
}: {
  daily: { date: string; count: number }[];
  height?: number;
  color?: string;
  unit?: string;
}) {
  const data = daily.map((d) => ({ ...d, label: formatWeekday(`${d.date}T12:00:00Z`) }));
  return (
    <div role="img" aria-label={t(`Jumlah ${unit} per hari, 7 hari terakhir`, `Number of ${unit} per day, last 7 days`)}>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} margin={{ top: 8, right: 4, left: -24, bottom: 0 }} barCategoryGap={6}>
          <CartesianGrid vertical={false} stroke={GRID} />
          <XAxis dataKey="label" tick={AXIS} axisLine={false} tickLine={false} />
          <YAxis tick={AXIS} axisLine={false} tickLine={false} allowDecimals={false} tickCount={3} />
          <Tooltip
            cursor={{ fill: CURSOR, fillOpacity: 0.06 }}
            content={({ active, payload }: Tp) =>
              active && payload?.length ? (
                <TipBox
                  title={formatDate(`${payload[0].payload.date}T12:00:00Z`)}
                  rows={[{ label: t('Deteksi', 'Detections'), value: `${payload[0].payload.count} ${unit}`, color }]}
                />
              ) : null
            }
          />
          <Bar dataKey="count" fill={color} radius={[4, 4, 0, 0]} maxBarSize={28} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function DischargeChart({
  series,
  height = 120,
}: {
  series: { date: string; discharge: number | null; forecast: boolean }[];
  height?: number;
}) {
  const data = series.map((s) => ({
    ...s,
    label: formatDate(`${s.date}T12:00:00Z`),
    past: s.forecast ? null : s.discharge,
    future: s.forecast ? s.discharge : null,
  }));
  const firstFuture = data.findIndex((d) => d.forecast);
  if (firstFuture > 0) data[firstFuture - 1].future = data[firstFuture - 1].past;
  return (
    <div role="img" aria-label={t('Debit sungai 30 hari terakhir dan prakiraan 7 hari', 'River discharge over the last 30 days and 7-day forecast')}>
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data} margin={{ top: 6, right: 6, left: -16, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke={GRID} />
          <XAxis dataKey="label" tick={AXIS} axisLine={false} tickLine={false} interval={8} />
          <YAxis tick={AXIS} axisLine={false} tickLine={false} tickCount={3} />
          <Tooltip
            content={({ active, payload }: Tp) =>
              active && payload?.length ? (
                <TipBox
                  title={String(payload[0].payload.label)}
                  rows={[
                    {
                      label: payload[0].payload.forecast ? t('Prakiraan', 'Forecast') : t('Teramati', 'Observed'),
                      value: `${Math.round(Number(payload[0].payload.discharge))} m³/s`,
                      color: '#0891B2',
                    },
                  ]}
                />
              ) : null
            }
          />
          <Line type="monotone" dataKey="past" stroke="#0891B2" strokeWidth={2} dot={false} connectNulls />
          <Line
            type="monotone"
            dataKey="future"
            stroke="#0891B2"
            strokeWidth={2}
            strokeDasharray="4 3"
            dot={false}
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ScoreHistoryChart({
  points,
  height = 160,
}: {
  points: { time: string; score: number }[];
  height?: number;
}) {
  const data = points.map((p) => ({ ...p, label: `${formatDate(p.time)} ${formatHour(p.time)}` }));
  return (
    <div role="img" aria-label={t('Riwayat Siaga Score', 'Siaga Score history')}>
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data} margin={{ top: 8, right: 8, left: -22, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke={GRID} />
          <XAxis dataKey="label" tick={AXIS} axisLine={false} tickLine={false} minTickGap={40} />
          <YAxis
            tick={AXIS}
            axisLine={false}
            tickLine={false}
            domain={[0, 100]}
            ticks={[0, 20, 40, 60, 80, 100]}
          />
          <Tooltip
            content={({ active, payload }: Tp) =>
              active && payload?.length ? (
                <TipBox
                  title={String(payload[0].payload.label)}
                  rows={[
                    {
                      label: t('Skor personal', 'Personal score'),
                      value: `${payload[0].payload.score} · ${RISK_LEVELS[levelFromScore(Number(payload[0].payload.score))].label}`,
                    },
                  ]}
                />
              ) : null
            }
          />
          <Line
            type="monotone"
            dataKey="score"
            stroke="var(--color-ink)"
            strokeWidth={2}
            dot={{ r: 3, fill: 'var(--color-surface)', strokeWidth: 2 }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
