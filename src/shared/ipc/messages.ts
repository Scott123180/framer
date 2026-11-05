/** Every user-facing message, verbatim from contracts/ui.md → "States & messages". */
export const MSG = {
  quoteEmpty: 'Enter a quote to generate designs.',
  quoteTooLong: 'That quote is too long to print clearly. Please shorten it to 500 characters or fewer.',
  authorTooLong: 'That author name is too long. Please shorten it to 120 characters or fewer.',
  generating: 'Generating designs…',
  loadingFonts: 'Loading fonts…',
  ready: (n: number) => `${n} designs ready.`,
  exhausted: "You've seen every combination for this quote, so some designs repeat.",
  shortfallGlyphs: (n: number) => `Some fonts couldn't display this quote, so showing ${n} designs.`,
  shortfallFit: (n: number) => `Some designs couldn't fit this quote at this size, so showing ${n} designs.`,
  noOptions: 'None of the designs can show this quote. Try shortening it or removing unusual characters.',
  stale: 'Your quote changed. Regenerate to update the designs.',
  selectToSave: 'Select at least one design to save.',
  saved: (k: number, folder: string) => `Saved ${k} image(s) to ${folder}.`,
  saveFailed: (reason: string) =>
    `Couldn't save: ${reason}. Nothing was saved. Check that the folder exists and has free space, then try again.`,
  libraryRecovered: (path: string) =>
    `Your history file was damaged, so we started a fresh one. A backup was kept at ${path}.`,
  emptyQuotes: 'Quotes you design will appear here.',
  emptyDesigns: 'Designs you save will appear here.',
} as const;

/** Plain-language reasons used inside MSG.saveFailed and EXPORT_FAILED errors. */
export const EXPORT_REASON_TEXT = {
  NO_SPACE: 'the disk is full',
  PERMISSION: "the folder can't be written to",
  UNKNOWN: 'something went wrong while writing the file',
} as const;

export const STORAGE_FAILED_TEXT =
  "Something went wrong while reading or writing Framer's files. Please try again.";
