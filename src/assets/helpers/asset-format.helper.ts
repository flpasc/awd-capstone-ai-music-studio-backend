import { AssetFormat } from '../entities/asset.entity';

const AUDIO_EXTENSIONS = new Set(['mp3', 'wav', 'm4a']);

const VIDEO_EXTENSIONS = new Set(['mp4', 'mov', 'webm', 'mpeg', 'wmv', 'mpg']);

const IMAGE_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'git', 'webp', 'svg']);

const getFileExtensions = (filename: string) => {
  const lastDotIndex = filename.lastIndexOf('.');
  if (lastDotIndex === -1) return '';
  return filename.slice(lastDotIndex + 1).toLowerCase();
};

export const getAssetFormat = (filename: string): AssetFormat => {
  const extension = getFileExtensions(filename);

  if (AUDIO_EXTENSIONS.has(extension)) {
    return AssetFormat.AUDIO;
  }

  if (VIDEO_EXTENSIONS.has(extension)) {
    return AssetFormat.VIDEO;
  }

  if (IMAGE_EXTENSIONS.has(extension)) {
    return AssetFormat.IMAGE;
  }

  return AssetFormat.UNKNOWN;
};
