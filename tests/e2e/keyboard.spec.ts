/// <reference lib="dom" />
import { test, expect, type FramerApp } from './fixtures';
import { SHORT } from '../fixtures/quotes';

/** Describes the focused element by role and accessible name, using the group label for radios. */
async function focused(app: FramerApp): Promise<string> {
  return app.page.evaluate(() => {
    const el = document.activeElement as HTMLElement | null;
    if (!el) return '';
    if (el instanceof HTMLInputElement && el.type === 'radio') {
      const id = el.closest('[role="radiogroup"]')?.getAttribute('aria-labelledby');
      return `radiogroup:${(id && document.getElementById(id)?.textContent) || ''}`;
    }
    if (el instanceof HTMLInputElement && el.type === 'checkbox') return 'card';
    const label = el.id ? document.querySelector(`label[for="${el.id}"]`)?.textContent : null;
    return label ?? el.getAttribute('aria-label') ?? (el.textContent ?? '').trim();
  });
}

async function hasVisibleFocus(app: FramerApp): Promise<boolean> {
  return app.page.evaluate(() => {
    let el = document.activeElement as HTMLElement | null;
    // Hidden card checkboxes and radios show focus on their wrapping label.
    if (el instanceof HTMLInputElement && (el.type === 'checkbox' || el.type === 'radio'))
      el = el.closest('label');
    if (!el) return false;
    const s = getComputedStyle(el);
    return (
      (s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) > 0 && s.outlineColor !== 'transparent') ||
      s.boxShadow !== 'none'
    );
  });
}

test('everything works from the keyboard', async ({ app }) => {
  const { page } = app;
  const mod = process.platform === 'darwin' ? 'Meta' : 'Control';
  await expect(page.getByRole('button', { name: 'Generate designs' })).toBeEnabled({ timeout: 15_000 });

  await page.getByRole('textbox', { name: 'Quote' }).focus();
  await page.keyboard.type(SHORT.text);
  await page.keyboard.press(`${mod}+Enter`);
  const cards = page.getByRole('region', { name: 'Design options' }).getByRole('checkbox');
  await expect(cards).toHaveCount(12, { timeout: 5_000 });

  // Select a card from the keyboard so Save is enabled (a disabled button is skipped by Tab).
  await cards.first().focus();
  await page.keyboard.press('Space');
  await expect(cards.first()).toBeChecked();

  await page.getByRole('textbox', { name: 'Quote' }).focus();
  const order: string[] = [];
  for (let i = 0; i < 7; i++) {
    await page.keyboard.press('Tab');
    order.push(await focused(app));
    expect(await hasVisibleFocus(app), `visible focus on ${order.at(-1)}`).toBe(true);
  }
  expect(order).toEqual([
    'Author (optional)',
    'radiogroup:Print size',
    'radiogroup:Orientation',
    'Frame-ready margin',
    'Regenerate designs',
    'card',
    'Save selected (1)',
  ]);

  // Arrow keys move between cards; Space toggles.
  await cards.first().focus();
  await page.keyboard.press('ArrowRight');
  await expect(cards.nth(1)).toBeFocused();
  await page.keyboard.press('Space');
  await expect(cards.nth(1)).toBeChecked();
  await page.keyboard.press('Space');
  await expect(cards.nth(1)).not.toBeChecked();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Save selected (1)' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('status').filter({ hasText: /^Saved 1 image\(s\) to / })).toBeVisible();

  // The confirm dialog keeps focus inside and returns it on Escape.
  const del = page.getByRole('button', { name: /^Delete quote: / });
  await del.focus();
  await page.keyboard.press('Enter');
  const dialog = page.getByRole('dialog', { name: 'Delete this quote?' });
  await expect(dialog).toBeVisible();
  for (let i = 0; i < 4; i++) {
    await page.keyboard.press('Tab');
    expect(await page.evaluate(() => !!document.activeElement?.closest('dialog'))).toBe(true);
  }
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(del).toBeFocused();
});
