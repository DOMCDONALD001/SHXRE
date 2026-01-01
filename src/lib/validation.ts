import { getRandomId } from './random';
import type { FilesWithId, FileWithId, ImagesPreview } from './types/file';

const IMAGE_EXTENSIONS = [
  'apng',
  'avif',
  'gif',
  'jpg',
  'jpeg',
  'jfif',
  'pjpeg',
  'pjp',
  'png',
  'svg',
  'webp'
] as const;

type ImageExtensions = (typeof IMAGE_EXTENSIONS)[number];

const MEDIA_EXTENSIONS = [
  ...IMAGE_EXTENSIONS,
  'mp4',
  'mov',
  'avi',
  'mkv',
  'webm'
] as const;

type MediaExtensions = (typeof MEDIA_EXTENSIONS)[number];

function isValidImageExtension(
  extension: string
): extension is ImageExtensions {
  return IMAGE_EXTENSIONS.includes(
    extension.split('.').pop()?.toLowerCase() as ImageExtensions
  );
}

function isValidMediaExtension(
  extension: string
): extension is MediaExtensions {
  return MEDIA_EXTENSIONS.includes(
    extension.split('.').pop()?.toLowerCase() as MediaExtensions
  );
}

export function isValidImage(name: string, bytes: number): boolean {
  return isValidImageExtension(name) && bytes < 20 * Math.pow(1024, 2);
}

const VIDEO_EXTENSIONS = ['mp4', 'mov', 'avi', 'mkv', 'webm'] as const;

type VideoExtensions = (typeof VIDEO_EXTENSIONS)[number];

function isValidVideoExtension(extension: string): extension is VideoExtensions {
  return VIDEO_EXTENSIONS.includes(
    extension.split('.').pop()?.toLowerCase() as VideoExtensions
  );
}

export function isValidMedia(name: string, size: number): boolean {
  const ext = name.split('.').pop()?.toLowerCase() ?? '';

  if (isValidImageExtension(name)) return isValidImage(name, size);

  if (isValidVideoExtension(ext)) {
    // Allow larger videos up to 200 MB
    return size < 200 * Math.pow(1024, 2);
  }

  return false;
}

export function isValidUsername(
  username: string,
  value: string
): string | null {
  if (value.length < 1) return 'Your username must be at least 1 character.';
  if (value.length > 15)
    return 'Your username must be shorter than 15 characters.';
  if (!/^\w+$/i.test(value))
    return "Your username can only contain letters, numbers and '_'.";
  if (!/[a-z]/i.test(value)) return 'Include a non-number character.';
  if (value === username) return 'This is your current username.';

  return null;
}

type ImagesData = {
  imagesPreviewData: ImagesPreview;
  selectedImagesData: FilesWithId;
};

type ImagesDataOptions = {
  currentFiles?: number;
  allowUploadingVideos?: boolean;
};

export function getImagesData(
  files: FileList | null,
  { currentFiles, allowUploadingVideos }: ImagesDataOptions = {}
): ImagesData | null {
  if (!files || !files.length) return null;
  const singleEditingMode = currentFiles === undefined;

  const incoming = Array.from(files);

  // If videos are allowed, enforce: either a single video (no other files),
  // or up to 4 images/GIFs total (including currentFiles).
  if (allowUploadingVideos) {
    const videos = incoming.filter((f) => isValidVideoExtension(f.name));
    const images = incoming.filter((f) => isValidImageExtension(f.name));

    if (videos.length > 0) {
      // only allow one video and no existing files
      if (videos.length > 1) return null;
      if ((currentFiles ?? 0) > 0) return null;
      const v = videos[0];
      if (!isValidMedia(v.name, v.size)) return null;
      var rawImages = [v];
    } else {
      // images path: ensure total doesn't exceed 4
      if ((currentFiles ?? 0) + images.length > 4) return null;
      rawImages = images.filter((f) => isValidImage(f.name, f.size));
    }
  } else {
    // videos not allowed, only images up to 4
    const images = incoming.filter((f) => isValidImageExtension(f.name));
    if ((currentFiles ?? 0) + images.length > 4) return null;
    var rawImages = images.filter((f) => isValidImage(f.name, f.size));
  }

  if (!rawImages || !rawImages.length) return null;

  const imagesId = rawImages.map(({ name }) => {
    const randomId = getRandomId();
    return {
      id: randomId,
      name: name === 'image.png' ? `${randomId}.png` : null
    };
  });

  const imagesPreviewData = rawImages.map((image, index) => ({
    id: imagesId[index].id,
    src: URL.createObjectURL(image),
    alt: imagesId[index].name ?? image.name,
    type: image.type
  }));

  const selectedImagesData = rawImages.map((image, index) =>
    renameFile(image, imagesId[index].id, imagesId[index].name)
  );

  return { imagesPreviewData, selectedImagesData };
}

function renameFile(
  file: File,
  newId: string,
  newName: string | null
): FileWithId {
  return Object.assign(
    newName
      ? new File([file], newName, {
          type: file.type,
          lastModified: file.lastModified
        })
      : file,
    { id: newId }
  );
}
