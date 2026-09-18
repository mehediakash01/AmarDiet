/**
 * Compresses an image file in the browser before it ever leaves the
 * device — resizes to a max dimension and re-encodes as JPEG at a
 * moderate quality. This is what keeps a typical phone photo (several MB)
 * down to roughly 100-300KB before it's base64-encoded and sent to the
 * backend, which matters both for upload speed and for staying
 * comfortably under the server's own size ceiling.
 *
 * The server-side size check in ai.service.ts is the real enforcement
 * boundary — this is purely a client-side optimization, never trusted as
 * the only safeguard.
 */

const MAX_DIMENSION = 1024;
const JPEG_QUALITY = 0.8;

export interface CompressedImage {
  base64: string; // raw base64, no "data:image/jpeg;base64," prefix
  mimeType: 'image/jpeg';
}

export async function compressImageFile(file: File): Promise<CompressedImage> {
  const dataUrl = await readFileAsDataUrl(file);
  const image = await loadImage(dataUrl);

  const { width, height } = scaleToFit(image.width, image.height, MAX_DIMENSION);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Could not get canvas context for image compression');
  }
  ctx.drawImage(image, 0, 0, width, height);

  const compressedDataUrl = canvas.toDataURL('image/jpeg', JPEG_QUALITY);
  const base64 = compressedDataUrl.split(',')[1];

  if (!base64) {
    throw new Error('Failed to compress image');
  }

  return { base64, mimeType: 'image/jpeg' };
}

function scaleToFit(width: number, height: number, maxDimension: number) {
  if (width <= maxDimension && height <= maxDimension) {
    return { width, height };
  }
  const scale = maxDimension / Math.max(width, height);
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Could not read the selected file'));
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not load the selected image'));
    img.src = src;
  });
}
