import { useLocation, useNavigate } from 'react-router';
import { toast } from 'sonner';
import { loadAraPersona } from '@/services/demo';
import { useAssistantStore } from '@/stores';
import { t, tx } from '@/lib/i18n';
import type { Feature } from './data';
import { useStoryReturn } from './story-return';

/**
 * Opens a live feature while remembering exactly where the reader was on the story page.
 * "As Ara" opens the app with Ara's profile & family at her home city, Palangka Raya —
 * always on live data.
 */
export function useDemoLauncher() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const save = useStoryReturn((s) => s.save);

  return (feature: Feature, demo: boolean) => {
    save({ path: pathname, label: feature.name, feature: feature.id, scrollY: window.scrollY });
    if (demo) {
      loadAraPersona();
      toast.success(t('Dibuka sebagai Ara — Palangka Raya, data live', 'Opened as Ara — Palangka Raya, live data'), {
        description: t('Posisimu di halaman Tentang sudah tersimpan.', 'Your place on the About page is saved.'),
      });
    }
    if (feature.ask) useAssistantStore.getState().ask(tx(feature.ask));
    navigate(feature.to);
  };
}
