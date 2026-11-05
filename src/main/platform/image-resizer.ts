import { nativeImage } from 'electron';

export interface ImageResizer {
  size(jpeg: Uint8Array): { width: number; height: number };
  /** Resizes so the long side is `longSide` px and encodes as JPEG at `quality` (0–100). */
  resizeJpeg(jpeg: Uint8Array, longSide: number, quality: number): Uint8Array;
}

export const nativeImageResizer: ImageResizer = {
  size(jpeg) {
    return nativeImage.createFromBuffer(Buffer.from(jpeg)).getSize();
  },
  resizeJpeg(jpeg, longSide, quality) {
    const image = nativeImage.createFromBuffer(Buffer.from(jpeg));
    const { width, height } = image.getSize();
    const resized =
      width >= height
        ? image.resize({ width: longSide, quality: 'best' })
        : image.resize({ height: longSide, quality: 'best' });
    return new Uint8Array(resized.toJPEG(quality));
  },
};
