'use client';

import { cx } from '@/components/ui';

export function FarmerMascot({
  className,
  size = 88,
  title = 'Kisan, AgriConnect farm helper',
}: {
  className?: string;
  size?: number;
  title?: string;
}) {
  return (
    <span
      className={cx(
        'relative inline-flex shrink-0 overflow-hidden rounded-full bg-field shadow-[inset_0_0_0_1px_rgba(31,61,43,0.18)]',
        className,
      )}
      style={{ width: size, height: size }}
    >
      {/* Plain img keeps PNG detail sharp and avoids stale /_next/image cache. */}
      <img
        src="/kisan-mascot.png"
        alt={title}
        width={size}
        height={size}
        decoding="async"
        className="h-full w-full object-cover object-[center_18%]"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-full ring-1 ring-inset ring-harvest/35"
      />
    </span>
  );
}
