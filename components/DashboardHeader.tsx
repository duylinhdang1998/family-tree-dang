import config from '@/app/config';
import HeaderMenu from '@/components/HeaderMenu';
import Image from 'next/image';
import Link from 'next/link';

export default function DashboardHeader() {
  return (
    <header className='sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border'>
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between'>
        <div className='flex items-center gap-4'>
          <Link href='/' className='flex items-baseline gap-2.5'>
            <span className='text-lg font-display font-bold tracking-tight text-foreground'>
              {config.siteName}
            </span>
            <span className='hidden sm:inline font-mono text-[10px] uppercase tracking-widest text-muted-foreground border border-border px-1.5 py-0.5'>
              Gia phả
            </span>
          </Link>
        </div>
        <div className='flex items-center gap-4'>
          <HeaderMenu />
        </div>
      </div>
    </header>
  );
}
