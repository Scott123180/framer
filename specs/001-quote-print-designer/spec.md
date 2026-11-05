# Feature Specification: Quote Print Designer

**Feature Branch**: `001-quote-print-designer`

**Created**: 2026-11-04

**Status**: Draft

**Input**: User description: "I have a few inspirational quotes and want to print them as 4x6 photos (other sizes supported) at a photo center like CVS or Walgreens. The app takes a quote, generates 10–20 rendered style options (mixes of fonts and backgrounds), lets me regenerate or pick one or more, optionally adds margin so the print can be framed, and saves the result as an image I can upload for printing. I can see quotes I entered before and a history of saved designs so I can look back or modify them later. Frame previews are a future idea."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Turn a quote into a print-ready 4x6 image (Priority: P1)

The user opens the app, types an inspirational quote (and optionally who said it), and immediately sees a gallery of 10–20 rendered previews. Each preview shows exactly what the printed photo will look like, using a different combination of font and background. The user picks the one they like and downloads it as an image file they can upload to a photo center (e.g., CVS, Walgreens) for printing on 4x6 photo paper.

**Why this priority**: This is the core value of the product. With only this story, the user can go from a quote to a physical print, which is the whole reason the app exists.

**Independent Test**: Enter a quote, choose one generated option, download it, and confirm the file is a 4x6-proportioned, print-quality image whose text is fully visible and legible. Upload it to a photo center's print ordering page and confirm it is accepted without cropping warnings.

**Acceptance Scenarios**:

