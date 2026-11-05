# Data Model: Quote Print Designer

**Feature**: `001-quote-print-designer` | **Date**: 2026-11-04 | **Plan**: [plan.md](./plan.md)

All types are TypeScript in `src/shared/domain/`. Each persisted type also has a zod schema
(`*.schema.ts`) used to validate IPC payloads and `library.json` when it is read. The
TypeScript types are derived from the schemas with `z.infer`, so the two can't drift apart.

---

## Value objects

### PrintSize

| Value | Long × short (in) | Landscape px @300 PPI | Portrait px @300 PPI |
|-------|-------------------|-----------------------|----------------------|
| `4x6` (default) | 6 × 4 | 1800 × 1200 | 1200 × 1800 |
| `5x7` | 7 × 5 | 2100 × 1500 | 1500 × 2100 |
| `8x10` | 10 × 8 | 3000 × 2400 | 2400 × 3000 |

- `PRINT_PPI = 300` (FR-018). `pixelSize(size, orientation)` is a pure function with exact
  integer results.

### Orientation

`'portrait' | 'landscape'`. Default `'portrait'`.

### MarginSetting

`{ enabled: false } | { enabled: true; size: 'small' | 'medium' | 'large' }`. Default
`{ enabled: false }` (FR-012).

- Margin width in inches = short side × {small: 1/16, medium: 1/8, large: 3/16}. On a 4x6 that is
  0.25 / 0.5 / 0.75 in (research R15).

### PrintSettings

```ts
{ size: PrintSize; orientation: Orientation; margin: MarginSetting }
```

- Default `{ size: '4x6', orientation: 'portrait', margin: { enabled: false } }`. Print settings
  are **not** saved between launches, because acceptance 3.1 says the app always opens with
  these defaults.

### SafeArea (derived, never stored)

`{ x, y, width, height }` in print pixels. Inset from each edge = (margin width if enabled) +
padding, where padding = `max(0.25 in, 0.06 × short side)`. Invariant: inset ≥ 0.125 in × 300
= 37.5 px (FR-014).

---

## Entities

### Quote

| Field | Type | Rules |
|-------|------|-------|
| `id` | `string` (UUID v4) | Assigned by main process |
| `text` | `string` | NFC-normalized, trimmed; 1–500 characters counted as grapheme clusters (FR-001, FR-003); line breaks kept |
| `author` | `string \| null` | Optional, trimmed, ≤ 120 characters; empty becomes `null` (FR-002) |
| `dedupeKey` | `string` | Derived: lowercase(collapse-spaces(text)) + `\u0000` + lowercase(author ?? '') |
| `createdAt` | ISO-8601 string | Set once |
| `lastUsedAt` | ISO-8601 string | Updated each time options are generated for it (FR-020) |

- **Uniqueness**: `dedupeKey` is unique. Generating options for a quote whose key already exists
  updates that entry's `lastUsedAt`, so it moves to the top, instead of adding a duplicate
  (spec edge case).
- **Ordering**: listed by `lastUsedAt` descending (acceptance 4.1).
- **Validation errors**: `QUOTE_EMPTY` (whitespace only), `QUOTE_TOO_LONG` (> 500 characters).
  The messages are in [contracts/ui.md](./contracts/ui.md).

### Font (catalog entry, read-only, from `assets/fonts/fonts.manifest.json`)

| Field | Type | Notes |
|-------|------|-------|
| `id` | `string` | Stable slug, e.g. `playfair-display-700` |
| `family` | `string` | CSS family name registered through `FontFace` |
| `category` | `'serif' \| 'sans' \| 'script' \| 'display'` | Used to keep each set varied (FR-006) |
| `weight` | `number` | 100–900 |
| `style` | `'normal' \| 'italic'` | |
| `file` | `string` | Path relative to `assets/fonts/` |
| `license` | `'OFL-1.1'` | Every font must be OFL (spec assumption: fonts allowed for printing) |
| `caseTransform` | `'none' \| 'uppercase'` | e.g. Bebas Neue is drawn in uppercase |

Derived at runtime: `coverage: Set<codepoint>` from fontkit (research R6).

### BackgroundSpec (a discriminated union, so new kinds can be added without editing old ones)

```ts
type BackgroundSpec =
  | { kind: 'solid';    color: Hex }
  | { kind: 'linear';   stops: Hex[]; angleDeg: number }
  | { kind: 'radial';   stops: Hex[]; center: [number, number] }
  | { kind: 'pattern';  base: Hex; ink: Hex; pattern: 'dots'|'stripes'|'grid'|'chevron'; scale: number; opacity: number }
  | { kind: 'texture';  base: Hex; grain: 'paper'|'linen'|'noise'; intensity: number; seed: number }
  // Future (not implemented in v1): { kind: 'image'; assetId: string; source: 'ai' | 'bundled' }
```

- Each kind has one `BackgroundPainter` registered in the painter registry
  ([contracts/engine.md](./contracts/engine.md)).
- Each painter must report `luminanceEnvelope(spec) → { min: number; max: number }` (relative
  luminance from 0 to 1) and `matTone(spec) → Hex`.

### BackgroundCatalogEntry (read-only, from `src/engine/catalog/backgrounds.ts`)

`{ id: string; spec: BackgroundSpec; mood: 'light' | 'dark' | 'vivid' }`. Together the catalog
entries and palette produce at least 40 background variants.

### Style

