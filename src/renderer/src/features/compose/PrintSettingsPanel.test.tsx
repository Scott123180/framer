// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import type { PrintSettings } from '@shared/domain';
import { DEFAULT_PRINT_SETTINGS } from '@shared/domain/print';
import { PrintSettings as PrintSettingsSchema } from '@shared/domain';
import { PrintSettingsPanel } from './PrintSettingsPanel';

function Harness({ onChange }: { onChange: (p: PrintSettings) => void }) {
  const [value, setValue] = useState(DEFAULT_PRINT_SETTINGS);
  return (
    <PrintSettingsPanel
      value={value}
      onChange={(p) => {
        setValue(p);
        onChange(p);
      }}
    />
  );
}

describe('PrintSettingsPanel', () => {
  it('shows the defaults', () => {
    render(<Harness onChange={() => {}} />);
    const size = screen.getByRole('radiogroup', { name: 'Print size' });
    expect(size).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: '4x6' })).toBeChecked();
    expect(screen.getByRole('radio', { name: '5x7' })).not.toBeChecked();
    expect(screen.getByRole('radio', { name: '8x10' })).not.toBeChecked();
    expect(screen.getByRole('radiogroup', { name: 'Orientation' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Portrait' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Landscape' })).not.toBeChecked();
    expect(screen.getByRole('switch', { name: 'Frame-ready margin' })).toHaveAttribute(
      'aria-checked',
      'false',
    );
    expect(screen.queryByRole('radiogroup', { name: 'Margin size' })).toBeNull();
  });

  it('reports valid settings for every change', async () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    await userEvent.click(screen.getByRole('radio', { name: '8x10' }));
    await userEvent.click(screen.getByRole('radio', { name: 'Landscape' }));
    await userEvent.click(screen.getByRole('switch', { name: 'Frame-ready margin' }));
    expect(screen.getByRole('radiogroup', { name: 'Margin size' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Medium' })).toBeChecked();
    await userEvent.click(screen.getByRole('radio', { name: 'Large' }));
    await userEvent.click(screen.getByRole('switch', { name: 'Frame-ready margin' }));
    expect(screen.queryByRole('radiogroup', { name: 'Margin size' })).toBeNull();

    const calls = onChange.mock.calls.map(([p]) => p as PrintSettings);
    for (const p of calls) expect(PrintSettingsSchema.safeParse(p).success).toBe(true);
    expect(calls.map((p) => [p.size, p.orientation, p.margin])).toEqual([
      ['8x10', 'portrait', { enabled: false }],
      ['8x10', 'landscape', { enabled: false }],
      ['8x10', 'landscape', { enabled: true, size: 'medium' }],
      ['8x10', 'landscape', { enabled: true, size: 'large' }],
      ['8x10', 'landscape', { enabled: false }],
    ]);
  });

  it('remembers the last margin size when turned back on', async () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    const sw = screen.getByRole('switch', { name: 'Frame-ready margin' });
    await userEvent.click(sw);
    await userEvent.click(screen.getByRole('radio', { name: 'Small' }));
    await userEvent.click(sw);
    await userEvent.click(sw);
    expect(screen.getByRole('radio', { name: 'Small' })).toBeChecked();
  });
});
