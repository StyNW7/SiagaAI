import { Chip } from '@/features/location/location-picker';
import { useProfileStore } from '@/stores';
import type { DailyActivity, ExposureLevel, Occupation, PersonalProfile, Transport } from '@/types/domain';

export const OCCUPATIONS: { value: Occupation; label: string; emoji: string }[] = [
  { value: 'student', label: 'Pelajar / Mahasiswa', emoji: '🎓' },
  { value: 'office', label: 'Pekerja kantor', emoji: '💼' },
  { value: 'outdoor', label: 'Pekerja luar ruang', emoji: '👷' },
  { value: 'merchant', label: 'Pedagang', emoji: '🛒' },
  { value: 'other', label: 'Lainnya', emoji: '🙂' },
];
export const TRANSPORTS: { value: Transport; label: string; emoji: string }[] = [
  { value: 'motorcycle', label: 'Sepeda motor', emoji: '🛵' },
  { value: 'walking', label: 'Jalan kaki', emoji: '🚶' },
  { value: 'car', label: 'Mobil', emoji: '🚗' },
  { value: 'public', label: 'Transportasi umum', emoji: '🚌' },
];
export const EXPOSURES: { value: ExposureLevel; label: string }[] = [
  { value: 'low', label: 'Rendah' },
  { value: 'moderate', label: 'Sedang' },
  { value: 'high', label: 'Tinggi' },
];
export const ACTIVITIES: { value: DailyActivity; label: string }[] = [
  { value: 'indoor', label: 'Dominan dalam ruang' },
  { value: 'mixed', label: 'Campuran' },
  { value: 'outdoor', label: 'Dominan luar ruang' },
];

function Row<T extends string>({
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
      <p className="mb-1.5 text-[12px] font-semibold text-muted">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => (
          <Chip key={o.value} active={value === o.value} onClick={() => onChange(o.value)}>
            {o.emoji && <span aria-hidden>{o.emoji}</span>}
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
      <Row label="Pekerjaan" options={OCCUPATIONS} value={profile.occupation} onChange={set('occupation')} />
      <Row
        label="Transportasi harian"
        options={TRANSPORTS}
        value={profile.transport}
        onChange={set('transport')}
      />
      <Row
        label="Paparan luar ruang"
        options={EXPOSURES}
        value={profile.exposure}
        onChange={set('exposure')}
      />
      <Row
        label="Aktivitas harian"
        options={ACTIVITIES}
        value={profile.activity}
        onChange={set('activity')}
      />
    </div>
  );
}
