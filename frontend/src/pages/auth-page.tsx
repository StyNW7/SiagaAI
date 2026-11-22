import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, ArrowRight, Eye, EyeOff, KeyRound, Loader2, LogIn, UserPlus } from 'lucide-react';
import { forwardRef, useState, type InputHTMLAttributes } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { toast } from 'sonner';
import { z } from 'zod';
import { Ara } from '@/components/common/ara';
import { IndonesiaSilhouette, Logo, LogoMark, NusantaraBackdrop } from '@/components/common/brand';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/overlays';
import { FieldError, Input, Label } from '@/components/ui/primitives';
import { useAlerts } from '@/features/alerts/use-alerts';
import { useDocumentTitle, useNow } from '@/hooks/use-misc';
import { formatTime } from '@/lib/format';
import { RISK_LEVELS } from '@/lib/risk-levels';
import { cn } from '@/lib/utils';
import { AuthError, DEMO_ACCOUNT, requestPasswordReset, signIn, signUp } from '@/services/auth';
import { seedDemoWorkspace } from '@/services/demo';
import { isSupabaseEnabled } from '@/services/supabase/client';
import { requestOnboarding } from '@/features/onboarding/onboarding';
import { useAuthStore, useProfileStore } from '@/stores';
import { PreferenceToggles } from '@/features/preferences/toggles';
import { t } from '@/lib/i18n';

