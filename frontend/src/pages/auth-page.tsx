import { zodResolver } from '@hookform/resolvers/zod';
import { KeyRound, Loader2, LogIn, UserPlus } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { toast } from 'sonner';
import { z } from 'zod';
import {
  IndonesiaSilhouette,
  Logo,
  LogoMark,
  MerahPutih,
  NusantaraBackdrop,
} from '@/components/common/brand';
import { Button } from '@/components/ui/button';
import { Card, FieldError, Input, Label } from '@/components/ui/primitives';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/overlays';
import { useDocumentTitle } from '@/hooks/use-misc';
import { AuthError, DEMO_ACCOUNT, signIn, signUp } from '@/services/auth';
import { isSupabaseEnabled } from '@/services/supabase/client';
import { useAuthStore } from '@/stores';

const loginSchema = z.object({
  email: z.email('Email tidak valid'),
  password: z.string().min(6, 'Minimal 6 karakter'),
});
const registerSchema = loginSchema.extend({ name: z.string().trim().min(2, 'Isi nama Anda').max(40) });

export default function AuthPage() {
  useDocumentTitle('Masuk');
  const [params] = useSearchParams();
  const next = params.get('next')?.startsWith('/') ? params.get('next')! : '/app';
  const navigate = useNavigate();
  const setUser = useAuthStore((s) => s.setUser);
  const [tab, setTab] = useState('login');

  const login = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });
  const register = useForm<z.infer<typeof registerSchema>>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: '', email: '', password: '' },
  });

  const done = (name: string) => {
    toast.success(`Selamat datang, ${name}!`);
    navigate(next, { replace: true });
  };

  const onLogin = login.handleSubmit(async (v) => {
    try {
      const u = await signIn(v.email, v.password);
      setUser(u);
      done(u.name);
    } catch (e) {
      login.setError('root', { message: e instanceof AuthError ? e.message : 'Gagal masuk.' });
    }
  });

  const onRegister = register.handleSubmit(async (v) => {
    try {
      const u = await signUp(v.name, v.email, v.password);
      setUser(u);
      done(u.name);
    } catch (e) {
      register.setError('root', { message: e instanceof AuthError ? e.message : 'Pendaftaran gagal.' });
    }
  });

  return (
    <div className="relative grid min-h-dvh lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-ink p-12 text-white lg:flex lg:flex-col">
        <div className="bg-batik absolute inset-0 opacity-[0.06] invert" aria-hidden />
        <IndonesiaSilhouette className="absolute -right-24 bottom-10 w-[130%] text-white/[0.07]" />
        <Link to="/" className="relative">
          <span className="inline-flex items-center gap-3 text-2xl font-extrabold">
            <span className="grid size-12 place-items-center rounded-2xl bg-white p-1.5 shadow-lift">
              <LogoMark className="size-full" />
            </span>
            <span>
              Siaga<span className="text-red-400">AI</span>
            </span>
          </span>
        </Link>
        <div className="relative mt-auto max-w-md">
          <MerahPutih />
          <h2 className="mt-4 text-3xl font-bold leading-tight">
            Simpan profil, keluarga & lokasi penting Anda.
          </h2>
          <p className="mt-3 text-white/70">
            Fitur inti SiagaAI tetap bisa dipakai tanpa akun. Login hanya untuk sinkronisasi, riwayat, dan
            mengirim laporan komunitas.
          </p>
        </div>
      </div>

      <div className="relative flex flex-col items-center justify-center px-4 py-10">
        <NusantaraBackdrop className="lg:hidden" />
        <Link to="/" className="relative mb-8 lg:hidden">
          <Logo />
        </Link>
        <Card className="relative w-full max-w-md p-6 sm:p-8">
          <h1 className="text-2xl font-bold">Masuk ke SiagaAI</h1>
          <p className="mt-1 text-[13.5px] text-muted">
            {isSupabaseEnabled
              ? 'Akun tersinkron aman dengan Supabase Auth.'
              : 'Mode perangkat: akun disimpan di browser ini.'}
          </p>

          <button
            type="button"
            onClick={() => {
              setTab('login');
              login.reset({ email: DEMO_ACCOUNT.email, password: DEMO_ACCOUNT.password });
            }}
            className="mt-5 flex w-full items-center gap-3 rounded-xl border border-indigo-200 bg-ai-soft/60 p-3 text-left transition-colors hover:bg-ai-soft"
          >
            <KeyRound className="size-5 shrink-0 text-ai" />
            <span className="text-[13px]">
              <b className="block text-indigo-950">Akun demo juri</b>
              <span className="text-indigo-900/80">
                {DEMO_ACCOUNT.email} · {DEMO_ACCOUNT.password}
              </span>
            </span>
          </button>

          <Tabs value={tab} onValueChange={setTab} className="mt-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Masuk</TabsTrigger>
              <TabsTrigger value="register">Daftar</TabsTrigger>
            </TabsList>
            <TabsContent value="login">
              <form onSubmit={onLogin} className="mt-5 space-y-4" noValidate>
                <div>
                  <Label htmlFor="l-email">Email</Label>
                  <Input id="l-email" type="email" autoComplete="email" {...login.register('email')} />
                  <FieldError>{login.formState.errors.email?.message}</FieldError>
                </div>
                <div>
                  <Label htmlFor="l-pass">Kata sandi</Label>
                  <Input
                    id="l-pass"
                    type="password"
                    autoComplete="current-password"
                    {...login.register('password')}
                  />
                  <FieldError>{login.formState.errors.password?.message}</FieldError>
                </div>
                <FieldError>{login.formState.errors.root?.message}</FieldError>
                <Button type="submit" className="w-full" size="lg" disabled={login.formState.isSubmitting}>
                  {login.formState.isSubmitting ? <Loader2 className="animate-spin" /> : <LogIn />} Masuk
                </Button>
              </form>
            </TabsContent>
            <TabsContent value="register">
              <form onSubmit={onRegister} className="mt-5 space-y-4" noValidate>
                <div>
                  <Label htmlFor="r-name">Nama</Label>
                  <Input id="r-name" autoComplete="name" {...register.register('name')} />
                  <FieldError>{register.formState.errors.name?.message}</FieldError>
                </div>
                <div>
                  <Label htmlFor="r-email">Email</Label>
                  <Input id="r-email" type="email" autoComplete="email" {...register.register('email')} />
                  <FieldError>{register.formState.errors.email?.message}</FieldError>
                </div>
                <div>
                  <Label htmlFor="r-pass">Kata sandi</Label>
                  <Input
                    id="r-pass"
                    type="password"
                    autoComplete="new-password"
                    {...register.register('password')}
                  />
                  <FieldError>{register.formState.errors.password?.message}</FieldError>
                </div>
                <FieldError>{register.formState.errors.root?.message}</FieldError>
                <Button type="submit" className="w-full" size="lg" disabled={register.formState.isSubmitting}>
                  {register.formState.isSubmitting ? <Loader2 className="animate-spin" /> : <UserPlus />} Buat
                  akun
                </Button>
              </form>
            </TabsContent>
          </Tabs>
          <Button asChild variant="link" className="mt-5 w-full">
            <Link to="/app">Lanjutkan tanpa akun →</Link>
          </Button>
        </Card>
      </div>
    </div>
  );
}
