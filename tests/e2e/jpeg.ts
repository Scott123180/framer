import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';

/** Reads the pixel size from a JPEG's SOF0 (baseline) or SOF2 (progressive) marker. */
export async function readJpegSize(path: string): Promise<{ width: number; height: number }> {
  const b = await readFile(path);
  let i = 2;
  while (i < b.length) {
    if (b[i] !== 0xff) throw new Error(`Bad JPEG marker at ${i}`);
    const marker = b[i + 1]!;
    const length = b.readUInt16BE(i + 2);
    if (marker === 0xc0 || marker === 0xc2) {
      return { height: b.readUInt16BE(i + 5), width: b.readUInt16BE(i + 7) };
    }
    i += 2 + length;
  }
  throw new Error('No SOF marker found');
}

/** Reads the JFIF APP0 density. Units: 0 = aspect only, 1 = dots per inch, 2 = dots per cm. */
export async function readJfifDensity(path: string): Promise<{ units: number; x: number; y: number }> {
  const b = await readFile(path);
  if (b[2] !== 0xff || b[3] !== 0xe0 || b.toString('ascii', 6, 11) !== 'JFIF\0')
    throw new Error('No JFIF APP0');
  return { units: b[13]!, x: b.readUInt16BE(14), y: b.readUInt16BE(16) };
}

export async function sha256File(path: string): Promise<string> {
  return createHash('sha256')
    .update(await readFile(path))
    .digest('hex');
}