1. **Given** the app is open with no quote entered, **When** the user enters a quote and requests options, **Then** the app shows between 10 and 20 rendered previews, each using a visibly different font-and-background combination. (Fewer may be shown only when some fonts cannot display the quote's characters or the quote cannot fit; see Edge Cases.)
2. **Given** a set of previews is displayed, **When** the user selects one and saves it, **Then** an image file is downloaded at 4x6 proportions and print-quality resolution, matching the preview.
3. **Given** a quote with an author, **When** previews are generated, **Then** each preview shows the quote and the author attribution, visually distinguished from the quote text.
4. **Given** a long quote, **When** previews are generated, **Then** the text in every preview fits fully inside the safe print area with no clipping or overflow.

---

### User Story 2 - Regenerate and pick multiple favorites (Priority: P2)

If none of the generated previews appeal to the user, they can ask for a fresh set. If several appeal, they can select more than one and save all of them in one step.

**Why this priority**: Choosing the right look is the creative heart of the app. Regeneration and multi-select make it much more likely the user finds (and keeps) a design they love, but the app is still useful without them.

**Independent Test**: Generate options for a quote, regenerate and confirm a new, different set appears; then select three options and save, confirming three separate image files are produced.

**Acceptance Scenarios**:

1. **Given** a set of previews is displayed, **When** the user regenerates, **Then** a new set of 10–20 previews is shown that does not repeat any font-and-background combination from the set it replaces.
2. **Given** a set of previews is displayed, **When** the user selects several previews and saves, **Then** one image file per selected preview is produced, and each is recorded in the saved history.
3. **Given** no previews are selected, **When** the user looks at the save action, **Then** saving is unavailable and the user is told to select at least one design.

---

### User Story 3 - Choose print size and frame-ready margin (Priority: P2)

Before or after generating options, the user can choose a different print size (4x6 is the default) and orientation, and can turn on a "frame-ready" option that adds a margin around the edges so the print looks good inside a picture frame or mat. Previews update to reflect the chosen size and margin.

**Why this priority**: The user explicitly wants framing and other sizes, but 4x6 without a margin already delivers a usable print, so this builds on Story 1.

**Independent Test**: Select 5x7 portrait with frame-ready margin on, generate options, save one, and confirm the file has 5x7 proportions and that the quote content sits inside a visible margin on all four sides.

**Acceptance Scenarios**:

1. **Given** the default settings, **When** the user opens the app, **Then** the print size is 4x6 and frame-ready margin is off.
2. **Given** previews are displayed, **When** the user changes the print size or orientation, **Then** all previews re-render at the new proportions while keeping the same style combinations.
3. **Given** frame-ready margin is turned on, **When** previews are generated, **Then** every preview shows a uniform margin around all edges with the quote content contained within it.
4. **Given** frame-ready margin is on, **When** the user chooses a margin size (small, medium, or large), **Then** the previews and saved image reflect that margin width.

---

### User Story 4 - See previous quotes and saved designs (Priority: P3)

The user can see a list of quotes they have entered before and pick one to generate new options without retyping it. They can also browse a history of every design they saved, see a thumbnail of each, download it again, and start a new round of options from its quote.

**Why this priority**: History makes the app pleasant for repeat use and protects the user's past work, but a single session's create-and-download flow works without it.

**Independent Test**: Save two designs from two different quotes, close and reopen the app, and confirm both quotes appear in the previous-quotes list and both designs appear in saved history and can be downloaded again.

**Acceptance Scenarios**:

1. **Given** the user has previously entered quotes, **When** they open the app, **Then** a list of previous quotes is shown, most recent first.
2. **Given** the previous-quotes list, **When** the user selects a quote, **Then** it becomes the current quote and new options can be generated for it.
3. **Given** saved designs exist, **When** the user views saved history, **Then** each design shows a thumbnail, its quote, print size, frame-ready setting, and the date saved.
4. **Given** a saved design in history, **When** the user chooses to download it again, **Then** an image identical to the originally saved one is produced.
5. **Given** a saved design or previous quote, **When** the user deletes it and confirms, **Then** it no longer appears in the app.
6. **Given** the user closes and reopens the app, **When** they view history, **Then** all previously entered quotes and saved designs are still present.

---

### Edge Cases

- **Empty or whitespace-only quote**: options cannot be generated; the user is told a quote is required.
- **Very long quote** (over 500 characters): the user is told the quote is too long to print legibly and asked to shorten it.
- **Author over 120 characters**: options cannot be generated; the user is told the author name is too long and asked to shorten it.
- **Quote with line breaks, punctuation, curly quotes, accented letters, or emoji**: text renders faithfully in every option; any option whose font cannot display a character is left out of the set rather than shown with missing glyphs.
- **Fewer options than usual**: when fonts that cannot display the quote, or styles in which the quote cannot fit legibly, are left out, the set may hold fewer than 10 options (even just one). The user is told why fewer designs are shown. If no font can display the quote, or it fits in none, no options are shown and the user is told to shorten the quote or remove unusual characters.
- **Same quote entered again**: it is not duplicated in the previous-quotes list; the existing entry moves to the top.
- **Changing quote text after options are shown**: the existing previews are marked out of date, and the user must regenerate before saving.
- **Changing print size, orientation, or margin after options are shown**: the previews re-render with the same styles; any style in which the quote no longer fits legibly at the new settings is left out, and the user is told how many designs are shown.
- **Saving fails** (e.g., device storage full or the save folder cannot be written): the user sees a plain-language error, and the design is not recorded as saved.
- **Regenerating many times**: if the app runs out of new combinations, it tells the user and may reuse combinations from earlier sets.
- **Photo-center edge trimming**: even with frame-ready margin off, quote text is kept inside a safe area so slight trimming during printing never cuts off text.

## Requirements *(mandatory)*

### Functional Requirements

**Quote entry**

- **FR-001**: Users MUST be able to enter quote text up to 500 characters, including line breaks. Characters are counted as the user sees them, so an emoji, an emoji with a skin tone, or an accented letter each count as one.
- **FR-002**: Users MUST be able to optionally enter an author or attribution for the quote, up to 120 characters.
- **FR-003**: System MUST prevent generating options for empty or whitespace-only quotes and explain why.

**Option generation**

- **FR-004**: System MUST generate a set of 12 rendered style options for the current quote, print size, orientation, and margin setting. (12 sits inside the requested 10–20 range.)
- **FR-005**: Each option in a set MUST use a distinct combination of font and background; no two options in one set may be identical.
- **FR-006**: Backgrounds MUST include a variety of styles (e.g., solid colors, gradients, subtle textures or patterns), and fonts MUST include a variety of typefaces (e.g., serif, sans-serif, script, display).
- **FR-007**: Every option MUST keep the quote and attribution text fully visible inside the safe print area, automatically adjusting text size and line wrapping to fit.
- **FR-008**: Every option MUST maintain legible contrast between the text and its background.
- **FR-009**: Users MUST be able to regenerate to get a new set of options that does not repeat any combination from the set it replaces.
- **FR-010**: Each preview MUST accurately represent the final saved image (same proportions, layout, fonts, background, and margin).

**Print size and framing**

- **FR-011**: System MUST support these print sizes: 4x6 (default), 5x7, and 8x10 inches, each in portrait or landscape orientation.
- **FR-012**: Users MUST be able to turn a frame-ready margin on or off (off by default) and choose a margin size of small, medium, or large.
- **FR-013**: When frame-ready margin is on, System MUST add a uniform margin on all four edges and keep all quote content inside it.
- **FR-014**: Even with frame-ready margin off, System MUST keep text at least 0.125 inch from every edge so photo-center trimming does not cut it off.
- **FR-015**: Changing print size, orientation, or margin MUST re-render the current previews with the same style combinations, leaving out only styles in which the quote no longer fits legibly (FR-007) and telling the user how many designs are shown.

**Selection and saving**

- **FR-016**: Users MUST be able to select one or more options from the current set.
- **FR-017**: Users MUST be able to save the selected options, producing one image file per selected option.
- **FR-018**: Saved images MUST be in a format accepted by major retail photo centers (JPEG), at the exact proportions of the chosen print size and at a resolution of at least 300 pixels per inch (e.g., 1800 × 1200 pixels for 4x6).
- **FR-019**: Saved image files MUST have descriptive names that include a short excerpt of the quote and the print size.

**History**

- **FR-020**: System MUST remember every quote the user generates options for and list them, most recent first, with no duplicates.
- **FR-021**: Users MUST be able to select a previous quote to make it the current quote.
- **FR-022**: System MUST keep a history of every saved design, including its quote, attribution, print size, orientation, margin setting, chosen style (font and background), and save date.
- **FR-023**: Users MUST be able to view saved history with thumbnails and re-download any saved design, producing an image identical to the original.
- **FR-024**: Users MUST be able to delete a previous quote or a saved design after confirming.
- **FR-025**: Quotes and saved-design history MUST persist after the app is closed and reopened.
- **FR-026**: Saved designs MUST retain enough information (quote, attribution, size, margin, and style) to allow a future version to modify them.

### Key Entities

- **Quote**: The text the user wants to print, plus an optional author or attribution. Has a date last used. A quote may have many saved designs.
- **Print Settings**: Print size (4x6, 5x7, 8x10), orientation (portrait or landscape), and frame-ready margin (off, or small/medium/large).
- **Style**: A combination of font (typeface, weight, and treatment) and background (color, gradient, texture, or pattern) that determines how a quote looks.
- **Design Option**: A rendered preview combining one Quote, the current Print Settings, and one Style. Options are temporary until saved.
- **Saved Design**: A Design Option the user saved. Records the Quote, Print Settings, Style, save date, and a thumbnail, so it can be viewed, re-downloaded, and later modified.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A first-time user can go from opening the app to having a downloaded, print-ready 4x6 image in under 2 minutes.
- **SC-002**: A full set of option previews appears within 3 seconds of the user requesting options or regenerating.
- **SC-003**: 100% of saved images have the exact proportions of the chosen print size and at least 300 pixels per inch, and are accepted by at least two major retail photo centers' upload flows without cropping or low-resolution warnings.
- **SC-004**: For any quote up to 500 characters, 100% of generated options show the complete quote and attribution with no clipped or overlapping text.
- **SC-005**: 100% of generated options meet a minimum text-to-background contrast ratio of 4.5:1.
- **SC-006**: When printed, each saved image matches its on-screen preview in layout, font, background, and margin with no visible differences other than color-reproduction differences of the print process.
- **SC-007**: After closing and reopening the app, 100% of previously entered quotes and saved designs are still available.
- **SC-008**: In user testing, at least 8 out of 10 participants find at least one option they would print within the first two sets of options for a given quote.

## Assumptions

- The app is for a single person on their own device; there are no user accounts, sign-in, sharing, or syncing between devices in this version. Quotes and history are stored on the user's device.
- The user uploads saved images to the photo center themselves; the app does not connect to or order from CVS, Walgreens, or any other print service.
- Print sizes are limited to 4x6, 5x7, and 8x10 for this version, since those are the most common retail photo print sizes; more sizes can be added later.
- Margin sizes are fixed presets (for example, roughly 0.25, 0.5, and 0.75 inch on a 4x6, scaled for larger sizes) rather than free-form values. The margin is part of the design, using the design's own colors (a solid mat tone taken from the background's palette, with the full background inside it), not plain white.
- Style options are produced automatically from a curated library of fonts and backgrounds that the app is allowed to use for printed output; the user does not upload their own fonts or images in this version.
- Showing what the print looks like inside a physical frame is out of scope for this version.
- Editing a saved design (changing its font, background, or text in place) is out of scope for this version; the history stores the information needed to add it later.
- The app is a desktop application for Linux, macOS, and Windows (decided during planning; originally assumed to be a web browser app). "Download" means saving the image file to a folder on the user's computer; in the app this is the "Save selected" button (new designs) and the "Save again" button (saved history).
