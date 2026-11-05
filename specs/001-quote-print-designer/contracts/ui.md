# Contract: UI Surface & Accessible Handles

E2E tests (Constitution III) find elements by **role and accessible name**, as listed below.
Renaming one of these is a breaking change and must update this file and the E2E tests in the
same pull request.

## Layout

One window. Default window size 1280 × 800; minimum 360 × 600 (a typical phone width, so the
Constitution IV "mobile to desktop widths" rule is met literally). The layout reflows from
360 px to wide screens with no horizontal scrolling. It has three regions:

1. **Compose** (`region` "Quote"): this is where the primary action lives.
2. **Options** (`region` "Design options"): the gallery of rendered previews.
3. **History** (`complementary` "History"): has a `tablist` "History" with tabs "Previous quotes"
   (selected by default) and "Saved designs". At 900 px and wider it is always visible next to
   the gallery, so previous quotes are shown when the app opens at the default size (US4
   acceptance 1). Below 900 px it becomes a drawer opened by a "History" toggle `button` with
   `aria-expanded`; Escape closes the drawer and returns focus to the toggle.

## Controls

| Element | Role | Accessible name | Notes |
|---------|------|-----------------|-------|
| Quote text | `textbox` (multiline) | "Quote" | Shows a live count: "123 / 500" |
| Author | `textbox` | "Author (optional)" | |
| Generate | `button` | "Generate designs" | Primary action. Its label changes to "Regenerate designs" once options exist |
| Print size | `radiogroup` | "Print size" | Options "4x6", "5x7", "8x10". "4x6" is checked by default |
| Orientation | `radiogroup` | "Orientation" | "Portrait" (default), "Landscape" |
| Frame-ready | `switch` | "Frame-ready margin" | Off by default |
| Margin size | `radiogroup` | "Margin size" | "Small", "Medium", "Large". Only shown when frame-ready is on. "Medium" is the default |
| Option card | `checkbox` | "Design {n}: {font family} on {background description}" | Each card has an `img` with the same name. The checkbox carries `data-combo-key="{fontId}\|{backgroundId}"`, the one allowed non-accessible test handle, because names may not be unique per background id |
| Save | `button` | "Save selected ({k})" | Disabled when k = 0 or the options are stale |
| Show in folder | `button` | "Show in folder" | Appears in the success status after saving |
| Previous quote item | `button` | quote excerpt (first 60 characters) | Makes that quote the current quote |
| Delete quote | `button` | "Delete quote: {excerpt}" | Opens a confirmation dialog |
| Saved design item | `listitem` | (contains) `img` "Saved design: {excerpt}", text for size, frame-ready setting, and date | |
| Download again | `button` | "Save again: {excerpt}" | Copies the stored image to the export folder again |
| Delete design | `button` | "Delete design: {excerpt}" | Opens a confirmation dialog |
| Confirm dialog | `dialog` | "Delete this {quote\|design}?" | Buttons "Delete" and "Cancel" |

## States & messages (shown in `status` or `alert` live regions)

| Condition | Live region | Message |
|-----------|-------------|---------|
| Empty quote, Generate pressed | `alert` | "Enter a quote to generate designs." |
| More than 500 characters | `alert` | "That quote is too long to print clearly. Please shorten it to 500 characters or fewer." |
| Author over 120 characters | `alert` | "That author name is too long. Please shorten it to 120 characters or fewer." |
| Generating | `status` | "Generating designs…" (skeleton cards keep the layout from shifting) |
| Generated | `status` | "12 designs ready." |
| Combinations used up | `status` | "You've seen every combination for this quote, so some designs repeat." |
| Fewer options because some fonts lack glyphs (shown when glyphs and fit both apply) | `status` | "Some fonts couldn't display this quote, so showing {n} designs." |
| Fewer options only because some styles didn't fit (generate or settings change) | `status` | "Some designs couldn't fit this quote at this size, so showing {n} designs." |
| No options at all (no font covers the quote, or it fits in none) | `alert` | "None of the designs can show this quote. Try shortening it or removing unusual characters." |
| Options stale | `status` | "Your quote changed. Regenerate to update the designs." |
| No selection | (helper text by Save) | "Select at least one design to save." |
| Saved | `status` | "Saved {k} image(s) to {folder}." + "Show in folder" |
| Save failed | `alert` | "Couldn't save: {reason in plain language}. Nothing was saved. Check that the folder exists and has free space, then try again." |
| Library recovered | `alert` | "Your history file was damaged, so we started a fresh one. A backup was kept at {path}." |
| Empty history | text | "Quotes you design will appear here." / "Designs you save will appear here." |

## Keyboard

Every action can be done from the keyboard. Tab order: Quote → Author → settings → Generate →
option cards (arrow keys move within the grid, Space toggles a card) → Save. Ctrl/Cmd+Enter in the
Quote box runs Generate. Focus is always visible. Dialogs trap focus and return it to the element
that opened them.

## Accessibility gate

`@axe-core/playwright` runs on these states: empty, options shown, history shown, confirmation
dialog open, and a 360 px window with the History drawer open. Each must have zero serious or
critical violations.
