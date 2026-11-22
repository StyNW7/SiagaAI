import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import {
  pullUserData,
  pushProfile,
  replaceFamily,
  replaceLocations,
  upsertPlan,
} from '@/services/supabase/repository';
import { isSupabaseEnabled } from '@/services/supabase/client';
import { useAuthStore, useFamilyStore, useLocationStore, usePlanStore, useProfileStore } from '@/stores';
import { t } from '@/lib/i18n';

/**
 * Mirrors local stores to Supabase for signed-in Supabase users.
 * Local-first: the UI never waits on the network; failures are retried on next change.
 */
export function SyncManager() {
  const user = useAuthStore((s) => s.user);
  const pulled = useRef<string | null>(null);

  useEffect(() => {
    if (!isSupabaseEnabled || user?.backend !== 'supabase' || pulled.current === user.id) return;
    pulled.current = user.id;
    pullUserData(user.id)
      .then((d) => {
        if (d.profile) useProfileStore.setState({ profile: d.profile, customized: true });
        if (d.family.length) useFamilyStore.getState().setMembers(d.family);
        if (d.locations.length) useLocationStore.getState().setSaved(d.locations);
        if (d.plans.length) usePlanStore.getState().setPlans(d.plans);
        toast.success(t('Data akun tersinkron dari cloud', 'Account data synced from the cloud'));
      })
      .catch(() => toast.error(t('Sinkronisasi cloud gagal — data tetap tersimpan di perangkat', 'Cloud sync failed — your data is still saved on this device')));
  }, [user]);

  useEffect(() => {
    if (!isSupabaseEnabled || user?.backend !== 'supabase') return;
    const id = user.id;
    const timers = new Map<string, ReturnType<typeof setTimeout>>();
    const debounce = (key: string, fn: () => Promise<unknown>) => {
      clearTimeout(timers.get(key));
      timers.set(
        key,
        setTimeout(() => void fn().catch(() => undefined), 1200),
      );
    };
    const unsubs = [
      useProfileStore.subscribe((s) => debounce('profile', () => pushProfile(id, s.profile))),
      useFamilyStore.subscribe(
        (s, prev) => s.members !== prev.members && debounce('family', () => replaceFamily(id, s.members)),
      ),
      useLocationStore.subscribe(
        (s, prev) => s.saved !== prev.saved && debounce('locations', () => replaceLocations(id, s.saved)),
      ),
      usePlanStore.subscribe(
        (s, prev) =>
          s.plans !== prev.plans && s.plans[0] && debounce('plans', () => upsertPlan(id, s.plans[0])),
      ),
    ];
    return () => {
      timers.forEach(clearTimeout);
      unsubs.forEach((u) => u());
    };
  }, [user]);

  return null;
}
