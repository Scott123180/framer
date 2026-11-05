import AxeBuilder from '@axe-core/playwright';
import { expect, type Page } from '@playwright/test';

/** Fails on any serious or critical axe violation. `stateLabel` names the UI state in the failure output. */
export async function expectNoSeriousA11yViolations(page: Page, stateLabel: string): Promise<void> {
  const results = await new AxeBuilder({ page })
    // Legacy mode runs axe in the existing page; Electron can't open the extra page the default mode needs.
    .setLegacyMode(true)
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze();
  const serious = results.violations
    .filter((v) => v.impact === 'serious' || v.impact === 'critical')
    .map((v) => `${v.id} (${v.impact}): ${v.help} → ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`);
  expect(serious, `axe violations in state "${stateLabel}"`).toEqual([]);
}
