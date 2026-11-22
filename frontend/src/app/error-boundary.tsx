import { RefreshCw } from 'lucide-react';
import { isRouteErrorResponse, Link, useRouteError } from 'react-router';
import { Button } from '@/components/ui/button';

export function RouteError() {
  const error = useRouteError();
  const chunk = error instanceof Error && /dynamically imported module|Failed to fetch/i.test(error.message);
  return (
    <div className="grid min-h-dvh place-items-center px-6 text-center">
      <div className="max-w-md">
        <p className="text-[13px] font-bold uppercase tracking-widest text-brand">Terjadi kesalahan</p>
        <h1 className="mt-2 text-2xl font-bold">
          {chunk ? 'Versi baru SiagaAI tersedia' : 'Halaman gagal dimuat'}
        </h1>
        <p className="mt-2 text-muted">
          {chunk
            ? 'Muat ulang untuk mendapatkan pembaruan terbaru.'
            : isRouteErrorResponse(error)
              ? `${error.status} ${error.statusText}`
              : 'Maaf, terjadi kesalahan tak terduga. Data Anda tetap aman di perangkat.'}
        </p>
        <div className="mt-6 flex justify-center gap-2">
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
