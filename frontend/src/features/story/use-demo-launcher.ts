import { useLocation, useNavigate } from 'react-router';
import { toast } from 'sonner';
import { loadAraPersona } from '@/services/demo';
import { useAssistantStore, useSettings } from '@/stores';
import { t, tx } from '@/lib/i18n';
import type { Feature } from './data';
import { useStoryReturn } from './story-return';

/**
 * Opens a live feature while remembering exactly where the reader was on the story page.
 * In demo mode the app opens as Ara (Palangka Raya, wildfire-season simulation) so every
 * feature shows a meaningful high-risk state; the scenario banner keeps it clearly labelled.
 */
export function useDemoLauncher() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const save = useStoryReturn((s) => s.save);
  const setScenario = useSettings((s) => s.setScenario);

  return (feature: Feature, demo: boolean) => {
    save({ path: pathname, label: feature.name, feature: feature.id, scrollY: window.scrollY });
    if (demo) {
      loadAraPersona();
      setScenario('karhutla-kalteng');
      toast.success(t('Dibuka sebagai Ara — simulasi karhutla', 'Opened as Ara — wildfire simulation'), {
        description: t('Posisimu di halaman Tentang sudah tersimpan.', 'Your place on the About page is saved.'),
      });
    }
    if (feature.ask) useAssistantStore.getState().ask(tx(feature.ask));
    navigate(feature.to);
  };
}
