import { Button } from '../../ui/Button';

type Props = { label: string; onClick(): void; disabled?: boolean };

/** The screen's one primary action. */
export function GenerateButton({ label, onClick, disabled }: Props) {
  return (
    <Button variant="primary" onClick={onClick} disabled={disabled}>
      {label}
    </Button>
  );
}
