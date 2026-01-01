import { useModal } from '@lib/hooks/useModal';
import { Button } from '@components/ui/button';
import { NextImage } from '@components/ui/next-image';
import { Modal } from '@components/modal/modal';
import { ImageModal } from '@components/modal/image-modal';
import type { ImageData } from '@lib/types/file';

import type { JSX } from 'react';

type UserHomeCoverProps = {
  coverData?: ImageData | null;
};

export function UserHomeCover({ coverData }: UserHomeCoverProps): JSX.Element {
  const { open, openModal, closeModal } = useModal();

  return (
    <div className='mt-0.5 h-36 xs:h-48 sm:h-52'>
      <Modal open={open} closeModal={closeModal}>
        <ImageModal imageData={coverData as ImageData} previewCount={1} />
      </Modal>
      {coverData ? (
        <Button
          className='accent-tab relative h-full w-full rounded-none p-0 transition hover:brightness-75'
          onClick={openModal}
        >
          {/* Use native img for cover to avoid next/image optimization issues for external URLs */}
          <img
            src={coverData.src}
            alt={coverData.alt}
            className='absolute inset-0 h-full w-full object-cover'
            onError={(e) => {
              // if native img fails, fallback to NextImage
              (e.currentTarget as HTMLImageElement).style.display = 'none';
            }}
          />
          <NextImage
            useSkeleton
            layout='fill'
            imgClassName='object-cover'
            src={coverData.src}
            alt={coverData.alt}
            key={coverData.src}
          />
        </Button>
      ) : (
        <div className='h-full bg-light-line-reply dark:bg-dark-line-reply' />
      )}
    </div>
  );
}
