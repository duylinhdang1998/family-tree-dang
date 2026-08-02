export interface FooterProps {
  className?: string;
}

export default function Footer({ className = '' }: FooterProps) {
  return (
    <footer
      className={`py-6 text-center font-mono text-[11px] uppercase tracking-widest text-muted-foreground ${className}`}
    >
      <div className='max-w-7xl mx-auto px-4'>
        <span>
          Được xây dựng bởi{' '}
          <a
            href='https://www.facebook.com/duy.linh.dang'
            target='_blank'
            rel='noopener noreferrer'
            className='text-foreground hover:underline'
          >
            Đặng Duy Linh
          </a>
        </span>
      </div>
    </footer>
  );
}
