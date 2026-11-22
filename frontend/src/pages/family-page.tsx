import { zodResolver } from '@hookform/resolvers/zod';
import { HeartHandshake, Lock, Pencil, Plus, Sparkles, Trash2, Users } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { Ara, AraSays } from '@/components/common/ara';
import { EmptyState } from '@/components/common/data-state';
import { AiPanel, AiThinking, PageHeader } from '@/components/common/layout-bits';
import { HazardIcon, ScoreBar } from '@/components/common/risk';
import { Button } from '@/components/ui/button';
import {
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  FieldError,
  Input,
  Label,
  Skeleton,
} from '@/components/ui/primitives';
import { Dialog, DialogContent } from '@/components/ui/overlays';
import { Chip } from '@/features/location/location-picker';
import { assessFamily, type FamilyMemberRisk } from '@/features/risk/engine/family';
import { useAiContext, useAiMutation } from '@/hooks/use-ai';
import { useDocumentTitle } from '@/hooks/use-misc';
import { useRiskAssessment } from '@/hooks/use-siaga-data';
import { HAZARDS } from '@/lib/risk-levels';
import { cn, sanitizeText } from '@/lib/utils';
import { useFamilyStore, useProfileStore } from '@/stores';
import type { AgeGroup, FamilyMember } from '@/types/domain';
import { t } from '@/lib/i18n';

const ages = (): { value: AgeGroup; label: string; emoji: string }[] => [
  { value: 'infant', label: t('Balita (0–4)', 'Toddler (0–4)'), emoji: '👶' },
  { value: 'child', label: t('Anak (5–12)', 'Child (5–12)'), emoji: '🧒' },
  { value: 'teen', label: t('Remaja (13–17)', 'Teen (13–17)'), emoji: '🧑' },
  { value: 'adult', label: t('Dewasa', 'Adult'), emoji: '🧑‍💼' },
  { value: 'elderly', label: t('Lansia (60+)', 'Older adult (60+)'), emoji: '👵' },
];
const ageLabel = (v: string) => ages().find((a) => a.value === v)?.label.split(' (')[0] ?? '';

/** Relation values are stored in Indonesian (stable keys); labels follow the active language. */
const RELATIONS = ['Ayah', 'Ibu', 'Anak', 'Kakek', 'Nenek', 'Pasangan', 'Saudara', 'Lainnya'];
const RELATION_EN: Record<string, string> = {
  Ayah: 'Father',
  Ibu: 'Mother',
  Anak: 'Child',
  Kakek: 'Grandfather',
  Nenek: 'Grandmother',
  Pasangan: 'Partner',
  Saudara: 'Sibling',
  Lainnya: 'Other',
};
const relationLabel = (r: string) => t(r, RELATION_EN[r] ?? r);

const schema = z.object({
  name: z
    .string()
    .trim()
    .min(1, { error: () => t('Isi nama atau label', 'Enter a name or label') })
    .max(40, { error: () => t('Maksimal 40 karakter', 'Maximum 40 characters') }),
  relation: z.string().min(1, { error: () => t('Pilih hubungan', 'Choose a relationship') }),
  ageGroup: z.enum(['infant', 'child', 'teen', 'adult', 'elderly']),
  activity: z.enum(['indoor', 'mixed', 'outdoor']),
  exposure: z.enum(['low', 'moderate', 'high']),
});
type Values = z.infer<typeof schema>;

const priorities = () => ({
  high: { label: t('Prioritas', 'Priority'), variant: 'danger' as const },
  watch: { label: t('Pantau', 'Watch'), variant: 'warning' as const },
  normal: { label: t('Normal', 'Normal'), variant: 'success' as const },
});

