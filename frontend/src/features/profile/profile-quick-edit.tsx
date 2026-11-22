import { Chip } from '@/features/location/location-picker';
import { useProfileStore } from '@/stores';
import type { DailyActivity, ExposureLevel, Occupation, PersonalProfile, Transport } from '@/types/domain';
import { t } from '@/lib/i18n';

/** Option with a label resolved in the active language on every access. */
export const opt = <T extends string>(value: T, id: string, en: string, emoji?: string) => ({
  value,
  emoji,
  get label() {
    return t(id, en);
  },
});

export const OCCUPATIONS: { value: Occupation; label: string; emoji?: string }[] = [
  opt<Occupation>('student', 'Pelajar / Mahasiswa', 'Student', '🎓'),
  opt<Occupation>('office', 'Pekerja kantor', 'Office worker', '💼'),
  opt<Occupation>('outdoor', 'Pekerja luar ruang', 'Outdoor worker', '👷'),
  opt<Occupation>('merchant', 'Pedagang', 'Trader / vendor', '🛒'),
  opt<Occupation>('other', 'Lainnya', 'Other', '🙂'),
];
export const TRANSPORTS: { value: Transport; label: string; emoji?: string }[] = [
  opt<Transport>('motorcycle', 'Sepeda motor', 'Motorcycle', '🛵'),
  opt<Transport>('walking', 'Jalan kaki', 'Walking', '🚶'),
  opt<Transport>('car', 'Mobil', 'Car', '🚗'),
  opt<Transport>('public', 'Transportasi umum', 'Public transport', '🚌'),
];
export const EXPOSURES: { value: ExposureLevel; label: string }[] = [
  opt<ExposureLevel>('low', 'Rendah', 'Low'),
  opt<ExposureLevel>('moderate', 'Sedang', 'Moderate'),
  opt<ExposureLevel>('high', 'Tinggi', 'High'),
];
export const ACTIVITIES: { value: DailyActivity; label: string }[] = [
  opt<DailyActivity>('indoor', 'Dominan dalam ruang', 'Mostly indoor'),
  opt<DailyActivity>('mixed', 'Campuran', 'Mixed'),
  opt<DailyActivity>('outdoor', 'Dominan luar ruang', 'Mostly outdoor'),
];

export function ChoiceRow<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: T; label: string; emoji?: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div role="group" aria-label={label}>
      <p className="mb-2 text-[12.5px] font-semibold text-neutral-700">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => (
          <Chip key={o.value} active={value === o.value} onClick={() => onChange(o.value)}>
            {o.label}
          </Chip>
        ))}
      </div>
    </div>
  );
}

/** Minimal personal context — no sensitive/medical data is ever requested. */
export function ProfileQuickEdit({ compact }: { compact?: boolean }) {
  const profile = useProfileStore((s) => s.profile);
  const update = useProfileStore((s) => s.update);
  const set =
    <K extends keyof PersonalProfile>(k: K) =>
    (v: PersonalProfile[K]) =>
      update({ [k]: v } as Partial<PersonalProfile>);
  return (
    <div className={compact ? 'space-y-3' : 'space-y-4'}>
      <ChoiceRow
        label={t('Pekerjaan', 'Occupation')}
        options={OCCUPATIONS}
        value={profile.occupation}
        onChange={set('occupation')}
      />
      <ChoiceRow
        label={t('Transportasi harian', 'Daily transport')}
        options={TRANSPORTS}
        value={profile.transport}
        onChange={set('transport')}
      />
      <ChoiceRow
        label={t('Paparan luar ruang', 'Outdoor exposure')}
        options={EXPOSURES}
        value={profile.exposure}
        onChange={set('exposure')}
      />
      <ChoiceRow
        label={t('Aktivitas harian', 'Daily activity')}
        options={ACTIVITIES}
        value={profile.activity}
        onChange={set('activity')}
      />
    </div>
  );
}
