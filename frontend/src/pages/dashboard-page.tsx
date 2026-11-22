import {
  ArrowRight,
  Bookmark,
  ClipboardCheck,
  Compass,
  Droplets,
  Gauge,
  MapPin,
  RefreshCw,
  Sparkles,
  Thermometer,
  Wind,
} from 'lucide-react';
import { useCallback, useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router';
import { toast } from 'sonner';
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
import { HAZARD_ICONS, RiskBadge, ScoreGauge } from '@/components/common/risk';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, Skeleton } from '@/components/ui/primitives';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/overlays';
import { CITY_BY_SLUG, EXPLORE_PRESETS } from '@/data/cities';
import { SCENARIOS } from '@/data/scenarios';
import { ALERT_LEVELS, useAlerts } from '@/features/alerts/use-alerts';
import { HourlyWeatherCharts } from '@/features/charts/charts';
import { LocationPicker, Chip } from '@/features/location/location-picker';
import { SiagaMap } from '@/features/map/siaga-map';
import { AnalysisSequence, HazardCard, SourcesPanel } from '@/features/risk/components';
import { describeWindow } from '@/features/risk/engine/timing';
import { useAiContext, useAiQuery } from '@/hooks/use-ai';
import { useDocumentTitle } from '@/hooks/use-misc';
import { compass, formatDistance, formatLongDate, timeAgo } from '@/lib/format';
import { HAZARD_ORDER, HAZARDS, RISK_LEVELS } from '@/lib/risk-levels';
import { useLocationStore, useSettings } from '@/stores';

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
  const primaryMeta = score ? HAZARDS[score.primaryHazard] : null;
  const w = weather.data?.current;
  const topAlerts = alerts.filter((a) => a.origin === 'official').slice(0, 3);

  return (
    <div className="animate-fade-up">
      <PageHeader
        eyebrow={
          <>
            <span>{formatLongDate(new Date())}</span>
            <span aria-hidden>·</span>
            <FreshnessBadge provenance={weather.data?.provenance} showSource />
          </>
        }
        title="Seberapa aman lokasi Anda hari ini?"
        description={
          <>
            Analisis risiko untuk <b className="text-ink">{location.name}</b>
            {location.region ? `, ${location.region}` : ''} — dari data BMKG, NASA FIRMS & Open-Meteo,
            dihitung Siaga Risk Engine.
          </>
        }
        actions={
          <>
            <Button variant="secondary" onClick={() => setPicker(true)}>
              <MapPin /> Ubah lokasi
            </Button>
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
                <Bookmark /> Simpan lokasi
              </Button>
            )}
          </>
        }
      />

      {location.source === 'default' && !scenario && (
        <Card className="mb-5 flex flex-col gap-3 border-dashed p-4 sm:flex-row sm:items-center">
          <p className="flex-1 text-[13.5px] text-neutral-700">
            Menampilkan <b>{location.name}</b> sebagai lokasi bawaan. Gunakan GPS atau cari kota Anda untuk
            analisis yang personal.
          </p>
          <Button size="sm" onClick={() => setPicker(true)}>
            <MapPin /> Pilih lokasi saya
          </Button>
        </Card>
      )}

      {sequenceVisible ? (
        <AnalysisSequence
          sources={sources}
          ready={!!assessment}
          locationName={location.name}
          onDone={finishSequence}
        />
      ) : (
        <>
          <div className="grid gap-5 lg:grid-cols-12">
            {/* Siaga Score */}
            <Card className="min-w-0 relative overflow-hidden lg:col-span-5">
              <div className="bg-batik absolute inset-0 opacity-[0.025]" aria-hidden />
              <div className="relative p-5">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-[12px] font-semibold uppercase tracking-wider text-muted">
                      Indicative Siaga Score
                    </p>
                    <p className="text-[12px] text-muted">Makin tinggi = makin perlu waspada</p>
                  </div>
                  <Tabs value={mode} onValueChange={(v) => setMode(v as typeof mode)}>
                    <TabsList>
                      <TabsTrigger value="personal">Personal</TabsTrigger>
                      <TabsTrigger value="location">Lokasi</TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>
                {score && level && primaryMeta ? (
                  <>
                    <div className="mt-4">
                      <ScoreGauge
                        score={score.score}
                        level={score.level}
                        sublabel={
                          mode === 'personal'
                            ? 'Disesuaikan dengan profil Anda'
                            : 'Bahaya lingkungan di lokasi'
                        }
                      />
                    </div>
                    <div className="mt-4 flex flex-col items-center text-center">
                      <RiskBadge level={score.level} size="lg" />
                      <p className="mt-2 max-w-sm text-[13.5px] leading-relaxed text-neutral-600">
                        {level.description}
                      </p>
                      <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-neutral-100 px-3 py-1 text-[12px] font-semibold text-neutral-700">
                        {(() => {
                          const Icon = HAZARD_ICONS[score.primaryHazard];
                          return <Icon className="size-3.5" />;
                        })()}
                        Bahaya utama: {primaryMeta.label}
                      </p>
                    </div>
                    <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                      <Button asChild variant="ai">
                        <Link to="/app/risk">
                          <Sparkles /> Apa artinya bagi saya?
                        </Link>
                      </Button>
                      <Button asChild>
                        <Link to="/app/action-plan">
                          <ClipboardCheck /> Buat Rencana Aksi
                        </Link>
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="mt-6 space-y-3">
                    <Skeleton className="mx-auto h-32 w-56" />
                    <Skeleton className="mx-auto h-6 w-24" />
                  </div>
                )}
              </div>
            </Card>

            {/* Local map */}
            <Card className="min-w-0 flex flex-col overflow-hidden lg:col-span-7">
              <CardHeader>
                <div>
                  <CardTitle>Peta sekitar {location.name}</CardTitle>
                  <p className="mt-1 text-[12.5px] text-muted">
                    {hotspots.data
                      ? nearby && nearby.length
                        ? `${nearby.length} titik panas dalam 150 km (72 jam) · terdekat ${formatDistance(nearby[0].distanceKm)}`
                        : 'Tidak ada titik panas satelit dalam 150 km (72 jam terakhir)'
                      : 'Memuat titik panas…'}
                  </p>
                </div>
                <FreshnessBadge provenance={hotspots.data?.provenance} kind="hotspots" />
              </CardHeader>
              <SiagaMap
                key={location.id}
                compact
                className="min-h-[300px] flex-1"
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
              <div className="flex items-center justify-between gap-2 border-t border-line px-5 py-3">
                <span className="flex items-center gap-3 text-[11.5px] text-muted">
                  {[
                    ['#DC2626', '≤6 jam'],
                    ['#F97316', '≤24 jam'],
                    ['#F59E0B', '≤72 jam'],
                  ].map(([c, l]) => (
                    <span key={l} className="inline-flex items-center gap-1">
                      <span className="size-2.5 rounded-full" style={{ background: c }} />
                      {l}
                    </span>
                  ))}
                </span>
                <TextLink to="/app/map">Buka Siaga Map →</TextLink>
              </div>
            </Card>
          </div>

          {/* Hazard cards */}
          <section className="mt-5" aria-label="Kartu bahaya">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-5">
              {assessment
                ? HAZARD_ORDER.map((k) => (
                    <HazardCard
                      key={k}
                      hazard={assessment.hazards[k]}
                      personal={mode === 'personal' ? assessment.personal.hazards[k] : undefined}
                      onClick={() => navigate(`/app/risk?hazard=${k}`)}
                    />
                  ))
                : HAZARD_ORDER.map((k) => <Skeleton key={k} className="h-40" />)}
            </div>
          </section>

          <div className="mt-5 grid gap-5 lg:grid-cols-12">
            <div className="min-w-0 space-y-5 lg:col-span-7">
              <AiPanel
                title="SiagaAI Brief"
                provider={brief.data?.provider}
                fallbackReason={brief.data?.fallback ? brief.data.fallbackReason : undefined}
                generatedAt={brief.data?.generatedAt}
                actions={
                  brief.data && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => brief.refetch()}
                      aria-label="Perbarui brief"
                    >
                      <RefreshCw className={brief.isFetching ? 'animate-spin' : ''} />
                    </Button>
                  )
                }
              >
                {brief.data ? (
                  <div className="animate-fade-up">
                    <p className="text-[18px] font-bold leading-snug text-ink">
                      {brief.data.output.headline}
                    </p>
                    <p className="mt-2 text-[14px] leading-relaxed text-neutral-700">
                      {brief.data.output.summary}
                    </p>
                    <ul className="mt-3 space-y-1.5">
                      {brief.data.output.keyPoints.map((k) => (
                        <li key={k} className="flex gap-2 text-[13.5px] text-neutral-700">
                          <span className="mt-2 size-1.5 shrink-0 rounded-full bg-ai" aria-hidden />
                          {k}
                        </li>
                      ))}
                    </ul>
                    <div className="mt-4 flex items-start gap-3 rounded-xl bg-white p-3 ring-1 ring-indigo-100">
                      <ArrowRight className="mt-0.5 size-4 shrink-0 text-ai" aria-hidden />
                      <p className="text-[13.5px] font-semibold text-ink">
                        Tindakan yang disarankan:{' '}
                        <span className="font-normal text-neutral-700">{brief.data.output.nextAction}</span>
                      </p>
                    </div>
                  </div>
                ) : brief.isError ? (
                  <ErrorState title="SiagaAI tidak dapat menyusun brief" onRetry={() => brief.refetch()} />
                ) : (
                  <AiThinking />
                )}
              </AiPanel>

              <Card>
                <CardHeader>
                  <div>
                    <CardTitle>Cuaca 24 jam ke depan</CardTitle>
                    <p className="mt-1 text-[12.5px] text-muted">
                      {weather.data?.bmkg
                        ? `Prakiraan resmi BMKG — ${weather.data.bmkg.village}, ${weather.data.bmkg.city}`
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
                    <>
                      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
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
                              ? `${Math.round(w.windSpeed)} km/j${w.windDirection != null ? ` · ${compass(w.windDirection)}` : ''}`
                              : '–'
                          }
                        />
                      </div>
                      <HourlyWeatherCharts hourly={weather.data!.hourly} />
                      {windows && windows.length > 0 && (
                        <p className="mt-3 rounded-lg bg-green-50 px-3 py-2 text-[12.5px] text-green-800">
                          Jendela aktivitas luar ruang yang relatif lebih aman:{' '}
                          <b>{windows.map(describeWindow).join(' · ')} WIB</b>
                        </p>
                      )}
                      {weather.data?.bmkg && (
                        <p className="mt-3 text-[11px] text-muted">
                          Sumber: BMKG (Badan Meteorologi, Klimatologi, dan Geofisika) · detail per jam:
                          Open-Meteo
                        </p>
                      )}
                    </>
                  ) : (
                    <Skeleton className="h-52" />
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="min-w-0 space-y-5 lg:col-span-5">
              <Card>
                <CardHeader>
                  <CardTitle>Peringatan & informasi resmi</CardTitle>
                  <TextLink to="/app/alerts">Semua →</TextLink>
                </CardHeader>
                <CardContent className="space-y-2.5">
                  {topAlerts.length ? (
                    topAlerts.map((a) => (
                      <Link
                        key={a.id}
                        to="/app/alerts"
                        className="block rounded-xl border border-line p-3 transition-colors hover:bg-neutral-50"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className="rounded-full px-2 py-0.5 text-[10.5px] font-bold"
                            style={{
                              background: ALERT_LEVELS[a.level].soft,
                              color: ALERT_LEVELS[a.level].text,
                            }}
                          >
                            {ALERT_LEVELS[a.level].label.toUpperCase()}
                          </span>
                          <span className="truncate text-[11px] text-muted">
                            {a.source} · {timeAgo(a.time)}
                          </span>
                        </div>
                        <p className="mt-1.5 line-clamp-2 text-[13px] font-semibold text-ink">{a.title}</p>
                      </Link>
                    ))
                  ) : (
                    <p className="py-4 text-[13px] text-muted">
                      Tidak ada peringatan resmi yang memerlukan perhatian saat ini.
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div>
                    <CardTitle>Kualitas udara</CardTitle>
                    <p className="mt-1 text-[12.5px] text-muted">
                      Model CAMS (Copernicus) — indikatif, bukan sensor
                    </p>
                  </div>
                  <FreshnessBadge provenance={airQuality.data?.provenance} />
                </CardHeader>
                <CardContent>
                  {airQuality.data?.pm25 != null ? (
                    <div className="flex items-end gap-4">
                      <div>
                        <p className="tabular text-[32px] font-bold leading-none">
                          {Math.round(airQuality.data.pm25)}
                        </p>
                        <p className="mt-1 text-[12px] text-muted">PM2.5 µg/m³</p>
                      </div>
                      {airQuality.data.usAqi != null && (
                        <div>
                          <p className="tabular text-[20px] font-semibold leading-none">
                            {airQuality.data.usAqi}
                          </p>
                          <p className="mt-1 text-[12px] text-muted">US AQI</p>
                        </div>
                      )}
                      <p className="ml-auto max-w-[45%] text-right text-[12px] text-muted">
                        {airQuality.data.pm25 <= 15
                          ? 'Baik untuk aktivitas luar.'
                          : airQuality.data.pm25 <= 35
                            ? 'Sedang — kelompok sensitif berhati-hati.'
                            : 'Tidak sehat — kurangi aktivitas luar & gunakan masker.'}
                      </p>
                    </div>
                  ) : airQuality.state === 'loading' ? (
                    <Skeleton className="h-12" />
                  ) : (
                    <p className="text-[13px] text-muted">Data kualitas udara saat ini tidak tersedia.</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div>
                    <CardTitle>Kesegaran data</CardTitle>
                    <p className="mt-1 text-[12.5px] text-muted">
                      Mode data:{' '}
                      <b className="text-ink">
                        {dataMode === 'live'
                          ? 'Live'
                          : dataMode === 'snapshot'
                            ? 'Snapshot'
                            : dataMode === 'scenario'
                              ? 'Simulasi'
                              : 'Offline'}
                      </b>
                    </p>
                  </div>
                  <TextLink to="/app/about">Metodologi →</TextLink>
                </CardHeader>
                <CardContent>
                  <SourcesPanel sources={sources} />
                </CardContent>
              </Card>
            </div>
          </div>

          <section className="mt-6">
            <SectionTitle action={<Compass className="size-4 text-muted" aria-hidden />}>
              Jelajahi wilayah
            </SectionTitle>
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
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
                  className="border-indigo-200 text-ai"
                >
                  {s.emoji} Simulasi: {s.title}
                </Chip>
              ))}
            </div>
          </section>

          <div className="mt-6 flex flex-col gap-3 rounded-card border border-line bg-white p-4 sm:flex-row sm:items-center">
            <Gauge className="size-5 shrink-0 text-muted" aria-hidden />
            <Disclaimer className="flex-1" />
          </div>
        </>
      )}

      <LocationPicker open={picker} onOpenChange={setPicker} onPicked={() => setShowSequence(true)} />
    </div>
  );
}

function Metric({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl bg-neutral-50 px-3 py-2.5">
      <p className="flex items-center gap-1.5 text-[11.5px] font-medium text-muted">
        {icon}
        {label}
      </p>
      <p className="mt-0.5 truncate text-[14px] font-semibold text-ink">{value}</p>
    </div>
  );
}
