import { describe, expect, it } from 'vitest';
import { setJpegDensity } from './jpeg-density';

const SOI = [0xff, 0xd8];
const EOI = [0xff, 0xd9];
const jfif = (units: number, x: number, y: number) => [
  0xff,
  0xe0,
  0x00,
  0x10,
  0x4a,
  0x46,
  0x49,
  0x46,
  0x00,
  0x01,
  0x01,
  units,
  x >> 8,
  x & 0xff,
  y >> 8,
  y & 0xff,
  0x00,
  0x00,
];
const dqt = [0xff, 0xdb, 0x00, 0x04, 0x00, 0x00];

const density = (b: Uint8Array) => ({ units: b[13], x: (b[14]! << 8) | b[15]!, y: (b[16]! << 8) | b[17]! });

describe('setJpegDensity', () => {
  it('patches an existing JFIF APP0 to 300 dots per inch', () => {
    const input = new Uint8Array([...SOI, ...jfif(0, 1, 1), ...dqt, ...EOI]);
    const out = setJpegDensity(input, 300);
    expect(density(out)).toEqual({ units: 1, x: 300, y: 300 });
    expect(out.length).toBe(input.length);
    expect(density(input)).toEqual({ units: 0, x: 1, y: 1 });
  });

  it('inserts a JFIF APP0 after SOI when there is none', () => {
    const input = new Uint8Array([...SOI, ...dqt, ...EOI]);
    const out = setJpegDensity(input, 300);
    expect(out.length).toBe(input.length + 18);
    expect([...out.slice(0, 2)]).toEqual(SOI);
    expect([...out.slice(2, 4)]).toEqual([0xff, 0xe0]);
    expect(String.fromCharCode(...out.slice(6, 11))).toBe('JFIF\0');
    expect(density(out)).toEqual({ units: 1, x: 300, y: 300 });
    expect([...out.slice(20)]).toEqual([...dqt, ...EOI]);
  });

  it('throws on non-JPEG input', () => {
    expect(() => setJpegDensity(new Uint8Array([0x89, 0x50, 0x4e, 0x47]), 300)).toThrow();
  });
});
