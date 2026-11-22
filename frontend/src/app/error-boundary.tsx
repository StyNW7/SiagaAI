import { RefreshCw } from 'lucide-react';
import { isRouteErrorResponse, Link, useRouteError } from 'react-router';
import { Ara } from '@/components/common/ara';
import { NusantaraBackdrop } from '@/components/common/brand';
import { Button } from '@/components/ui/button';

export function RouteError() {
  const error = useRouteError();
  const chunk = error instanceof Error && /dynamically imported module|Failed to fetch/i.test(error.message);
  return (
    <div className="relative grid min-h-dvh place-items-center overflow-hidden bg-canvas px-6 py-16 text-center">
      <NusantaraBackdrop />
      <div className="relative flex max-w-md flex-col items-center">
        <Ara pose={chunk ? 'run' : 'warning'} size={170} priority />
        <p className="telemetry mt-6 !text-brand">{chunk ? 'Pembaruan tersedia' : 'Terjadi kesalahan'}</p>
        <h1 className="mt-2 text-[28px] font-bold tracking-[-0.03em]">
          {chunk ? 'Versi baru SiagaAI tersedia' : 'Halaman gagal dimuat'}
        </h1>
        <p className="mt-2.5 text-[15px] text-muted">
          {chunk
            ? 'Muat ulang untuk mendapatkan pembaruan terbaru.'
            : isRouteErrorResponse(error)
              ? `${error.status} ${error.statusText}`
              : 'Maaf, ada kendala tak terduga. Datamu tetap aman di perangkat.'}
        </p>
        <div className="mt-8 flex justify-center gap-2.5">
          <Button onClick={() => window.location.reload()}>
            <RefreshCw /> Muat ulang
          </Button>
          <Button asChild variant="secondary">
            <Link to="/app">Dashboard</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
