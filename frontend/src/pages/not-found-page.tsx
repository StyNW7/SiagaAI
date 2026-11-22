import { Compass } from 'lucide-react';
import { Link } from 'react-router';
import { Ara } from '@/components/common/ara';
import { IndonesiaSilhouette, NusantaraBackdrop } from '@/components/common/brand';
import { Button } from '@/components/ui/button';
import { useDocumentTitle } from '@/hooks/use-misc';

export default function NotFoundPage() {
  useDocumentTitle('Halaman tidak ditemukan');
  return (
    <div className="relative grid min-h-dvh place-items-center overflow-hidden bg-canvas px-6 py-16 text-center">
      <NusantaraBackdrop />
      <IndonesiaSilhouette className="absolute inset-x-0 top-1/2 mx-auto w-[min(1100px,140%)] -translate-y-1/2 text-neutral-200/50" />
      <div className="relative flex flex-col items-center">
        <Ara pose="explore" size={190} float priority />
        <p className="telemetry mt-6 !text-brand">Error 404</p>
        <h1 className="text-balance mt-2 text-[32px] font-bold tracking-[-0.03em] sm:text-[40px]">
          Lokasi ini tidak ada di peta.
        </h1>
        <p className="mx-auto mt-3 max-w-sm text-[15px] text-muted">
          Ara sudah mencari ke mana-mana. Yuk kembali ke tempat yang aman.
        </p>
        <div className="mt-8 flex flex-col justify-center gap-2.5 sm:flex-row">
          <Button asChild size="lg">
            <Link to="/app">
              <Compass /> Buka Dashboard
            </Link>
          </Button>
          <Button asChild variant="secondary" size="lg">
            <Link to="/">Beranda</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
