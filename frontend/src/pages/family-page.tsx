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

const AGE: { value: AgeGroup; label: string; emoji: string }[] = [
  { value: 'infant', label: 'Balita (0–4)', emoji: '👶' },
  { value: 'child', label: 'Anak (5–12)', emoji: '🧒' },
  { value: 'teen', label: 'Remaja (13–17)', emoji: '🧑' },
  { value: 'adult', label: 'Dewasa', emoji: '🧑‍💼' },
  { value: 'elderly', label: 'Lansia (60+)', emoji: '👵' },
];
const AGE_LABEL: Record<string, string> = Object.fromEntries(
  AGE.map((a) => [a.value, a.label.split(' (')[0]]),
);
const RELATIONS = ['Ayah', 'Ibu', 'Anak', 'Kakek', 'Nenek', 'Pasangan', 'Saudara', 'Lainnya'];

const schema = z.object({
  name: z.string().trim().min(1, 'Isi nama atau label').max(40, 'Maksimal 40 karakter'),
  relation: z.string().min(1, 'Pilih hubungan'),
  ageGroup: z.enum(['infant', 'child', 'teen', 'adult', 'elderly']),
  activity: z.enum(['indoor', 'mixed', 'outdoor']),
  exposure: z.enum(['low', 'moderate', 'high']),
});
type Values = z.infer<typeof schema>;

const PRIORITY = {
  high: { label: 'Prioritas', variant: 'danger' as const },
  watch: { label: 'Pantau', variant: 'warning' as const },
  normal: { label: 'Normal', variant: 'success' as const },
};

