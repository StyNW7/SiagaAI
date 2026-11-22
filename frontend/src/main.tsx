import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router';
import { Toaster } from 'sonner';
import { registerSW } from 'virtual:pwa-register';
import { TooltipProvider } from '@/components/ui/overlays';
import { router } from '@/app/router';
import { usePreferencesSync, useResolvedTheme } from '@/features/preferences/theme';
import { useSettings } from '@/stores';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 2,
      retryDelay: (n) => Math.min(1000 * 2 ** n, 8000),
      networkMode: 'offlineFirst',
    },
  },
});

registerSW({ immediate: true });

/**
 * App shell. The router subtree is keyed by language so every bilingual string
 * (components, data modules, the risk engine) re-resolves instantly on switch.
 * Fetched data stays in the React Query cache, so nothing is re-downloaded.
 */
function App() {
  usePreferencesSync();
  const lang = useSettings((s) => s.lang);
  const theme = useResolvedTheme();
  return (
    <>
      <RouterProvider key={lang} router={router} />
      <Toaster
        position="top-center"
        richColors
        closeButton
        theme={theme}
        toastOptions={{ style: { fontFamily: 'var(--font-sans)', borderRadius: 14 } }}
      />
    </>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider delayDuration={200}>
        <App />
      </TooltipProvider>
    </QueryClientProvider>
  </StrictMode>,
);