export default function FamilyPage() {
  useDocumentTitle(t('Keluarga', 'Family'));
  const view = useRiskAssessment();
  const { assessment, location } = view;
  const profile = useProfileStore((s) => s.profile);
  const { members, add, update, remove, lastPlan, setLastPlan } = useFamilyStore();
  const [editing, setEditing] = useState<FamilyMember | 'new' | null>(null);
  const context = useAiContext(view);
  const plan = useAiMutation('family-plan');

  const rows = useMemo(
    () => (assessment ? assessFamily(assessment.hazards, profile, members, assessment.personal) : []),
    [assessment, profile, members],
  );

  const attention = rows.filter((r) => r.priority !== 'normal').length;
  const highest = rows.length ? rows.reduce((a, b) => (b.score > a.score ? b : a)) : null;

  const generate = () => {
    if (!context) return;
    plan.mutate(
      { context },
      { onSuccess: (r) => setLastPlan({ plan: r.output, provider: r.provider, createdAt: r.generatedAt }) },
    );
  };

  return (
    <div>
      <PageHeader
        eyebrow={
          <span className="inline-flex items-center gap-1.5">
            <HeartHandshake className="size-3.5" /> Family Siaga
          </span>
        }
        title={t('Keselamatan keluarga', 'Family safety')}
        description={t(
          `Prioritas tiap anggota keluarga di ${location.name}.`,
          `Priority for each family member in ${location.name}.`,
        )}
        actions={
          <>
            <Button variant="secondary" onClick={() => setEditing('new')}>
              <Plus /> {t('Tambah anggota', 'Add member')}
            </Button>
            <Button onClick={generate} disabled={!context || members.length === 0 || plan.isPending}>
              <Sparkles /> {t('Rencana Keluarga', 'Family Plan')}
            </Button>
          </>
        }
      />

      {/* Status strip */}
      <section className="relative mb-6 overflow-hidden rounded-[18px] border border-line bg-surface shadow-soft">
        <div className="bg-topo absolute inset-0 opacity-[0.04]" aria-hidden />
        <div className="relative grid items-center gap-6 p-6 sm:grid-cols-[1fr_auto] sm:px-8 sm:py-6">
          <div>
            <p className="data-label">{t('Status kesiapsiagaan keluarga', 'Family preparedness status')}</p>
            <dl className="mt-4 flex flex-wrap gap-x-12 gap-y-4">
              <div>
                <dd className="display-metric text-[52px]">{rows.length || members.length + 1}</dd>
                <dt className="telemetry mt-2">{t('Anggota', 'Members')}</dt>
              </div>
              <div>
                <dd
                  className={cn(
                    'display-metric text-[52px]',
                    attention > 0 ? 'text-risk-high' : 'text-risk-safe',
                  )}
                >
                  {attention}
                </dd>
                <dt className="telemetry mt-2">{t('Perlu perhatian', 'Need attention')}</dt>
              </div>
              <div>
                <dd className="display-metric text-[52px]">{highest ? highest.score : '–'}</dd>
                <dt className="telemetry mt-2">{t('Skor tertinggi', 'Highest score')}</dt>
              </div>
            </dl>
          </div>
          <Ara pose="family" size={150} className="hidden sm:block" />
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-12">
        <div className="min-w-0 lg:col-span-7">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>{t('Papan pemantauan', 'Monitoring board')}</CardTitle>
                <p className="mt-1 text-[12.5px] text-muted">{t('Bahaya lokasi × usia & paparan', 'Location hazard × age & exposure')}</p>
              </div>
              <Badge variant="outline">
                <Users /> {members.length + 1} {t('orang', 'people')}
              </Badge>
            </CardHeader>
            <CardContent>
              {!assessment ? (
                <Skeleton className="h-40" />
              ) : (
                <ul className="divide-y divide-line">
                  {rows.map((r) => (
                    <MemberRow
                      key={r.member.id}
                      row={r}
                      onEdit={r.member.id === 'self' ? undefined : () => setEditing(r.member as FamilyMember)}
                      onRemove={r.member.id === 'self' ? undefined : () => remove(r.member.id)}
                    />
                  ))}
                </ul>
              )}
              {members.length === 0 && (
                <EmptyState
                  className="mt-4"
                  pose="family"
                  title={t('Tambahkan anggota keluarga', 'Add family members')}
                  description={t('Cukup label, usia & paparan — tanpa data medis.', 'Just a label, age & exposure — no medical data.')}
                  action={
                    <Button onClick={() => setEditing('new')}>
                      <Plus /> {t('Tambah anggota', 'Add member')}
                    </Button>
                  }
                />
              )}
              <p className="telemetry mt-5 flex items-center gap-1.5 normal-case tracking-normal">
                <Lock className="size-3" />{' '}
                {t('Tersimpan di perangkatmu (dan akun Supabase bila masuk)', 'Saved on your device (and your Supabase account when signed in)')}
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="min-w-0 lg:col-span-5">
          {plan.isPending ? (
            <AiPanel title={t('Rencana aksi keluarga', 'Family action plan')}>
              <AiThinking
                steps={[
                  t('Mengidentifikasi anggota prioritas', 'Identifying priority members'),
                  t('Menyesuaikan saran per kelompok usia', 'Tailoring advice by age group'),
                  t('Menyusun persiapan rumah tangga', 'Preparing household readiness'),
                ]}
              />
            </AiPanel>
          ) : lastPlan ? (
            <AiPanel
              title={t('Rencana aksi keluarga', 'Family action plan')}
              provider={lastPlan.provider}
              generatedAt={lastPlan.createdAt}
            >
              <p className="text-[14px] leading-relaxed text-neutral-700">{lastPlan.plan.summary}</p>
              <div className="mt-4 space-y-3">
                {lastPlan.plan.members.map((m) => (
                  <div key={m.name} className="rounded-xl border border-line bg-raised p-3.5">
                    <p className="text-[13px] font-bold">{m.name}</p>
                    <ul className="mt-1 space-y-1 text-[13px] text-neutral-700">
                      {m.advice.map((a) => (
                        <li key={a}>· {a}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
              <h4 className="data-label mt-5">{t('Persiapan rumah tangga', 'Household preparation')}</h4>
              <ul className="mt-1.5 space-y-1 text-[13px] text-neutral-700">
                {lastPlan.plan.household.map((a) => (
                  <li key={a}>✓ {a}</li>
                ))}
              </ul>
              <h4 className="data-label mt-5 !text-risk-critical">{t('Jika kondisi memburuk', 'If conditions worsen')}</h4>
              <ul className="mt-1.5 space-y-1 text-[13px] text-neutral-700">
                {lastPlan.plan.ifWorsens.map((a) => (
                  <li key={a}>! {a}</li>
                ))}
              </ul>
            </AiPanel>
          ) : (
            <AiPanel title={t('Rencana aksi keluarga', 'Family action plan')}>
              <AraSays pose="kit" size={96}>
                {members.length
                  ? t('Aku bisa susun saran per anggota & persiapan rumah.', 'I can put together advice per member & home preparation.')
                  : t('Tambahkan minimal satu anggota keluarga dulu, ya.', 'Add at least one family member first.')}
              </AraSays>
              <Button
                variant="ai"
                className="mt-4 w-full"
                onClick={generate}
                disabled={!context || members.length === 0}
              >
                <Sparkles /> {t('Buat Rencana Keluarga', 'Create Family Plan')}
              </Button>
            </AiPanel>
          )}
        </div>
      </div>

      <MemberDialog
        member={editing}
        onClose={() => setEditing(null)}
        onSave={(v) => {
          const clean = { ...v, name: sanitizeText(v.name, 40) };
          if (editing && editing !== 'new') update(editing.id, clean);
          else add(clean);
          toast.success(editing === 'new' ? t('Anggota keluarga ditambahkan', 'Family member added') : t('Perubahan disimpan', 'Changes saved'));
          setEditing(null);
        }}
      />
    </div>
  );
}

function MemberRow({
  row,
  onEdit,
  onRemove,
}: {
  row: FamilyMemberRisk;
  onEdit?: () => void;
  onRemove?: () => void;
}) {
  const p = priorities()[row.priority];
  const tone =
    row.priority === 'high'
      ? 'bg-brand text-white'
      : row.priority === 'watch'
        ? 'bg-[var(--risk-moderate-soft)] text-[var(--risk-moderate-text)]'
        : 'bg-neutral-100 text-neutral-700';
  return (
    <li className="flex items-center gap-4 py-4">
      <span
        className={cn('grid size-11 shrink-0 place-items-center rounded-full text-[15px] font-bold', tone)}
        aria-hidden
      >
        {row.member.name.trim().charAt(0).toUpperCase() || '?'}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <p className="truncate text-[15px] font-bold">{row.member.name}</p>
          <span className="font-mono text-[10.5px] uppercase tracking-[0.06em] text-subtle">
            {relationLabel(row.member.relation)} · {ageLabel(row.member.ageGroup)}
          </span>
        </div>
        <div className="mt-2 flex items-center gap-2.5">
          <Badge variant={p.variant}>{p.label}</Badge>
          <ScoreBar score={row.score} level={row.level} className="max-w-32" />
          <span className="font-mono text-[12px] font-semibold">{row.score}</span>
        </div>
        {row.reasons.length > 0 && <p className="mt-1.5 text-[12px] text-muted">{row.reasons.join(' · ')}</p>}
      </div>
      <HazardIcon hazard={row.primaryHazard} level={row.level} size="sm" className="hidden sm:grid" />
      <span className="sr-only">
        {t('Bahaya utama', 'Main hazard')}: {HAZARDS[row.primaryHazard].label}
      </span>
      <div className="flex shrink-0">
        {onEdit && (
          <Button variant="ghost" size="icon-sm" onClick={onEdit} aria-label={`${t('Ubah', 'Edit')} ${row.member.name}`}>
            <Pencil />
          </Button>
        )}
        {onRemove && (
          <Button variant="ghost" size="icon-sm" onClick={onRemove} aria-label={`${t('Hapus', 'Remove')} ${row.member.name}`}>
            <Trash2 />
          </Button>
        )}
      </div>
    </li>
  );
}

function MemberDialog({
  member,
  onClose,
  onSave,
}: {
  member: FamilyMember | 'new' | null;
  onClose: () => void;
  onSave: (v: Values) => void;
}) {
  const initial: Values =
    member && member !== 'new'
      ? member
      : { name: '', relation: 'Ibu', ageGroup: 'adult', activity: 'mixed', exposure: 'moderate' };
  const form = useForm<Values>({ resolver: zodResolver(schema), values: initial });
  const v = form.watch();
  return (
    <Dialog open={member != null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        title={member === 'new' ? t('Tambah anggota keluarga', 'Add family member') : t('Ubah anggota keluarga', 'Edit family member')}
        description={t(
          'Hanya informasi minimum yang diperlukan untuk menilai kerentanan.',
          'Only the minimum information needed to assess vulnerability.',
        )}
      >
        <form onSubmit={form.handleSubmit(onSave)} className="space-y-4" noValidate>
          <div>
            <Label htmlFor="m-name">{t('Nama atau label', 'Name or label')}</Label>
            <Input id="m-name" placeholder={t('mis. Ibu, Adik Rafa', 'e.g. Mum, little Rafa')} {...form.register('name')} />
            <FieldError>{form.formState.errors.name?.message}</FieldError>
          </div>
          <Group label={t('Hubungan', 'Relationship')}>
            {RELATIONS.map((r) => (
              <Chip key={r} active={v.relation === r} onClick={() => form.setValue('relation', r)}>
                {relationLabel(r)}
              </Chip>
            ))}
          </Group>
          <Group label={t('Kelompok usia', 'Age group')}>
            {ages().map((a) => (
              <Chip
                key={a.value}
                active={v.ageGroup === a.value}
                onClick={() => form.setValue('ageGroup', a.value)}
              >
                {a.label}
              </Chip>
            ))}
          </Group>
          <Group label={t('Aktivitas harian', 'Daily activity')}>
            {(
              [
                ['indoor', t('Dalam ruang', 'Indoor')],
                ['mixed', t('Campuran', 'Mixed')],
                ['outdoor', t('Luar ruang', 'Outdoor')],
              ] as const
            ).map(([val, label]) => (
              <Chip key={val} active={v.activity === val} onClick={() => form.setValue('activity', val)}>
                {label}
              </Chip>
            ))}
          </Group>
          <Group label={t('Paparan luar ruang', 'Outdoor exposure')}>
            {(
              [
                ['low', t('Rendah', 'Low')],
                ['moderate', t('Sedang', 'Moderate')],
                ['high', t('Tinggi', 'High')],
              ] as const
            ).map(([val, label]) => (
              <Chip key={val} active={v.exposure === val} onClick={() => form.setValue('exposure', val)}>
                {label}
              </Chip>
            ))}
          </Group>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              {t('Batal', 'Cancel')}
            </Button>
            <Button type="submit">{t('Simpan', 'Save')}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div role="group" aria-label={label}>
      <p className="mb-2 text-[13px] font-semibold">{label}</p>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}