export default function FamilyPage() {
  useDocumentTitle('Keluarga');
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
        title="Keselamatan keluarga"
        description={`Prioritas tiap anggota keluarga di ${location.name}.`}
        actions={
          <>
            <Button variant="secondary" onClick={() => setEditing('new')}>
              <Plus /> Tambah anggota
            </Button>
            <Button onClick={generate} disabled={!context || members.length === 0 || plan.isPending}>
              <Sparkles /> Rencana Keluarga
            </Button>
          </>
        }
      />

      {/* Status strip */}
      <section className="relative mb-6 overflow-hidden rounded-[18px] border border-line bg-white shadow-soft">
        <div className="bg-topo absolute inset-0 opacity-[0.04]" aria-hidden />
        <div className="relative grid items-center gap-6 p-6 sm:grid-cols-[1fr_auto] sm:px-8 sm:py-6">
          <div>
            <p className="data-label">Status kesiapsiagaan keluarga</p>
            <dl className="mt-4 flex flex-wrap gap-x-12 gap-y-4">
              <div>
                <dd className="display-metric text-[52px]">{rows.length || members.length + 1}</dd>
                <dt className="telemetry mt-2">Anggota</dt>
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
                <dt className="telemetry mt-2">Perlu perhatian</dt>
              </div>
              <div>
                <dd className="display-metric text-[52px]">{highest ? highest.score : '–'}</dd>
                <dt className="telemetry mt-2">Skor tertinggi</dt>
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
                <CardTitle>Papan pemantauan</CardTitle>
                <p className="mt-1 text-[12.5px] text-muted">Bahaya lokasi × usia & paparan</p>
              </div>
              <Badge variant="outline">
                <Users /> {members.length + 1} orang
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
                  title="Tambahkan anggota keluarga"
                  description="Cukup label, usia & paparan — tanpa data medis."
                  action={
                    <Button onClick={() => setEditing('new')}>
                      <Plus /> Tambah anggota
                    </Button>
                  }
                />
              )}
              <p className="telemetry mt-5 flex items-center gap-1.5 normal-case tracking-normal">
                <Lock className="size-3" /> Tersimpan di perangkatmu (dan akun Supabase bila masuk)
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="min-w-0 lg:col-span-5">
          {plan.isPending ? (
            <AiPanel title="Rencana aksi keluarga">
              <AiThinking
                steps={[
                  'Mengidentifikasi anggota prioritas',
                  'Menyesuaikan saran per kelompok usia',
                  'Menyusun persiapan rumah tangga',
                ]}
              />
            </AiPanel>
          ) : lastPlan ? (
            <AiPanel
              title="Rencana aksi keluarga"
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
              <h4 className="data-label mt-5">Persiapan rumah tangga</h4>
              <ul className="mt-1.5 space-y-1 text-[13px] text-neutral-700">
                {lastPlan.plan.household.map((a) => (
                  <li key={a}>✓ {a}</li>
                ))}
              </ul>
              <h4 className="data-label mt-5 !text-risk-critical">Jika kondisi memburuk</h4>
              <ul className="mt-1.5 space-y-1 text-[13px] text-neutral-700">
                {lastPlan.plan.ifWorsens.map((a) => (
                  <li key={a}>! {a}</li>
                ))}
              </ul>
            </AiPanel>
          ) : (
            <AiPanel title="Rencana aksi keluarga">
              <AraSays pose="kit" size={96}>
                {members.length
                  ? 'Aku bisa susun saran per anggota & persiapan rumah.'
                  : 'Tambahkan minimal satu anggota keluarga dulu, ya.'}
              </AraSays>
              <Button
                variant="ai"
                className="mt-4 w-full"
                onClick={generate}
                disabled={!context || members.length === 0}
              >
                <Sparkles /> Buat Rencana Keluarga
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
          toast.success(editing === 'new' ? 'Anggota keluarga ditambahkan' : 'Perubahan disimpan');
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
  const p = PRIORITY[row.priority];
  const tone =
    row.priority === 'high'
      ? 'bg-brand text-white'
      : row.priority === 'watch'
        ? 'bg-[#FAEBCC] text-[#8A5A0B]'
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
            {row.member.relation} · {AGE_LABEL[row.member.ageGroup] ?? ''}
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
      <span className="sr-only">Bahaya utama: {HAZARDS[row.primaryHazard].label}</span>
      <div className="flex shrink-0">
        {onEdit && (
          <Button variant="ghost" size="icon-sm" onClick={onEdit} aria-label={`Ubah ${row.member.name}`}>
            <Pencil />
          </Button>
        )}
        {onRemove && (
          <Button variant="ghost" size="icon-sm" onClick={onRemove} aria-label={`Hapus ${row.member.name}`}>
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
        title={member === 'new' ? 'Tambah anggota keluarga' : 'Ubah anggota keluarga'}
        description="Hanya informasi minimum yang diperlukan untuk menilai kerentanan."
      >
        <form onSubmit={form.handleSubmit(onSave)} className="space-y-4" noValidate>
          <div>
            <Label htmlFor="m-name">Nama atau label</Label>
            <Input id="m-name" placeholder="mis. Ibu, Adik Rafa" {...form.register('name')} />
            <FieldError>{form.formState.errors.name?.message}</FieldError>
          </div>
          <Group label="Hubungan">
            {RELATIONS.map((r) => (
              <Chip key={r} active={v.relation === r} onClick={() => form.setValue('relation', r)}>
                {r}
              </Chip>
            ))}
          </Group>
          <Group label="Kelompok usia">
            {AGE.map((a) => (
              <Chip
                key={a.value}
                active={v.ageGroup === a.value}
                onClick={() => form.setValue('ageGroup', a.value)}
              >
                {a.label}
              </Chip>
            ))}
          </Group>
          <Group label="Aktivitas harian">
            {(
              [
                ['indoor', 'Dalam ruang'],
                ['mixed', 'Campuran'],
                ['outdoor', 'Luar ruang'],
              ] as const
            ).map(([val, label]) => (
              <Chip key={val} active={v.activity === val} onClick={() => form.setValue('activity', val)}>
                {label}
              </Chip>
            ))}
          </Group>
          <Group label="Paparan luar ruang">
            {(
              [
                ['low', 'Rendah'],
                ['moderate', 'Sedang'],
                ['high', 'Tinggi'],
              ] as const
            ).map(([val, label]) => (
              <Chip key={val} active={v.exposure === val} onClick={() => form.setValue('exposure', val)}>
                {label}
              </Chip>
            ))}
          </Group>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              Batal
            </Button>
            <Button type="submit">Simpan</Button>
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
