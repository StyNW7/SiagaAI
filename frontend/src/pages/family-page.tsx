import { zodResolver } from '@hookform/resolvers/zod';
import { HeartHandshake, Lock, Pencil, Plus, Sparkles, Trash2, Users } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { EmptyState } from '@/components/common/data-state';
import { AiPanel, AiThinking, PageHeader } from '@/components/common/layout-bits';
import { HazardIcon, RiskBadge, ScoreBar } from '@/components/common/risk';
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
import { sanitizeText } from '@/lib/utils';
import { useFamilyStore, useProfileStore } from '@/stores';
import type { AgeGroup, FamilyMember } from '@/types/domain';

const AGE: { value: AgeGroup; label: string; emoji: string }[] = [
  { value: 'infant', label: 'Balita (0–4)', emoji: '👶' },
  { value: 'child', label: 'Anak (5–12)', emoji: '🧒' },
  { value: 'teen', label: 'Remaja (13–17)', emoji: '🧑' },
  { value: 'adult', label: 'Dewasa', emoji: '🧑‍💼' },
  { value: 'elderly', label: 'Lansia (60+)', emoji: '👵' },
];
const AGE_EMOJI = Object.fromEntries(AGE.map((a) => [a.value, a.emoji]));
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
  high: { label: 'PRIORITAS TINGGI', variant: 'danger' as const },
  watch: { label: 'PANTAU', variant: 'warning' as const },
  normal: { label: 'NORMAL', variant: 'success' as const },
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

  const generate = () => {
    if (!context) return;
    plan.mutate(
      { context },
      { onSuccess: (r) => setLastPlan({ plan: r.output, provider: r.provider, createdAt: r.generatedAt }) },
    );
  };

  return (
    <div className="animate-fade-up">
      <PageHeader
        eyebrow={
          <span className="inline-flex items-center gap-1.5">
            <HeartHandshake className="size-3.5" /> Family Siaga
          </span>
        }
        title="Keselamatan keluarga"
        description={`Anak, lansia & anggota dengan paparan tinggi bisa terdampak lebih besar. Lihat prioritas setiap anggota keluarga di ${location.name}.`}
        actions={
          <>
            <Button variant="secondary" onClick={() => setEditing('new')}>
              <Plus /> Tambah anggota
            </Button>
            <Button
              variant="ai"
              onClick={generate}
              disabled={!context || members.length === 0 || plan.isPending}
            >
              <Sparkles /> Buat Rencana Keluarga
            </Button>
          </>
        }
      />

      <div className="grid gap-5 lg:grid-cols-12">
        <div className="min-w-0 lg:col-span-7">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Ikhtisar risiko keluarga</CardTitle>
                <p className="mt-1 text-[12.5px] text-muted">
                  Dihitung deterministik dari bahaya lokasi × kelompok usia & paparan
                </p>
              </div>
              <Badge variant="outline">
                <Users /> {members.length + 1} orang
              </Badge>
            </CardHeader>
            <CardContent>
              {!assessment ? (
                <Skeleton className="h-40" />
              ) : (
                <ul className="space-y-2">
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
                  icon={<Users className="size-5" />}
                  title="Tambahkan anggota keluarga"
                  description="Cukup label, hubungan, kelompok usia & paparan luar ruang — tanpa data medis."
                  action={
                    <Button onClick={() => setEditing('new')}>
                      <Plus /> Tambah anggota
                    </Button>
                  }
                />
              )}
              <p className="mt-4 flex items-center gap-1.5 text-[11.5px] text-muted">
                <Lock className="size-3" /> Data keluarga disimpan di perangkat Anda (dan di akun Anda bila
                masuk dengan Supabase).
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
                  <div key={m.name} className="rounded-xl bg-white p-3 ring-1 ring-indigo-100">
                    <p className="text-[13px] font-bold">{m.name}</p>
                    <ul className="mt-1 space-y-1 text-[13px] text-neutral-700">
                      {m.advice.map((a) => (
                        <li key={a}>· {a}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
              <h4 className="mt-4 text-[12px] font-bold uppercase tracking-wider text-muted">
                Persiapan rumah tangga
              </h4>
              <ul className="mt-1.5 space-y-1 text-[13px] text-neutral-700">
                {lastPlan.plan.household.map((a) => (
                  <li key={a}>✓ {a}</li>
                ))}
              </ul>
              <h4 className="mt-4 text-[12px] font-bold uppercase tracking-wider text-red-700">
                Jika kondisi memburuk
              </h4>
              <ul className="mt-1.5 space-y-1 text-[13px] text-neutral-700">
                {lastPlan.plan.ifWorsens.map((a) => (
                  <li key={a}>! {a}</li>
                ))}
              </ul>
            </AiPanel>
          ) : (
            <AiPanel title="Rencana aksi keluarga">
              <p className="text-[14px] leading-relaxed text-neutral-700">
                {members.length
                  ? 'SiagaAI akan menyusun saran per anggota dan persiapan rumah tangga berdasarkan prioritas di samping.'
                  : 'Tambahkan minimal satu anggota keluarga untuk membuat rencana keluarga.'}
              </p>
              <Button
                variant="ai"
                className="mt-4"
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
  return (
    <li className="flex items-center gap-3 rounded-xl border border-line p-3">
      <span
        className="grid size-11 shrink-0 place-items-center rounded-xl bg-neutral-100 text-xl"
        aria-hidden
      >
        {row.member.id === 'self' ? '🙋' : AGE_EMOJI[row.member.ageGroup]}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-[14px] font-semibold">{row.member.name}</p>
          <span className="text-[12px] text-muted">{row.member.relation}</span>
          <Badge variant={p.variant}>{p.label}</Badge>
        </div>
        <div className="mt-1.5 flex items-center gap-2">
          <ScoreBar score={row.score} level={row.level} className="max-w-40" />
          <span className="tabular text-[12px] font-semibold">{row.score}</span>
          <RiskBadge level={row.level} />
        </div>
        {row.reasons.length > 0 && <p className="mt-1 text-[11.5px] text-muted">{row.reasons.join(' · ')}</p>}
      </div>
      <HazardIcon hazard={row.primaryHazard} level={row.level} size="sm" className="hidden sm:grid" />
      <span className="sr-only">Bahaya utama: {HAZARDS[row.primaryHazard].label}</span>
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
                {a.emoji} {a.label}
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
      <p className="mb-1.5 text-[13px] font-semibold">{label}</p>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}
