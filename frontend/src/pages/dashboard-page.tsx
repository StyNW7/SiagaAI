import {
  ArrowRight,
  ArrowUpRight,
  Bookmark,
  ClipboardCheck,
  Droplets,
  MapPin,
  Megaphone,
  RefreshCw,
  Sparkles,
  Thermometer,
  TrendingDown,
  TrendingUp,
  Users,
  Wind,
} from 'lucide-react';
import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router';
import { toast } from 'sonner';
import { ARA_LINES, Ara, AraSays, poseForLevel } from '@/components/common/ara';
import { NusantaraBackdrop } from '@/components/common/brand';
import { ErrorState, FreshnessBadge } from '@/components/common/data-state';
import {
  AiPanel,
  AiThinking,
  Disclaimer,
  PageHeader,
  SectionTitle,
  TextLink,
  WeatherIcon,
} from '@/components/common/layout-bits';
import { HAZARD_ICONS, RiskSpectrum } from '@/components/common/risk';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/overlays';
import { Card, CardContent, CardHeader, CardTitle, Skeleton } from '@/components/ui/primitives';
import { CITY_BY_SLUG, EXPLORE_PRESETS } from '@/data/cities';
import { SCENARIOS } from '@/data/scenarios';
import { ALERT_LEVELS, useAlerts } from '@/features/alerts/use-alerts';
import { HourlyWeatherCharts } from '@/features/charts/charts';
import { Chip, LocationPicker } from '@/features/location/location-picker';
import { SiagaMap } from '@/features/map/siaga-map';
import { AnalysisSequence, HazardRow, SourcesPanel } from '@/features/risk/components';
import { describeWindow } from '@/features/risk/engine/timing';
import { useAiContext, useAiQuery } from '@/hooks/use-ai';
import { useCountUp, useDocumentTitle } from '@/hooks/use-misc';
import { compass, formatDistance, formatLongDate, formatTime, timeAgo } from '@/lib/format';
import { HAZARD_ORDER, HAZARDS, RISK_LEVELS } from '@/lib/risk-levels';
import { cn } from '@/lib/utils';
import { useHistoryStore, useLocationStore, useSettings } from '@/stores';

const analyzed = new Set<string>(JSON.parse(sessionStorage.getItem('siaga.analyzed') ?? '[]'));

