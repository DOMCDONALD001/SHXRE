import { useState } from 'react';
import Image from 'next/image';
import cn from 'clsx';
import type { JSX, ReactNode } from 'react';
import type { ImageProps } from 'next/image';

type NextImageProps = {
  alt: string;
  width?: string | number;
  children?: ReactNode;
  useSkeleton?: boolean;
  imgClassName?: string;
  previewCount?: number;
  blurClassName?: string;
} & ImageProps;

/**
 *
 * @description Must set width and height, if not add layout='fill'
 * @param useSkeleton add background with pulse animation, don't use it if image is transparent
 */
export function NextImage({
  src,
  alt,
  width,
  height,
  children,
  className,
  useSkeleton,
  imgClassName,
  previewCount,
  blurClassName,
  ...rest
}: NextImageProps): JSX.Element {
  const [loading, setLoading] = useState(!!useSkeleton);

  const handleLoad = (): void => setLoading(false);

  const isFill = (rest as any).fill === true || (rest as any).layout === 'fill';

  return (
    <figure
      style={isFill ? { position: 'relative' } : { width, height }}
      className={className}
    >
      <Image
        className={cn(
          imgClassName,
          loading
            ? blurClassName ??
                'animate-pulse bg-light-secondary dark:bg-dark-secondary'
            : previewCount === 1
            ? 'rounded-lg object-contain'
            : 'object-cover'
        )}
        src={src}
        // when using fill, Next/Image must not receive width/height
        {...(isFill ? {} : { width, height })}
        alt={alt}
        onLoadingComplete={handleLoad}
        {...rest}
        sizes='100vw'
        // do not override height when using fill
        style={isFill ? { width: '100%', maxWidth: '100%', maxHeight: '100%' } : {
          height: 'auto',
          width: '100%',
          maxWidth: '100%',
          maxHeight: '100%'
        }}
      />
      {children}
    </figure>
  );
}
