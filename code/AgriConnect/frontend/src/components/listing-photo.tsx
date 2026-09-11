'use client';

import { useState } from 'react';
import { cx } from '@/components/ui';

const LOCAL_CROP_PHOTOS: Record<string, string> = {
  onion: '/crops/onion.jpg',
  tomato: '/crops/tomato.jpg',
  wheat: '/crops/wheat.jpg',
  rice: '/crops/rice.jpg',
};

const DEFAULT_PHOTO = '/crops/wheat.jpg';

export function cropPhotoFallback(crop: string): string {
  const normalized = crop.trim().toLowerCase();
  if (LOCAL_CROP_PHOTOS[normalized]) return LOCAL_CROP_PHOTOS[normalized];

  for (const [key, url] of Object.entries(LOCAL_CROP_PHOTOS)) {
    if (normalized.includes(key)) return url;
  }

  return DEFAULT_PHOTO;
}

export function ListingPhoto({
  crop,
  src,
  className,
}: {
  crop: string;
  src?: string;
  className?: string;
}) {
  const fallback = cropPhotoFallback(crop);
  const [source, setSource] = useState<string>(src || fallback);

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={source}
      alt={crop}
      referrerPolicy="no-referrer"
      className={cx('h-full w-full object-cover', className)}
      onError={() => {
        if (source !== fallback) setSource(fallback);
      }}
    />
  );
}
