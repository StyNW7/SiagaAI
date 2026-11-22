import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router';
import { Toaster } from 'sonner';
import { registerSW } from 'virtual:pwa-register';
import { TooltipProvider } from '@/components/ui/overlays';
import { router } from '@/app/router';
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

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider delayDuration={200}>
        <RouterProvider router={router} />
        <Toaster
          position="top-center"
          richColors
          closeButton
          toastOptions={{ style: { fontFamily: 'var(--font-sans)', borderRadius: 14 } }}
        />
      </TooltipProvider>
    </QueryClientProvider>
  </StrictMode>,
);
