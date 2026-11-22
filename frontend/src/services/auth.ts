/**
 * Authentication.
 * - Supabase Auth (email/password) when configured.
 * - Otherwise a local-device account store (passwords hashed with SHA-256 via
 *   WebCrypto) so judges can exercise every authenticated flow offline.
 * The competition demo account always works (see README / proposal).
 */
import type { SessionUser } from '@/stores';
import { supabase } from './supabase/client';
import { t } from '@/lib/i18n';

export const DEMO_ACCOUNT = {
  email: 'demo@siagaai.id',
  password: 'SiagaAI2026!',
  name: 'Demo User',
} as const;

const LOCAL_KEY = 'siaga.accounts';

async function sha256(text: string) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`siagaai:${text}`));
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('');
}

type LocalAccount = { id: string; email: string; name: string; hash: string };
const readAccounts = (): LocalAccount[] => JSON.parse(localStorage.getItem(LOCAL_KEY) ?? '[]');
const writeAccounts = (a: LocalAccount[]) => localStorage.setItem(LOCAL_KEY, JSON.stringify(a));

export class AuthError extends Error {}

const isDemo = (email: string, password: string) =>
  email.trim().toLowerCase() === DEMO_ACCOUNT.email && password === DEMO_ACCOUNT.password;
const demoUser = (): SessionUser => ({
  id: 'demo-user',
  email: DEMO_ACCOUNT.email,
  name: DEMO_ACCOUNT.name,
  backend: 'local',
});

export async function signIn(email: string, password: string): Promise<SessionUser> {
  if (supabase) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (!error && data.user)
      return {
        id: data.user.id,
        email: data.user.email ?? email,
        name: (data.user.user_metadata?.name as string) ?? email.split('@')[0],
        backend: 'supabase',
      };
    // The demo account must always work for judging, even if not provisioned remotely.
    if (isDemo(email, password)) return demoUser();
    throw new AuthError(
      error?.message === 'Invalid login credentials'
        ? t('Email atau kata sandi salah.', 'Incorrect email or password.')
        : t('Gagal masuk. Coba lagi.', 'Sign-in failed. Please try again.'),
    );
  }
  if (isDemo(email, password)) return demoUser();
  const acc = readAccounts().find((a) => a.email === email.trim().toLowerCase());
  if (!acc || acc.hash !== (await sha256(password))) throw new AuthError(t('Email atau kata sandi salah.', 'Incorrect email or password.'));
  return { id: acc.id, email: acc.email, name: acc.name, backend: 'local' };
}

export async function signUp(name: string, email: string, password: string): Promise<SessionUser> {
  const normalized = email.trim().toLowerCase();
  if (supabase) {
    const { data, error } = await supabase.auth.signUp({
      email: normalized,
      password,
      options: { data: { name } },
    });
    if (error || !data.user) throw new AuthError(error?.message ?? t('Pendaftaran gagal.', 'Registration failed.'));
    return { id: data.user.id, email: normalized, name, backend: 'supabase' };
  }
  const accounts = readAccounts();
  if (accounts.some((a) => a.email === normalized) || normalized === DEMO_ACCOUNT.email)
    throw new AuthError(t('Email sudah terdaftar.', 'Email is already registered.'));
  const acc: LocalAccount = {
    id: crypto.randomUUID(),
    email: normalized,
    name,
    hash: await sha256(password),
  };
  writeAccounts([...accounts, acc]);
  return { id: acc.id, email: acc.email, name: acc.name, backend: 'local' };
}

/** Sends a password-reset email (Supabase only). */
export async function requestPasswordReset(email: string) {
  if (!supabase) throw new AuthError(
      t('Reset kata sandi hanya tersedia untuk akun cloud (Supabase).', 'Password reset is only available for cloud (Supabase) accounts.'),
    );
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
    redirectTo: `${window.location.origin}/auth`,
  });
  if (error)
    throw new AuthError(
      error.status === 429
        ? t('Terlalu banyak percobaan. Coba lagi nanti.', 'Too many attempts. Please try again later.')
        : t('Gagal mengirim email reset.', 'Failed to send the reset email.'),
    );
}

export async function signOut(user: SessionUser | null) {
  if (supabase && user?.backend === 'supabase') await supabase.auth.signOut();
}
