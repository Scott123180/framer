export type FontFile = {
  id: string;
  family: string;
  weight: number;
  style: 'normal' | 'italic';
  bytes: ArrayBuffer;
};

/** Registers font bytes with a FontFaceSet (document.fonts or a worker's self.fonts) and waits for them. */
export async function registerFonts(set: FontFaceSet, fonts: readonly FontFile[]): Promise<void> {
  await Promise.all(
    fonts.map(async (f) => {
      const face = new FontFace(f.family, f.bytes, { weight: String(f.weight), style: f.style });
      await face.load();
      set.add(face);
    }),
  );
}
