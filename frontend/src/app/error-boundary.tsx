import { RefreshCw } from 'lucide-react';
import { isRouteErrorResponse, Link, useRouteError } from 'react-router';
import { Ara } from '@/components/common/ara';
import { NusantaraBackdrop } from '@/components/common/brand';
import { Button } from '@/components/ui/button';
import { t } from '@/lib/i18n';

export function RouteError() {
  const error = useRouteError();
  const chunk = error instanceof Error && /dynamically imported module|Failed to fetch/i.test(error.message);
  return (
    <div className="relative grid min-h-safe-screen place-items-center overflow-hidden bg-canvas px-6 py-16 text-center">
      <NusantaraBackdrop />
      <div className="relative flex max-w-md flex-col items-center">
        <Ara pose={chunk ? 'run' : 'warning'} size={170} priority />
        <p className="telemetry mt-6 !text-brand">{chunk ? t('Pembaruan tersedia', 'Update available') : t('Terjadi kesalahan', 'Something went wrong')}</p>
        <h1 className="mt-2 text-[28px] font-bold tracking-[-0.03em]">
          {chunk
            ? t('Versi baru SiagaAI tersedia', 'A new version of SiagaAI is available')
            : t('Halaman gagal dimuat', 'The page failed to load')}
        </h1>
        <p className="mt-2.5 text-[15px] text-muted">
          {chunk
            ? t('Muat ulang untuk mendapatkan pembaruan terbaru.', 'Reload to get the latest update.')
            : isRouteErrorResponse(error)
              ? `${error.status} ${error.statusText}`
              : t(
                  'Maaf, ada kendala tak terduga. Datamu tetap aman di perangkat.',
                  'Sorry, something unexpected happened. Your data is still safe on this device.',
                )}
        </p>
        <div className="mt-8 flex justify-center gap-2.5">
          <Button onClick={() => window.location.reload()}>
            <RefreshCw /> {t('Muat ulang', 'Reload')}
          </Button>
          <Button asChild variant="secondary">
            <Link to="/app">Dashboard</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
