import { useState } from 'react';
import type { MarginSize, Orientation, PrintSettings, PrintSize } from '@shared/domain';
import { RadioGroup } from '../../ui/RadioGroup';
import { Switch } from '../../ui/Switch';
import styles from './PrintSettingsPanel.module.css';

const SIZES: ReadonlyArray<{ value: PrintSize; label: string }> = [
  { value: '4x6', label: '4x6' },
  { value: '5x7', label: '5x7' },
  { value: '8x10', label: '8x10' },
];
const ORIENTATIONS: ReadonlyArray<{ value: Orientation; label: string }> = [
  { value: 'portrait', label: 'Portrait' },
  { value: 'landscape', label: 'Landscape' },
];
const MARGINS: ReadonlyArray<{ value: MarginSize; label: string }> = [
  { value: 'small', label: 'Small' },
  { value: 'medium', label: 'Medium' },
  { value: 'large', label: 'Large' },
];

type Props = { value: PrintSettings; onChange(print: PrintSettings): void };

export function PrintSettingsPanel({ value, onChange }: Props) {
  const [lastMargin, setLastMargin] = useState<MarginSize>(
    value.margin.enabled ? value.margin.size : 'medium',
  );
  const setMargin = (size: MarginSize) => {
    setLastMargin(size);
    onChange({ ...value, margin: { enabled: true, size } });
  };
  return (
    <div className={styles.panel}>
      <RadioGroup
        label="Print size"
        name="print-size"
        options={SIZES}
        value={value.size}
        onChange={(size) => onChange({ ...value, size })}
      />
      <RadioGroup
        label="Orientation"
        name="orientation"
        options={ORIENTATIONS}
        value={value.orientation}
        onChange={(orientation) => onChange({ ...value, orientation })}
      />
      <Switch
        label="Frame-ready margin"
        checked={value.margin.enabled}
        onChange={(on) =>
          onChange({ ...value, margin: on ? { enabled: true, size: lastMargin } : { enabled: false } })
        }
      />
      {value.margin.enabled && (
        <RadioGroup
          label="Margin size"
          name="margin-size"
          options={MARGINS}
          value={value.margin.size}
          onChange={setMargin}
        />
      )}
    </div>
  );
}
