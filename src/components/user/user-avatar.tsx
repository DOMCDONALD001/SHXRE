import Link from 'next/link';
import cn from 'clsx';
import { NextImage } from '@components/ui/next-image';

import type { JSX } from 'react';

type UserAvatarProps = {
  src: string;
  alt: string;
  size?: number;
  username?: string;
  className?: string;
  noLink?: boolean;
};

export function UserAvatar({
  src,
  alt,
  size,
  username,
  className
  , noLink
}: UserAvatarProps): JSX.Element {
  const pictureSize = size ?? 48;

  const content = (
    <NextImage
      useSkeleton
      imgClassName='rounded-full'
      width={pictureSize}
      height={pictureSize}
      src={src}
      alt={alt}
      key={src}
    />
  );

  if (noLink || !username) {
    return (
      <div
        className={cn('blur-picture flex self-start pointer-events-none', className)}
        tabIndex={-1}
      >
        {content}
      </div>
    );
  }

  return (
    <Link
      href={`/${username}`}
      className={cn('blur-picture flex self-start', className)}
      tabIndex={0}
    >
      {content}
    </Link>
  );
}