export default function DashboardPage() {
  useDocumentTitle('Dashboard');
  const { alerts, view } = useAlerts();
  const {
    location,
    assessment,
    weather,
    hotspots,
    airQuality,
    nearby,
    windows,
    sources,
    scenario,
    dataMode,
  } = view;
  const [mode, setMode] = useState<'personal' | 'location'>('personal');
  const [picker, setPicker] = useState(false);
  const [showSequence, setShowSequence] = useState(() => !analyzed.has(location.id));
  const saveLocation = useLocationStore((s) => s.saveLocation);
  const setCurrent = useLocationStore((s) => s.setCurrent);
  const setScenario = useSettings((s) => s.setScenario);
  const snapshots = useHistoryStore((s) => s.snapshots);
  const navigate = useNavigate();

  const context = useAiContext(view);
  const brief = useAiQuery('brief', context);

  const finishSequence = useCallback(() => {
    analyzed.add(location.id);
    sessionStorage.setItem('siaga.analyzed', JSON.stringify([...analyzed]));
    setShowSequence(false);
  }, [location.id]);

  const sequenceVisible = showSequence || (!analyzed.has(location.id) && !assessment);

  const score = assessment ? (mode === 'personal' ? assessment.personal : assessment.location) : null;
  const level = score ? RISK_LEVELS[score.level] : null;
  const w = weather.data?.current;
  const topAlerts = alerts.filter((a) => a.origin === 'official').slice(0, 4);

  // Trend vs. the most recent earlier-hour snapshot for this place.
  const trend = useMemo(() => {
    if (!score) return null;
    const hour = new Date().toISOString().slice(0, 13);
    const prev = snapshots.find(
      (s) => s.locationName === location.name && !!s.scenario === !!scenario && s.time.slice(0, 13) !== hour,
    );
    if (!prev) return null;
    const before = mode === 'personal' ? prev.personalScore : prev.score;
    return { delta: score.score - before, since: prev.time };
  }, [score, snapshots, location.name, scenario, mode]);

  return (
    <div>
      <PageHeader
        eyebrow={
          <>
            <span>{formatLongDate(new Date())}</span>
            <span aria-hidden className="text-line-strong">
              /
            </span>
            <FreshnessBadge provenance={weather.data?.provenance} showSource />
          </>
        }
        title="Seberapa aman lokasi Anda hari ini?"
        actions={
          <>
            {location.source === 'gps' && (
              <Button
                variant="secondary"
                onClick={() => {
                  saveLocation(location);
                  toast.success('Lokasi disimpan', {
                    description: 'Koordinat disimpan di perangkat Anda atas izin Anda.',
                  });
                }}
              >
                <Bookmark /> Simpan
              </Button>
            )}
            <Button variant="secondary" onClick={() => setPicker(true)}>
              <MapPin /> Ubah lokasi
            </Button>
          </>
        }
      />

      {location.source === 'default' && !scenario && (
        <AraSays
          pose="map"
          size={84}
          tone="brand"
          className="mb-6"
          title={`Ini lokasi bawaan: ${location.name}`}
          action={
            <Button size="sm" onClick={() => setPicker(true)}>
              <MapPin /> Pilih lokasi saya
            </Button>
          }
        >
          Pilih lokasimu agar analisis risikonya personal.
        </AraSays>
      )}

      {sequenceVisible ? (
        <AnalysisSequence
          sources={sources}
          ready={!!assessment}
          locationName={location.name}
          onDone={finishSequence}
        />
      ) : (
        <div className="space-y-5 lg:space-y-6">
          {/* ROW 1 — Score (8) · Brief (4) */}
          <div className="grid gap-5 lg:grid-cols-12 lg:gap-6">
            <section
              className="relative min-w-0 overflow-hidden rounded-[18px] border border-line bg-white shadow-soft lg:col-span-8"
              aria-label="Siaga Score"
            >
              <NusantaraBackdrop batik={false} />
              {score && level ? (
                <div className="relative grid gap-6 p-6 sm:p-8 md:grid-cols-[1fr_auto]">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="data-label">Indicative Siaga Score</p>
                      <Tabs value={mode} onValueChange={(v) => setMode(v as typeof mode)}>
                        <TabsList>
                          <TabsTrigger value="personal">Personal</TabsTrigger>
                          <TabsTrigger value="location">Lokasi</TabsTrigger>
                        </TabsList>
                      </Tabs>
                    </div>

                    <div className="mt-5 flex flex-wrap items-end gap-x-6 gap-y-3">
                      <ScoreNumber value={score.score} />
                      <div className="pb-2">
                        <p
                          className="text-[26px] font-extrabold uppercase leading-none tracking-[-0.01em]"
                          style={{ color: level.color }}
                        >
                          {level.label}
                        </p>
                        {trend && trend.delta !== 0 ? (
                          <p
                            className={cn(
                              'mt-2 flex items-center gap-1 font-mono text-[11px] font-medium uppercase tracking-[0.04em]',
                              trend.delta > 0 ? 'text-risk-high' : 'text-risk-safe',
                            )}
                          >
                            {trend.delta > 0 ? (
                              <TrendingUp className="size-3.5" />
                            ) : (
                              <TrendingDown className="size-3.5" />
                            )}
                            {trend.delta > 0 ? '+' : ''}
                            {trend.delta} sejak {formatTime(trend.since)}
                          </p>
                        ) : (
                          <p className="telemetry mt-2">
                            {mode === 'personal' ? 'Disesuaikan profil Anda' : 'Bahaya lingkungan'}
                          </p>
                        )}
                      </div>
                    </div>

                    <RiskSpectrum score={score.score} className="mt-6 max-w-xl" />

                    <dl className="mt-7 grid grid-cols-2 gap-x-6 gap-y-4 border-t border-line pt-5 2xl:grid-cols-3">
                      <Meta label="Bahaya utama">
                        {(() => {
                          const Icon = HAZARD_ICONS[score.primaryHazard];
                          return <Icon className="size-4 text-brand" aria-hidden />;
                        })()}
                        {HAZARDS[score.primaryHazard].label}
                      </Meta>
                      <Meta label="Lokasi">
                        <span className="truncate">{location.name}</span>
                      </Meta>
                      <Meta label="Cuaca kini" className="col-span-2 2xl:col-span-1">
                        {w ? (
                          <>
                            <WeatherIcon code={w.weatherCode} className="size-4 text-muted" />
                            {w.temperature != null ? `${Math.round(w.temperature)}°C` : ''} · {w.description}
                          </>
                        ) : (
                          '–'
                        )}
                      </Meta>
                    </dl>

                    <div className="mt-7 flex flex-col gap-2.5 sm:flex-row">
                      <Button asChild>
                        <Link to="/app/action-plan">
                          <ClipboardCheck /> Buat Rencana Aksi
                        </Link>
                      </Button>
                      <Button asChild variant="secondary">
                        <Link to="/app/risk">
                          <Sparkles className="text-ai" /> Apa artinya bagi saya?
                        </Link>
                      </Button>
                    </div>
                  </div>

                  {/* Ara reacts to the current level */}
                  <div className="hidden w-[180px] flex-col items-center justify-end md:flex">
                    <div className="relative mb-3 rounded-2xl rounded-br-md border border-line bg-raised px-4 py-3 text-[13px] font-medium leading-snug text-neutral-700">
                      {ARA_LINES[score.level]}
                    </div>
                    <Ara pose={poseForLevel(score.level)} size={180} className="self-end" />
                  </div>
                </div>
              ) : (
                <div className="space-y-4 p-8">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-20 w-48" />
                  <Skeleton className="h-2 w-full max-w-xl" />
                  <Skeleton className="h-12 w-full max-w-xl" />
                </div>
              )}
            </section>

            <AiPanel
              title="SiagaAI Brief"
              className="min-w-0 lg:col-span-4"
              provider={brief.data?.provider}
              fallbackReason={brief.data?.fallback ? brief.data.fallbackReason : undefined}
              generatedAt={brief.data?.generatedAt}
              actions={
                brief.data && (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => brief.refetch()}
                    aria-label="Perbarui brief"
                  >
                    <RefreshCw className={brief.isFetching ? 'animate-spin' : ''} />
                  </Button>
                )
              }
            >
              <p className="telemetry -mt-1 mb-3">Dari {sources.length} sumber sinyal</p>
              {brief.data ? (
                <div className="animate-fade-up">
                  <p className="text-balance text-[18px] font-bold leading-snug tracking-[-0.02em] text-ink">
                    {brief.data.output.headline}
                  </p>
                  <ul className="mt-4 space-y-2.5">
                    {brief.data.output.keyPoints.slice(0, 3).map((k) => (
                      <li key={k} className="flex gap-2.5 text-[13.5px] leading-relaxed text-neutral-700">
                        <span className="mt-[9px] size-1.5 shrink-0 rounded-full bg-ai/60" aria-hidden />
                        {k}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-5 rounded-xl bg-ai-soft/60 p-3.5">
                    <p className="data-label !text-ai-deep">Langkah berikutnya</p>
                    <p className="mt-1 text-[13.5px] font-semibold leading-snug text-ink">
                      {brief.data.output.nextAction}
                    </p>
                  </div>
                </div>
              ) : brief.isError ? (
                <ErrorState title="SiagaAI tidak dapat menyusun brief" onRetry={() => brief.refetch()} />
              ) : (
                <AiThinking />
              )}
            </AiPanel>
          </div>

          {/* ROW 2 — Map (7) · Hazard summary (5) */}
          <div className="grid gap-5 lg:grid-cols-12 lg:gap-6">
            <Card className="flex min-w-0 flex-col overflow-hidden lg:col-span-7">
              <CardHeader>
                <div className="min-w-0">
                  <CardTitle>Peta sekitar</CardTitle>
                  <p className="mt-1 truncate text-[12.5px] text-muted">
                    {hotspots.data
                      ? nearby && nearby.length
                        ? `${nearby.length} titik panas ≤150 km · terdekat ${formatDistance(nearby[0].distanceKm)}`
                        : 'Tidak ada titik panas ≤150 km (72 jam)'
                      : 'Memuat titik panas…'}
                  </p>
                </div>
                <FreshnessBadge provenance={hotspots.data?.provenance} kind="hotspots" />
              </CardHeader>
              <SiagaMap
                key={location.id}
                compact
                className="min-h-[320px] flex-1"
                hotspots={hotspots.data?.hotspots ?? []}
                user={location}
                initialView={{ lat: location.lat, lon: location.lon, zoom: 7.4 }}
                layers={{
                  hotspots: true,
                  heatmap: false,
                  risk: false,
                  weather: false,
                  warnings: false,
                  air: false,
                  community: false,
                  quakes: false,
                }}
              />
              <div className="flex items-center justify-between gap-2 border-t border-line px-5 py-3 sm:px-6">
                <span className="flex items-center gap-3 font-mono text-[10.5px] uppercase tracking-[0.04em] text-muted">
                  {[
                    ['#C62A1F', '≤6j'],
                    ['#E66B24', '≤24j'],
                    ['#D99A22', '≤72j'],
                  ].map(([c, l]) => (
                    <span key={l} className="inline-flex items-center gap-1.5">
                      <span className="size-2 rounded-full" style={{ background: c }} />
                      {l}
                    </span>
                  ))}
                </span>
                <TextLink to="/app/map">
                  Buka Siaga Map <ArrowUpRight className="size-3.5" />
                </TextLink>
              </div>
            </Card>

            <Card className="min-w-0 lg:col-span-5">
              <CardHeader>
                <div>
                  <CardTitle>Ringkasan bahaya</CardTitle>
                  <p className="mt-1 text-[12.5px] text-muted">Ketuk untuk melihat penjelasan</p>
                </div>
                <span className="telemetry">{mode === 'personal' ? 'Personal' : 'Lokasi'}</span>
              </CardHeader>
              <div className="divide-y divide-line px-3 pb-3 sm:px-4">
                {assessment
                  ? HAZARD_ORDER.map((k) => (
                      <HazardRow
                        key={k}
                        hazard={assessment.hazards[k]}
                        personal={mode === 'personal' ? assessment.personal.hazards[k] : undefined}
                        onClick={() => navigate(`/app/risk?hazard=${k}`)}
                      />
                    ))
                  : HAZARD_ORDER.map((k) => <Skeleton key={k} className="my-3 h-12" />)}
              </div>
            </Card>
          </div>

          {/* ROW 3 — Environmental conditions (12) */}
          <Card>
            <CardHeader>
              <div className="min-w-0">
                <CardTitle>Kondisi 24 jam ke depan</CardTitle>
                <p className="mt-1 truncate text-[12.5px] text-muted">
                  {weather.data?.bmkg
                    ? `Prakiraan BMKG — ${weather.data.bmkg.village}, ${weather.data.bmkg.city}`
                    : 'Model Open-Meteo'}
                </p>
              </div>
              <FreshnessBadge provenance={weather.data?.provenance} />
            </CardHeader>
            <CardContent>
              {weather.state === 'error' ? (
                <ErrorState
                  title="Cuaca sementara tidak tersedia"
                  description="Sumber BMKG & Open-Meteo tidak merespons. Skor dihitung tanpa data cuaca."
                  onRetry={() => weather.refetch()}
                />
              ) : w ? (
                <div className="grid gap-6 lg:grid-cols-[260px_1fr] lg:gap-8">
                  <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line lg:grid-cols-1">
                    <Metric
                      icon={<WeatherIcon code={w.weatherCode} className="size-4" />}
                      label="Kondisi"
                      value={w.description}
                    />
                    <Metric
                      icon={<Thermometer className="size-4" />}
                      label="Suhu"
                      value={w.temperature != null ? `${Math.round(w.temperature)}°C` : '–'}
                    />
                    <Metric
                      icon={<Droplets className="size-4" />}
                      label="Kelembapan"
                      value={w.humidity != null ? `${Math.round(w.humidity)}%` : '–'}
                    />
                    <Metric
                      icon={<Wind className="size-4" />}
                      label="Angin"
                      value={
                        w.windSpeed != null
                          ? `${Math.round(w.windSpeed)} km/j${w.windDirection != null ? ` ${compass(w.windDirection)}` : ''}`
                          : '–'
                      }
                    />
                  </dl>
                  <div className="min-w-0">
                    <HourlyWeatherCharts hourly={weather.data!.hourly} />
                    {windows && windows.length > 0 && (
                      <p className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border border-risk-safe/20 bg-[#EEF7F2] px-3.5 py-2.5 text-[13px] text-[#17654A]">
                        <span className="font-semibold">Waktu luar ruang lebih aman:</span>
                        <span className="font-mono text-[12px]">
                          {windows.map(describeWindow).join(' · ')} WIB
                        </span>
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <Skeleton className="h-56" />
              )}
            </CardContent>
          </Card>

          {/* ROW 4 — Alerts (7) · Air + next steps (5) */}
          <div className="grid gap-5 lg:grid-cols-12 lg:gap-6">
            <Card className="min-w-0 lg:col-span-7">
              <CardHeader>
                <div>
                  <CardTitle>Peringatan resmi</CardTitle>
                  <p className="mt-1 text-[12.5px] text-muted">BMKG · diperbarui otomatis</p>
                </div>
                <TextLink to="/app/alerts">
                  Semua <ArrowRight className="size-3.5" />
                </TextLink>
              </CardHeader>
              <CardContent className="pt-0">
                {topAlerts.length ? (
                  <ul className="divide-y divide-line">
                    {topAlerts.map((a) => (
                      <li key={a.id}>
                        <Link
                          to="/app/alerts"
                          className="group flex items-start gap-3.5 py-3.5 transition-colors hover:bg-raised"
                        >
                          <span
                            className="mt-1.5 size-2 shrink-0 rounded-full"
                            style={{ background: ALERT_LEVELS[a.level].color }}
                            aria-hidden
                          />
                          <span className="min-w-0 flex-1">
                            <span className="line-clamp-1 text-[14px] font-semibold text-ink">{a.title}</span>
                            <span className="mt-0.5 flex items-center gap-2 font-mono text-[10.5px] uppercase tracking-[0.04em] text-subtle">
                              <span style={{ color: ALERT_LEVELS[a.level].text }} className="font-semibold">
                                {ALERT_LEVELS[a.level].label}
                              </span>
                              · {timeAgo(a.time)}
                            </span>
                          </span>
                          <ArrowUpRight className="mt-1 size-4 shrink-0 text-line-strong transition-colors group-hover:text-ink" />
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <AraSays pose="rest" size={80} tone="calm" title="Tidak ada peringatan resmi">
                    Belum ada yang perlu dikhawatirkan saat ini.
                  </AraSays>
                )}
              </CardContent>
            </Card>

            <div className="grid min-w-0 gap-5 lg:col-span-5 lg:gap-6">
              <Card>
                <CardHeader className="pb-2">
                  <div>
                    <CardTitle>Kualitas udara</CardTitle>
                    <p className="mt-1 text-[12.5px] text-muted">Model CAMS · indikatif</p>
                  </div>
                  <FreshnessBadge provenance={airQuality.data?.provenance} />
                </CardHeader>
                <CardContent>
                  {airQuality.data?.pm25 != null ? (
                    <div className="flex items-end gap-6">
                      <div>
                        <p className="display-metric text-[40px]">{Math.round(airQuality.data.pm25)}</p>
                        <p className="telemetry mt-1.5">PM2.5 µg/m³</p>
                      </div>
                      {airQuality.data.usAqi != null && (
                        <div>
                          <p className="display-metric text-[24px] text-neutral-600">
                            {airQuality.data.usAqi}
                          </p>
                          <p className="telemetry mt-1.5">US AQI</p>
                        </div>
                      )}
                      <p className="ml-auto max-w-[44%] text-right text-[12.5px] leading-snug text-muted">
                        {airQuality.data.pm25 <= 15
                          ? 'Baik untuk aktivitas luar.'
                          : airQuality.data.pm25 <= 35
                            ? 'Sedang — kelompok sensitif hati-hati.'
                            : 'Tidak sehat — pakai masker.'}
                      </p>
                    </div>
                  ) : airQuality.state === 'loading' ? (
                    <Skeleton className="h-14" />
                  ) : (
                    <p className="text-[13px] text-muted">Data kualitas udara tidak tersedia.</p>
                  )}
                </CardContent>
              </Card>

              <Card className="overflow-hidden">
                <CardHeader className="pb-1">
                  <CardTitle>Lanjutkan persiapan</CardTitle>
                </CardHeader>
                <nav className="divide-y divide-line px-2 pb-2">
                  <NextStep
                    to="/app/action-plan"
                    icon={<ClipboardCheck />}
                    title="Rencana Aksi"
                    text="Langkah sekarang & nanti"
                  />
                  <NextStep
                    to="/app/family"
                    icon={<Users />}
                    title="Keluarga Siaga"
                    text="Prioritas anak & lansia"
                  />
                  <NextStep
                    to="/app/community"
                    icon={<Megaphone />}
                    title="Laporan Warga"
                    text="Kondisi dari lapangan"
                  />
                </nav>
              </Card>
            </div>
          </div>

          {/* Explore & data */}
          <div className="grid gap-5 lg:grid-cols-12 lg:gap-6">
            <section className="min-w-0 lg:col-span-7">
              <SectionTitle eyebrow="Eksplorasi">Coba wilayah atau simulasi lain</SectionTitle>
              <div className="snap-row -mx-4 flex gap-2 overflow-x-auto px-4 pb-2 scrollbar-none sm:mx-0 sm:flex-wrap sm:px-0">
                {EXPLORE_PRESETS.map((p) => {
                  const c = CITY_BY_SLUG[p.slug];
                  return (
                    <Chip
                      key={p.slug}
                      active={location.id === `preset-${c.slug}`}
                      onClick={() => {
                        setScenario(null);
                        setCurrent({
                          id: `preset-${c.slug}`,
                          name: c.name,
                          region: c.province,
                          provinceCode: c.provinceCode,
                          lat: c.lat,
                          lon: c.lon,
                          source: 'preset',
                        });
                      }}
                    >
                      <MapPin className="size-3.5" /> {c.name}
                    </Chip>
                  );
                })}
                {Object.values(SCENARIOS).map((s) => (
                  <Chip
                    key={s.id}
                    active={scenario === s.id}
                    onClick={() => setScenario(s.id)}
                    className="border-ai/20 text-ai-deep"
                  >
                    {s.emoji} {s.title}
                  </Chip>
                ))}
              </div>
            </section>
            <Card className="min-w-0 lg:col-span-5">
              <CardHeader className="pb-1">
                <div>
                  <CardTitle>Kesegaran data</CardTitle>
                  <p className="telemetry mt-1">
                    Mode:{' '}
                    <span className="text-ink">
                      {dataMode === 'live'
                        ? 'Live'
                        : dataMode === 'snapshot'
                          ? 'Snapshot'
                          : dataMode === 'scenario'
                            ? 'Simulasi'
                            : 'Offline'}
                    </span>
                  </p>
                </div>
                <TextLink to="/app/about">Metodologi</TextLink>
              </CardHeader>
              <CardContent>
                <SourcesPanel sources={sources} />
              </CardContent>
            </Card>
          </div>

          <Disclaimer className="rounded-card border border-line bg-white px-5 py-4" />
        </div>
      )}

      <LocationPicker open={picker} onOpenChange={setPicker} onPicked={() => setShowSequence(true)} />
    </div>
  );
}

function ScoreNumber({ value }: { value: number }) {
  const v = useCountUp(value);
  return (
    <p className="display-metric text-[88px] text-ink sm:text-[104px]" aria-label={`Skor ${value} dari 100`}>
      {v}
      <span className="ml-1.5 font-mono text-[15px] font-medium tracking-normal text-subtle">/100</span>
    </p>
  );
}

function Meta({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className={cn('min-w-0', className)}>
      <dt className="data-label">{label}</dt>
      <dd className="mt-1 flex min-w-0 items-center gap-1.5 text-[14px] font-semibold text-ink">
        {children}
      </dd>
    </div>
  );
}

function Metric({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="bg-white px-4 py-3.5">
      <dt className="flex items-center gap-1.5 text-[12px] font-medium text-muted [&_svg]:text-subtle">
        {icon}
        {label}
      </dt>
      <dd className="mt-1 truncate text-[15px] font-bold text-ink">{value}</dd>
    </div>
  );
}

function NextStep({ to, icon, title, text }: { to: string; icon: ReactNode; title: string; text: string }) {
  return (
    <Link
      to={to}
      className="group flex items-center gap-3.5 rounded-lg px-3 py-3 transition-colors hover:bg-raised [&>svg:first-child]:size-[18px]"
    >
      <span className="text-brand [&_svg]:size-[18px]">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-[14px] font-semibold text-ink">{title}</span>
        <span className="block text-[12.5px] text-muted">{text}</span>
      </span>
      <ArrowRight className="size-4 text-line-strong transition-all group-hover:translate-x-0.5 group-hover:text-ink" />
    </Link>
  );
}