// Validation messages are functions so they follow the active language.
const loginSchema = z.object({
  email: z.email({ error: () => t('Email tidak valid', 'Invalid email') }),
  password: z.string().min(6, { error: () => t('Minimal 6 karakter', 'At least 6 characters') }),
});
const registerSchema = loginSchema
  .extend({
    name: z
      .string()
      .trim()
      .min(2, { error: () => t('Isi nama Anda', 'Enter your name') })
      .max(40),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, {
    error: () => t('Kata sandi tidak sama', 'Passwords do not match'),
    path: ['confirm'],
  });

export default function AuthPage() {
  useDocumentTitle(t('Masuk', 'Sign in'));
  const [params] = useSearchParams();
  const next = params.get('next')?.startsWith('/') ? params.get('next')! : '/app';
  const navigate = useNavigate();
  const setUser = useAuthStore((s) => s.setUser);
  const [tab, setTab] = useState(params.get('mode') === 'register' ? 'register' : 'login');
  const [demoFilled, setDemoFilled] = useState(false);

  const login = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });
  const register = useForm<z.infer<typeof registerSchema>>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: '', email: '', password: '', confirm: '' },
  });

  const done = (name: string) => {
    toast.success(t(`Selamat datang, ${name}!`, `Welcome, ${name}!`));
    navigate(next, { replace: true });
  };

  const onLogin = login.handleSubmit(async (v) => {
    try {
      const u = await signIn(v.email, v.password);
      setUser(u);
      if (u.email === DEMO_ACCOUNT.email) seedDemoWorkspace();
      done(u.name);
    } catch (e) {
      login.setError('root', { message: e instanceof AuthError ? e.message : t('Gagal masuk.', 'Sign-in failed.') });
    }
  });

  const onRegister = register.handleSubmit(async (v) => {
    try {
      const u = await signUp(v.name, v.email, v.password);
      setUser(u);
      useProfileStore.getState().update({ displayName: v.name.split(' ')[0].slice(0, 30) });
      requestOnboarding();
      done(u.name);
    } catch (e) {
      register.setError('root', {
        message: e instanceof AuthError ? e.message : t('Pendaftaran gagal.', 'Registration failed.'),
      });
    }
  });

  const forgot = async () => {
    const email = login.getValues('email');
    if (!z.email().safeParse(email).success) {
      login.setError('email', {
        message: t('Isi email dulu untuk reset kata sandi', 'Enter your email first to reset your password'),
      });
      return;
    }
    try {
      await requestPasswordReset(email);
      toast.success(t('Email reset terkirim', 'Reset email sent'), {
        description: t('Periksa kotak masuk Anda.', 'Check your inbox.'),
      });
    } catch (e) {
      toast.error(e instanceof AuthError ? e.message : t('Gagal mengirim email reset.', 'Failed to send the reset email.'));
    }
  };

  const useDemo = () => {
    setTab('login');
    login.reset({ email: DEMO_ACCOUNT.email, password: DEMO_ACCOUNT.password });
    setDemoFilled(true);
  };

  return (
    <div className="relative grid min-h-dvh bg-canvas lg:grid-cols-[55fr_45fr]">
      <StoryPanel />

      <div className="relative flex flex-col px-5 pb-10 pt-6 sm:px-10 lg:px-14 lg:py-10">
        <div className="hidden items-center justify-between lg:flex">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-muted transition-colors hover:text-ink"
          >
            <ArrowLeft className="size-4" /> {t('Beranda', 'Home')}
          </Link>
          <div className="flex items-center gap-4">
            <Link to="/app" className="text-[13px] font-semibold text-ink underline-offset-4 hover:underline">
              {t('Lanjut tanpa akun', 'Continue without an account')}
            </Link>
            <PreferenceToggles />
          </div>
        </div>

        <div className="mx-auto flex w-full max-w-[400px] flex-1 flex-col justify-center py-6">
          <LogoMark className="mb-6 hidden size-10 lg:block" />
          <h1 className="text-[30px] font-bold leading-tight tracking-[-0.03em]">
            {tab === 'login' ? t('Selamat datang kembali.', 'Welcome back.') : t('Buat akun SiagaAI.', 'Create a SiagaAI account.')}
          </h1>
          <p className="mt-2 text-[14px] text-muted">
            {tab === 'login'
              ? t('Simpan profil, keluarga & lokasi pentingmu.', 'Save your profile, family & important locations.')
              : t('Gratis. Sinkronkan rencana & lokasi di semua perangkat.', 'Free. Sync plans & locations across all your devices.')}
          </p>

          <button
            type="button"
            onClick={useDemo}
            className={cn(
              'group mt-7 flex w-full items-center gap-3.5 rounded-[14px] border p-3.5 text-left transition-all',
              demoFilled
                ? 'border-risk-safe/30 bg-[var(--risk-safe-soft)]'
                : 'border-dashed border-line-strong bg-surface hover:border-brand/40 hover:bg-brand-pale',
            )}
          >
            <span
              className={cn(
                'grid size-10 shrink-0 place-items-center rounded-full',
                demoFilled ? 'bg-risk-safe text-white' : 'bg-brand-soft text-brand',
              )}
            >
              <KeyRound className="size-[18px]" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[14px] font-bold text-ink">
                {demoFilled
                  ? t('Akun demo terisi — tekan Masuk', 'Demo account filled in — press Sign in')
                  : t('Gunakan akun demo', 'Use the demo account')}
              </span>
              <span className="block truncate font-mono text-[11px] text-muted">
                {DEMO_ACCOUNT.email} · {DEMO_ACCOUNT.password}
              </span>
            </span>
            <ArrowRight className="size-4 shrink-0 text-subtle transition-transform group-hover:translate-x-0.5" />
          </button>

          <div className="my-6 flex items-center gap-3" aria-hidden>
            <span className="h-px flex-1 bg-line" />
            <span className="telemetry">{t('atau', 'or')}</span>
            <span className="h-px flex-1 bg-line" />
          </div>

          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">{t('Masuk', 'Sign in')}</TabsTrigger>
              <TabsTrigger value="register">{t('Daftar', 'Register')}</TabsTrigger>
            </TabsList>
            <TabsContent value="login">
              <form onSubmit={onLogin} className="mt-6 space-y-4" noValidate>
                <div>
                  <Label htmlFor="l-email">Email</Label>
                  <Input
                    id="l-email"
                    type="email"
                    autoComplete="email"
                    placeholder={t('nama@email.com', 'name@email.com')}
                    {...login.register('email')}
                  />
                  <FieldError>{login.formState.errors.email?.message}</FieldError>
                </div>
                <div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="l-pass">{t('Kata sandi', 'Password')}</Label>
                    <button
                      type="button"
                      onClick={forgot}
                      className="mb-1.5 text-[12.5px] font-semibold text-muted underline-offset-4 hover:text-ink hover:underline"
                    >
                      {t('Lupa kata sandi?', 'Forgot password?')}
                    </button>
                  </div>
                  <PasswordInput
                    id="l-pass"
                    autoComplete="current-password"
                    {...login.register('password')}
                  />
                  <FieldError>{login.formState.errors.password?.message}</FieldError>
                </div>
                {login.formState.errors.root?.message && (
                  <p
                    role="alert"
                    className="rounded-lg border border-risk-critical/20 bg-[var(--risk-critical-soft)] px-3 py-2.5 text-[13px] font-medium text-[var(--risk-critical-text)]"
                  >
                    {login.formState.errors.root.message}
                  </p>
                )}
                <Button type="submit" className="w-full" size="lg" disabled={login.formState.isSubmitting}>
                  {login.formState.isSubmitting ? <Loader2 className="animate-spin" /> : <LogIn />} {t('Masuk', 'Sign in')}
                </Button>
              </form>
            </TabsContent>
            <TabsContent value="register">
              <form onSubmit={onRegister} className="mt-6 space-y-4" noValidate>
                <div>
                  <Label htmlFor="r-name">{t('Nama lengkap', 'Full name')}</Label>
                  <Input
                    id="r-name"
                    autoComplete="name"
                    placeholder={t('Nama Anda', 'Your name')}
                    {...register.register('name')}
                  />
                  <FieldError>{register.formState.errors.name?.message}</FieldError>
                </div>
                <div>
                  <Label htmlFor="r-email">Email</Label>
                  <Input
                    id="r-email"
                    type="email"
                    autoComplete="email"
                    placeholder={t('nama@email.com', 'name@email.com')}
                    {...register.register('email')}
                  />
                  <FieldError>{register.formState.errors.email?.message}</FieldError>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="r-pass">{t('Kata sandi', 'Password')}</Label>
                    <PasswordInput
                      id="r-pass"
                      autoComplete="new-password"
                      {...register.register('password')}
                    />
                    <FieldError>{register.formState.errors.password?.message}</FieldError>
                  </div>
                  <div>
                    <Label htmlFor="r-confirm">{t('Ulangi', 'Confirm')}</Label>
                    <PasswordInput
                      id="r-confirm"
                      autoComplete="new-password"
                      {...register.register('confirm')}
                    />
                    <FieldError>{register.formState.errors.confirm?.message}</FieldError>
                  </div>
                </div>
                {register.formState.errors.root?.message && (
                  <p
                    role="alert"
                    className="rounded-lg border border-risk-critical/20 bg-[var(--risk-critical-soft)] px-3 py-2.5 text-[13px] font-medium text-[var(--risk-critical-text)]"
                  >
                    {register.formState.errors.root.message}
                  </p>
                )}
                <Button type="submit" className="w-full" size="lg" disabled={register.formState.isSubmitting}>
                  {register.formState.isSubmitting ? <Loader2 className="animate-spin" /> : <UserPlus />}{' '}
                  {t('Buat akun', 'Create account')}
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          <p className="mt-6 flex items-center gap-2 font-mono text-[10.5px] uppercase tracking-[0.06em] text-subtle">
            <span
              className={cn('size-1.5 rounded-full', isSupabaseEnabled ? 'bg-risk-safe' : 'bg-risk-moderate')}
            />
            {isSupabaseEnabled
              ? t('Supabase Auth · tersinkron aman', 'Supabase Auth · securely synced')
              : t('Mode perangkat · disimpan di browser', 'Device mode · stored in the browser')}
          </p>
          <Link
            to="/app"
            className="mt-6 text-center text-[13.5px] font-semibold text-ink underline-offset-4 hover:underline lg:hidden"
          >
            {t('Lanjut tanpa akun →', 'Continue without an account →')}
          </Link>
        </div>
      </div>
    </div>
  );
}

const PasswordInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>((props, ref) => {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input ref={ref} type={show ? 'text' : 'password'} className="pr-11" {...props} />
      <button
        type="button"
        onClick={() => setShow((v) => !v)}
        className="absolute right-1.5 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-lg text-subtle transition-colors hover:bg-neutral-100 hover:text-ink"
        aria-label={show ? t('Sembunyikan kata sandi', 'Hide password') : t('Tampilkan kata sandi', 'Show password')}
      >
        {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  );
});
PasswordInput.displayName = 'PasswordInput';

/** Left storytelling panel (desktop) / top banner (mobile) with a live intelligence sample. */
function StoryPanel() {
  const { view } = useAlerts();
  const now = useNow(60_000);
  const a = view.assessment;
  const lvl = a ? RISK_LEVELS[a.location.level] : null;
  return (
    <div className="relative flex min-h-[32vh] flex-col overflow-hidden bg-[#741116] text-white lg:sticky dark:bg-[#2a0a0c] lg:top-0 lg:h-dvh">
      <div
        className="absolute inset-0 bg-[radial-gradient(80%_60%_at_30%_20%,#A31319,transparent_70%)] dark:bg-[radial-gradient(80%_60%_at_30%_20%,#5c1015,transparent_70%)]"
        aria-hidden
      />
      <NusantaraBackdrop variant="red" />
      <IndonesiaSilhouette className="absolute -right-24 bottom-24 w-[120%] max-w-none text-white/[0.06]" />

      <div className="relative flex items-center justify-between p-5 sm:p-8 lg:p-12">
        <Link to="/" aria-label={t('SiagaAI beranda', 'SiagaAI home')} className="rounded-full bg-surface py-1.5 pl-1.5 pr-4">
          <Logo />
        </Link>
        <div className="flex items-center gap-3 lg:hidden">
          <PreferenceToggles tone="onDark" />
          <Link to="/app" className="text-[13px] font-semibold text-white/80 hover:text-white">
            {t('Lewati', 'Skip')}
          </Link>
        </div>
      </div>

      <div className="relative mt-auto grid items-end gap-6 px-5 sm:px-8 lg:grid-cols-[1fr_auto] lg:px-12">
        <div className="pb-8 pr-24 sm:pr-40 lg:pb-14 lg:pr-0">
          <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-white/55">
            Indonesia Disaster Intelligence
          </p>
          <h2 className="text-balance mt-3 max-w-md text-[28px] font-bold leading-[1.1] tracking-[-0.03em] sm:text-[36px] lg:text-[44px]">
            {t('Kesiapsiagaan dimulai dari pemahaman.', 'Preparedness starts with understanding.')}
          </h2>
          <div className="glass mt-8 hidden w-fit items-center gap-4 rounded-2xl !border-white/20 !bg-white/10 px-4 py-3 text-white lg:flex">
            <span className="relative flex size-2.5" aria-hidden>
              <span className="absolute inset-0 animate-ping rounded-full bg-white/60" />
              <span className="relative size-2.5 rounded-full bg-white" />
            </span>
            <span>
              <span className="block text-[14px] font-bold">{view.location.name}</span>
              <span className="block font-mono text-[10.5px] uppercase tracking-[0.06em] text-white/70">
                {lvl ? t(`Risiko ${lvl.label}`, `${lvl.label} risk`) : t('Menganalisis…', 'Analysing…')} ·{' '}
                {formatTime(now)}
              </span>
            </span>
          </div>
        </div>
        <Ara
          pose="hero-wave"
          size={420}
          priority
          className="-mb-2 hidden !h-[min(420px,56vh)] !w-auto self-end lg:block"
          alt={t('Ara menyapa', 'Ara says hello')}
        />
      </div>
      <Ara pose="wave" size={150} priority className="absolute -bottom-1 right-5 lg:hidden" />
    </div>
  );
}