| Field | Type | Rules |
|-------|------|-------|
| `fontId` | `string` | Must exist in the font catalog |
| `fontFamily` | `string` | Snapshot, so the design can still be read if the catalog changes |
| `background` | `BackgroundSpec` | Full snapshot, not only a catalog id (FR-026) |
| `backgroundId` | `string` | Catalog id, used for the uniqueness key |
| `textColor` | `Hex` | Contrast ≥ 4.5:1 against the darkest and lightest background color (FR-008, SC-005) |
| `attributionColor` | `Hex` | Same contrast rule |
| `comboKey` | `string` | Derived: `${fontId}\|${backgroundId}`. Unique within a set (FR-005) |

### DesignSpec (everything needed to reproduce a design)

```ts
{
  specVersion: 1;
  engineVersion: string;        // renderer layout version, e.g. "1.0.0"
  quote: { text: string; author: string | null };
  print: PrintSettings;
  style: Style;
}
```

- A `DesignSpec` completely determines the `DrawPlan` and the rendered pixels.

### DesignOption (renderer session only, never persisted)

| Field | Type | Notes |
|-------|------|-------|
| `id` | `string` | Unique within the session |
| `spec` | `DesignSpec` | |
| `selected` | `boolean` | FR-016 |

### OptionSet (renderer session only)

| Field | Type | Notes |
|-------|------|-------|
| `quoteKey` | `string` | `dedupeKey` of the quote that generated it |
| `options` | `DesignOption[]` | 12 options (FR-004), or fewer if the fit and glyph filters leave fewer valid combinations |
| `status` | `'fresh' \| 'stale'` | Becomes `stale` when the quote text or author changes (spec edge case) |
| `exhausted` | `boolean` | True when some combinations had to be reused (spec edge case) |
| `shortfall` | `'glyphs' \| 'fit' \| null` | Why fewer than 12 options are shown: `'glyphs'` when any font was skipped for coverage (takes precedence), `'fit'` when only layout failures dropped styles (on generate or after a settings change), `null` otherwise. With 0 options the "none can show this quote" alert is shown instead (spec edge case "Fewer options than usual") |
| `seenComboKeys` | `Set<string>` | Every combination shown for this quote in this session, used to avoid repeats (FR-009) |

### SavedDesign (persisted)

| Field | Type | Rules |
|-------|------|-------|
| `id` | `string` (UUID v4) | Also the file stem in `userData/designs/` |
| `quoteId` | `string \| null` | Link to the Quote. Set to `null` if that quote is deleted. The design keeps its own copy of the quote text |
| `spec` | `DesignSpec` | Full snapshot (FR-022, FR-026) |
| `fileName` | `string` | The user-facing name used in the export folder (FR-019) |
| `imagePath` | `string` | Relative to `userData`: `designs/<id>.jpg` |
| `thumbPath` | `string` | Relative to `userData`: `designs/<id>.thumb.jpg` |
| `pixelWidth` / `pixelHeight` | `number` | Must equal `pixelSize(spec.print)` (SC-003) |
| `byteSize` | `number` | |
| `sha256` | `string` | Hash of the image bytes, used to verify re-downloads are identical (FR-023) |
| `savedAt` | ISO-8601 string | Listed newest first |

---

## Relationships

```text
Quote 1 ──── 0..* SavedDesign      (SavedDesign.quoteId, nullable; the design keeps its own copy of the quote)
SavedDesign 1 ── 1 DesignSpec ── 1 Style ── 1 BackgroundSpec
Font (catalog) 1 ── 0..* Style     (by fontId, family name copied into the Style)
OptionSet 1 ── 1..20 DesignOption  (session only)
```

---

## State transitions

### OptionSet / session (renderer reducer)

```text
            generate (valid quote)
  [empty] ─────────────────────────► [fresh]
     ▲                                 │  ▲
     │ clear quote                     │  │ generate / regenerate
     │                    edit quote   ▼  │
     └───────────────────────────── [stale]
  [fresh] ── change print settings ──► [fresh]  (same combinations, re-rendered; FR-015)
  [fresh] ── toggle select ──────────► [fresh]  (selection updated)
  [fresh] ── save(selected ≥ 1) ─────► [fresh]  (selection cleared on success)
  [stale] ── save ───────────────────► blocked  ("Regenerate before saving")
  any     ── save(selected = 0) ─────► blocked  ("Select at least one design"; acceptance 2.3)
```

### SavedDesign persistence (main process, all-or-nothing)

```text
 request ─► write userData/designs/<id>.jpg ─► write thumb ─► copy to export folder ─► append to library.json ─► saved
               │ fail                           │ fail          │ fail                    │ fail
               └────────────► remove the files written so far, return SaveError, nothing recorded ◄────┘
```

---

## On-disk layout (`app.getPath('userData')`)

```text
<userData>/
├── library.json                 # { schemaVersion: 1, quotes: Quote[], designs: SavedDesign[] }
├── library.corrupt-<ts>.json    # only exists if a corrupt library was moved aside
└── designs/
    ├── <id>.jpg                 # original saved image, never re-encoded
    └── <id>.thumb.jpg           # 400 px on the long side, JPEG quality 85
<export folder>  (default <Pictures>/Framer, override with FRAMER_EXPORT_DIR)
└── framer-<slug>-<size>-<orientation>[-n].jpg
```

- **Migrations**: `schemaVersion` is checked when the library loads. A migration is a pure
  function `(vN) → vN+1` that is unit-tested. Version 1 has no migrations.
