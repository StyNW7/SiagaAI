import { ArrowLeft, ArrowRight, Check, Loader2, LocateFixed, MapPin } from 'lucide-react';
import { Dialog as DialogPrimitive } from 'radix-ui';
import { useEffect, useState } from 'react';
import { Ara, type AraPose } from '@/components/common/ara';
import { Button } from '@/components/ui/button';
import { CITY_BY_SLUG, EXPLORE_PRESETS } from '@/data/cities';
import { Chip } from '@/features/location/location-picker';
import {
  ACTIVITIES,
  ChoiceRow,
  EXPOSURES,
  OCCUPATIONS,
  TRANSPORTS,
} from '@/features/profile/profile-quick-edit';
import { useGeolocation } from '@/hooks/use-geolocation';
import { cn } from '@/lib/utils';
import { useLocationStore, useProfileStore, useSettings } from '@/stores';
import type { PersonalProfile } from '@/types/domain';

const KEY = 'siaga.onboarded';
const STEPS: { title: string; text: string; pose: AraPose }[] = [
  { title: 'Di mana lokasimu?', text: 'Risiko dihitung untuk titik ini. GPS tidak disimpan.', pose: 'map' },
  { title: 'Aktivitas harianmu', text: 'Pekerjaan & transportasi mengubah paparan.', pose: 'tablet' },
  { title: 'Seberapa sering di luar?', text: 'Dipakai untuk menyesuaikan skor personal.', pose: 'explain' },
  { title: 'Kamu siap!', text: 'Dashboard sudah disesuaikan untukmu.', pose: 'success' },
];

const REQUEST = 'siaga.onboarding.request';
export const markOnboarded = () => {
  localStorage.setItem(KEY, '1');
  localStorage.removeItem(REQUEST);
};
/** Ask the app shell to show onboarding on next load (e.g. right after sign-up). */
export const requestOnboarding = () => localStorage.setItem(REQUEST, '1');

/**
 * Four-step, skippable onboarding (location → daily context → exposure → ready).
 * Opens on first app visit when neither a location nor a profile has been set,
 * or right after sign-up (sign-up clears the flag).
 */
