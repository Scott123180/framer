// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { Button } from './Button';
import { RadioGroup } from './RadioGroup';
import { Switch } from './Switch';
import { Status } from './Status';

const sizes = [
  { value: '4x6', label: '4x6' },
  { value: '5x7', label: '5x7' },
  { value: '8x10', label: '8x10' },
];

function ControlledRadios({ onChange }: { onChange?: (v: string) => void }) {
  const [value, setValue] = useState('4x6');
  return (
    <RadioGroup
      label="Print size"
      name="size"
      options={sizes}
      value={value}
      onChange={(v) => {
        setValue(v);
        onChange?.(v);
      }}
    />
  );
}

describe('RadioGroup', () => {
  it('renders a named radiogroup with one radio per option and the checked value', () => {
    render(<ControlledRadios />);
    const group = screen.getByRole('radiogroup', { name: 'Print size' });
    expect(group).toBeInTheDocument();
    expect(screen.getAllByRole('radio')).toHaveLength(3);
    expect(screen.getByRole('radio', { name: '4x6' })).toBeChecked();
    expect(screen.getByRole('radio', { name: '5x7' })).not.toBeChecked();
  });

  it('moves and selects with the arrow keys', async () => {
    const onChange = vi.fn();
    render(<ControlledRadios onChange={onChange} />);
    await userEvent.click(screen.getByRole('radio', { name: '4x6' }));
    await userEvent.keyboard('{ArrowRight}');
    expect(screen.getByRole('radio', { name: '5x7' })).toBeChecked();
    expect(screen.getByRole('radio', { name: '5x7' })).toHaveFocus();
    expect(onChange).toHaveBeenLastCalledWith('5x7');
  });
});

describe('Switch', () => {
  function ControlledSwitch() {
    const [on, setOn] = useState(false);
    return <Switch label="Frame-ready margin" checked={on} onChange={setOn} />;
  }

  it('renders role switch with aria-checked and toggles on click and Space', async () => {
    render(<ControlledSwitch />);
    const sw = screen.getByRole('switch', { name: 'Frame-ready margin' });
    expect(sw).toHaveAttribute('aria-checked', 'false');
    await userEvent.click(sw);
    expect(sw).toHaveAttribute('aria-checked', 'true');
    sw.focus();
    await userEvent.keyboard(' ');
    expect(sw).toHaveAttribute('aria-checked', 'false');
  });
});

describe('Status', () => {
  it('renders a polite status region', () => {
    render(<Status tone="polite">12 designs ready.</Status>);
    expect(screen.getByRole('status')).toHaveTextContent('12 designs ready.');
  });
  it('renders an alert region', () => {
    render(<Status tone="alert">Enter a quote to generate designs.</Status>);
    expect(screen.getByRole('alert')).toHaveTextContent('Enter a quote to generate designs.');
  });
});

describe('Button', () => {
  it('is not clickable when disabled and keeps the focus-ring token class', async () => {
    const onClick = vi.fn();
    render(
      <Button disabled onClick={onClick}>
        Save selected (0)
      </Button>,
    );
    const button = screen.getByRole('button', { name: 'Save selected (0)' });
    expect(button).toBeDisabled();
    await userEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
    expect(button).toHaveClass('focus-ring');
  });

  it('calls onClick when enabled', async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Generate designs</Button>);
    await userEvent.click(screen.getByRole('button', { name: 'Generate designs' }));
    expect(onClick).toHaveBeenCalledOnce();
  });
});
