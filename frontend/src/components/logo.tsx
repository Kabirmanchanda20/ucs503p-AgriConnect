import Link from 'next/link';
import { cx } from '@/components/ui';

const LOGO_WIDTH = 1024;
const LOGO_HEIGHT = 682;

type LogoProps = {
  /** header: nav bar (~52px tall). hero: landing feature (~176px tall). */
  variant?: 'header' | 'hero';
  className?: string;
  linked?: boolean;
};

export function Logo({ variant = 'header', className, linked = true }: LogoProps) {
  const image = (
    // Plain img keeps PNG alpha intact and avoids stale /_next/image cache.
    <img
      src="/logo.png"
      alt="AgriConnect — smart farm-to-market and crop advisory platform"
      width={LOGO_WIDTH}
      height={LOGO_HEIGHT}
      decoding="async"
      fetchPriority={variant === 'header' ? 'high' : 'auto'}
      className={cx(
        'w-auto object-contain',
        variant === 'header' && 'h-11 max-w-[132px] sm:h-[52px] sm:max-w-[160px]',
        variant === 'hero' && 'h-36 max-w-[280px] sm:h-40 sm:max-w-[300px] md:h-44 md:max-w-[320px]',
        className,
      )}
    />
  );

  if (!linked) return image;

  return (
    <Link href="/" className="inline-flex shrink-0 items-center" aria-label="AgriConnect home">
      {image}
    </Link>
  );
}