export function Onboarding() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const current = useLocationStore((s) => s.current);
  const setCurrent = useLocationStore((s) => s.setCurrent);
  const customized = useProfileStore((s) => s.customized);
  const profile = useProfileStore((s) => s.profile);
  const update = useProfileStore((s) => s.update);
  const setScenario = useSettings((s) => s.setScenario);
  const { locate, busy } = useGeolocation();

  useEffect(() => {
    const requested = !!localStorage.getItem(REQUEST);
    const fresh = !localStorage.getItem(KEY) && !customized && (!current || current.source === 'default');
    if (!requested && !fresh) return;
    const t = setTimeout(() => setOpen(true), 600);
    return () => clearTimeout(t);
    // Decide once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const close = () => {
    markOnboarded();
    setOpen(false);
  };
  const set =
    <K extends keyof PersonalProfile>(k: K) =>
    (v: PersonalProfile[K]) =>
      update({ [k]: v } as Partial<PersonalProfile>);

  const pickCity = (slug: string) => {
    const c = CITY_BY_SLUG[slug];
    if (!c) return;
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
  };

  const s = STEPS[step];
  const last = step === STEPS.length - 1;
  const locationChosen = current && current.source !== 'default';

  return (
    <DialogPrimitive.Root open={open} onOpenChange={(o) => (o ? setOpen(true) : close())}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[60] bg-neutral-950/35 backdrop-blur-[3px] data-[state=open]:animate-fade-in" />
        <DialogPrimitive.Content className="fixed inset-x-0 bottom-0 z-[61] max-h-[92dvh] overflow-y-auto rounded-t-[22px] border border-line bg-white shadow-float focus:outline-none data-[state=open]:animate-sheet-up sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-[10vh] sm:w-[560px] sm:-translate-x-1/2 sm:rounded-[20px]">
          {/* Stepper */}
          <div className="flex items-center gap-2 border-b border-line px-6 py-4">
            {STEPS.map((_, i) => (
              <span
                key={i}
                className={cn(
                  'h-1.5 flex-1 rounded-full transition-colors duration-300',
                  i <= step ? 'bg-brand' : 'bg-neutral-200',
                )}
              />
            ))}
            <span className="ml-2 font-mono text-[11px] text-subtle">
              {String(step + 1).padStart(2, '0')}/{String(STEPS.length).padStart(2, '0')}
            </span>
          </div>

          <div className="px-6 pb-6 pt-5 sm:px-8">
            <div className="flex items-end gap-4">
              <Ara pose={s.pose} size={110} key={s.pose} className="animate-fade-up" />
              <div className="pb-2">
                <DialogPrimitive.Title className="text-[22px] font-bold leading-tight tracking-[-0.025em]">
                  {s.title}
                </DialogPrimitive.Title>
                <DialogPrimitive.Description className="mt-1 text-[14px] text-muted">
                  {s.text}
                </DialogPrimitive.Description>
              </div>
            </div>

            <div key={step} className="mt-6 min-h-[190px] animate-fade-up">
              {step === 0 && (
                <div className="space-y-4">
                  <Button
                    variant="secondary"
                    className="w-full justify-start"
                    onClick={() => void locate()}
                    disabled={busy}
                  >
                    {busy ? <Loader2 className="animate-spin" /> : <LocateFixed className="text-brand" />}{' '}
                    Gunakan lokasi saya (GPS)
                  </Button>
                  <div>
                    <p className="data-label mb-2">Atau pilih kota</p>
                    <div className="flex flex-wrap gap-1.5">
                      {EXPLORE_PRESETS.map((p) => {
                        const c = CITY_BY_SLUG[p.slug];
                        return (
                          <Chip
                            key={p.slug}
                            active={current?.id === `preset-${p.slug}`}
                            onClick={() => pickCity(p.slug)}
                          >
                            {c.name}
                          </Chip>
                        );
                      })}
                    </div>
                  </div>
                  {locationChosen && (
                    <p className="flex items-center gap-2 rounded-lg bg-[#EEF7F2] px-3 py-2 text-[13px] font-semibold text-[#17654A]">
                      <MapPin className="size-4" /> {current.name}
                      {current.region ? `, ${current.region}` : ''}
                    </p>
                  )}
                </div>
              )}
              {step === 1 && (
                <div className="space-y-5">
                  <ChoiceRow
                    label="Pekerjaan"
                    options={OCCUPATIONS}
                    value={profile.occupation}
                    onChange={set('occupation')}
                  />
                  <ChoiceRow
                    label="Transportasi harian"
                    options={TRANSPORTS}
                    value={profile.transport}
                    onChange={set('transport')}
                  />
                </div>
              )}
              {step === 2 && (
                <div className="space-y-5">
                  <ChoiceRow
                    label="Paparan luar ruang"
                    options={EXPOSURES}
                    value={profile.exposure}
                    onChange={set('exposure')}
                  />
                  <ChoiceRow
                    label="Aktivitas harian"
                    options={ACTIVITIES}
                    value={profile.activity}
                    onChange={set('activity')}
                  />
                </div>
              )}
              {step === 3 && (
                <ul className="space-y-2.5">
                  {[
                    current ? `Lokasi: ${current.name}` : 'Lokasi bawaan',
                    `${OCCUPATIONS.find((o) => o.value === profile.occupation)?.label} · ${TRANSPORTS.find((o) => o.value === profile.transport)?.label}`,
                    `Paparan luar ruang ${EXPOSURES.find((o) => o.value === profile.exposure)?.label.toLowerCase()}`,
                  ].map((t) => (
                    <li key={t} className="flex items-center gap-3 text-[14px] font-medium">
                      <span className="grid size-6 place-items-center rounded-full bg-risk-safe text-white">
                        <Check className="size-3.5" strokeWidth={3} />
                      </span>
                      {t}
                    </li>
                  ))}
                  <li className="pt-2 text-[13px] text-muted">Bisa diubah kapan saja di halaman Profil.</li>
                </ul>
              )}
            </div>
          </div>

          <div className="safe-bottom flex items-center gap-2 border-t border-line bg-raised px-6 py-4">
            {step === 0 ? (
              <Button variant="ghost" onClick={close}>
                Lewati
              </Button>
            ) : (
              <Button variant="ghost" onClick={() => setStep((n) => n - 1)}>
                <ArrowLeft /> Kembali
              </Button>
            )}
            <div className="flex-1" />
            {last ? (
              <Button onClick={close}>
                Lihat dashboard <ArrowRight />
              </Button>
            ) : (
              <Button onClick={() => setStep((n) => n + 1)}>
                Lanjut <ArrowRight />
              </Button>
            )}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
