import { describe, expect, it } from 'vitest';
import {
  BackgroundSpec,
  DesignSpec,
  Font,
  FontManifest,
  Hex,
  Library,
  MarginSetting,
  Orientation,
  PrintSize,
  Quote,
  SavedDesign,
} from './index';

const uuid = '3f1e7a52-9b1c-4c8e-8d0a-2b7f5e6a1c90';
const iso = '2026-11-04T12:00:00.000Z';

const style = {
  fontId: 'lora-400',
  fontFamily: 'Lora',
  background: { kind: 'solid', color: '#fafafa' },
  backgroundId: 'solid-snow',
  textColor: '#111111',
  attributionColor: '#333333',
  comboKey: 'lora-400|solid-snow',
} as const;

const spec = {
  specVersion: 1,
  engineVersion: '1.0.0',
  quote: { text: 'Hello', author: null },
  print: { size: '4x6', orientation: 'portrait', margin: { enabled: false } },
  style,
} as const;

const saved = {
  id: uuid,
  quoteId: null,
  spec,
  fileName: 'framer-hello-4x6-portrait.jpg',
  imagePath: `designs/${uuid}.jpg`,
  thumbPath: `designs/${uuid}.thumb.jpg`,
  pixelWidth: 1200,
  pixelHeight: 1800,
  byteSize: 1234,
  sha256: 'a'.repeat(64),
  savedAt: iso,
};

const quote = {
  id: uuid,
  text: 'Hello',
  author: null,
  dedupeKey: 'hello\u0000',
  createdAt: iso,
  lastUsedAt: iso,
};

const font = {
  id: 'playfair-display-700',
  family: 'Playfair Display',
  category: 'serif',
  weight: 700,
  style: 'normal',
  file: 'playfair-display/PlayfairDisplay-Bold.ttf',
  license: 'OFL-1.1',
  caseTransform: 'none',
};

describe('Hex', () => {
  it('accepts lowercase 6-digit hex', () => expect(Hex.safeParse('#a0b1c2').success).toBe(true));
  it.each(['#ABCDEF', '#abc', 'abcdef', '#abcdefg', '#12345'])('rejects %s', (v) =>
    expect(Hex.safeParse(v).success).toBe(false),
  );
});

describe('print value objects', () => {
  it('PrintSize only allows the three sizes', () => {
    for (const s of ['4x6', '5x7', '8x10']) expect(PrintSize.safeParse(s).success).toBe(true);
    expect(PrintSize.safeParse('11x14').success).toBe(false);
  });
  it('Orientation only allows portrait and landscape', () => {
    expect(Orientation.safeParse('portrait').success).toBe(true);
    expect(Orientation.safeParse('landscape').success).toBe(true);
    expect(Orientation.safeParse('square').success).toBe(false);
  });
  it('MarginSetting is off, or on with a size', () => {
    expect(MarginSetting.safeParse({ enabled: false }).success).toBe(true);
    expect(MarginSetting.safeParse({ enabled: true, size: 'large' }).success).toBe(true);
    expect(MarginSetting.safeParse({ enabled: true }).success).toBe(false);
    expect(MarginSetting.safeParse({ enabled: true, size: 'huge' }).success).toBe(false);
  });
});

describe('Font', () => {
  it('accepts a valid manifest entry', () => {
    expect(Font.safeParse(font).success).toBe(true);
    expect(FontManifest.safeParse([font]).success).toBe(true);
  });
  it.each([
    ['category', 'mono'],
    ['weight', 50],
    ['weight', 950],
    ['style', 'oblique'],
    ['license', 'Apache-2.0'],
    ['caseTransform', 'lowercase'],
  ])('rejects %s = %s', (key, value) => {
    expect(Font.safeParse({ ...font, [key]: value }).success).toBe(false);
  });
});

describe('BackgroundSpec', () => {
  it.each([
    { kind: 'solid', color: '#ffffff' },
    { kind: 'linear', stops: ['#000000', '#ffffff'], angleDeg: 45 },
    { kind: 'radial', stops: ['#000000', '#ffffff'], center: [0.5, 0.5] },
    { kind: 'pattern', base: '#ffffff', ink: '#000000', pattern: 'dots', scale: 1, opacity: 0.2 },
    { kind: 'pattern', base: '#ffffff', ink: '#000000', pattern: 'chevron', scale: 1, opacity: 0.2 },
    { kind: 'texture', base: '#ffffff', grain: 'linen', intensity: 0.1, seed: 7 },
  ])('accepts $kind', (bg) => expect(BackgroundSpec.safeParse(bg).success).toBe(true));
  it('rejects unknown kinds and bad variants', () => {
    expect(BackgroundSpec.safeParse({ kind: 'image', assetId: 'x' }).success).toBe(false);
    expect(
      BackgroundSpec.safeParse({
        kind: 'pattern',
        base: '#ffffff',
        ink: '#000000',
        pattern: 'waves',
        scale: 1,
        opacity: 0.2,
      }).success,
    ).toBe(false);
    expect(
      BackgroundSpec.safeParse({ kind: 'texture', base: '#ffffff', grain: 'wood', intensity: 0.1, seed: 1 })
        .success,
    ).toBe(false);
  });
});

describe('DesignSpec and SavedDesign', () => {
  it('accepts a valid spec', () => expect(DesignSpec.safeParse(spec).success).toBe(true));
  it('requires specVersion 1', () =>
    expect(DesignSpec.safeParse({ ...spec, specVersion: 2 }).success).toBe(false));
  it('SavedDesign.quoteId may be a string or null', () => {
    expect(SavedDesign.safeParse(saved).success).toBe(true);
    expect(SavedDesign.safeParse({ ...saved, quoteId: uuid }).success).toBe(true);
    expect(SavedDesign.safeParse({ ...saved, quoteId: undefined }).success).toBe(false);
  });
});

describe('Quote and Library', () => {
  it('Quote.author may be a string or null', () => {
    expect(Quote.safeParse(quote).success).toBe(true);
    expect(Quote.safeParse({ ...quote, author: 'Gandhi' }).success).toBe(true);
    expect(Quote.safeParse({ ...quote, author: undefined }).success).toBe(false);
  });
  it('Library has schemaVersion 1, quotes and designs', () => {
    expect(Library.safeParse({ schemaVersion: 1, quotes: [quote], designs: [saved] }).success).toBe(true);
    expect(Library.safeParse({ schemaVersion: 2, quotes: [], designs: [] }).success).toBe(false);
    expect(Library.safeParse({ schemaVersion: 1, quotes: [] }).success).toBe(false);
  });
});
