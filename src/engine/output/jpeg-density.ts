/** Sets the JFIF APP0 density to `ppi` dots per inch, inserting an APP0 segment if there is none. Pure. */
export function setJpegDensity(jpeg: Uint8Array, ppi: number): Uint8Array {
  if (jpeg[0] !== 0xff || jpeg[1] !== 0xd8) throw new Error('Not a JPEG (missing SOI marker)');
  const hasJfif =
    jpeg[2] === 0xff && jpeg[3] === 0xe0 && String.fromCharCode(...jpeg.subarray(6, 11)) === 'JFIF\0';
  if (hasJfif) {
    const out = new Uint8Array(jpeg);
    writeDensity(out, 2, ppi);
    return out;
  }
  const app0 = new Uint8Array([
    0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0, 0, 0, 0, 0, 0x00, 0x00,
  ]);
  writeDensity(app0, 0, ppi);
  const out = new Uint8Array(jpeg.length + app0.length);
  out.set(jpeg.subarray(0, 2), 0);
  out.set(app0, 2);
  out.set(jpeg.subarray(2), 2 + app0.length);
  return out;
}

/** `at` is the offset of the APP0 marker (FF E0). */
function writeDensity(buf: Uint8Array, at: number, ppi: number): void {
  buf[at + 11] = 1; // units: dots per inch
  buf[at + 12] = (ppi >> 8) & 0xff;
  buf[at + 13] = ppi & 0xff;
  buf[at + 14] = (ppi >> 8) & 0xff;
  buf[at + 15] = ppi & 0xff;
}
