import { Compass } from 'lucide-react';
import { Link } from 'react-router';
import { IndonesiaSilhouette, NusantaraBackdrop } from '@/components/common/brand';
import { Button } from '@/components/ui/button';

export default function NotFoundPage() {
  return (
    <div className="relative grid min-h-dvh place-items-center overflow-hidden px-6 text-center">
      <NusantaraBackdrop />
      <IndonesiaSilhouette className="absolute inset-x-0 top-1/2 mx-auto w-[min(1100px,140%)] -translate-y-1/2 text-neutral-200/60" />
      <div className="relative">
        <p className="text-[13px] font-bold uppercase tracking-widest text-brand">404</p>
        <h1 className="mt-2 text-3xl font-bold">Lokasi ini tidak ada di peta</h1>
        <p className="mx-auto mt-2 max-w-md text-muted">
          Halaman yang Anda cari tidak ditemukan. Mari kembali ke tempat yang aman.
        </p>
        <div className="mt-6 flex justify-center gap-2">
          <Button asChild>
            <Link to="/app">
              <Compass /> Buka Dashboard
            </Link>
          </Button>
          <Button asChild variant="secondary">
            <Link to="/">Beranda</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
