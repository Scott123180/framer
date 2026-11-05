import { useMemo, useRef, useState, type KeyboardEvent } from 'react';
import type { PrintSettings } from '@shared/domain';
import { DEFAULT_PRINT_SETTINGS, pixelSize } from '@shared/domain/print';
import { MSG } from '@shared/ipc/messages';
import { describeStyleBackground } from '@engine/catalog/describe';
import type { RenderService } from '@engine/output/render-service';
import { Status } from '../../ui/Status';
import type { OptionSet, SessionAlert, SessionState } from '../../state/session-reducer';
import { OptionCard } from './OptionCard';
import { OPTIONS_PER_SET } from './generate-option-set';
import { previewKey, usePreviews } from './usePreviews';
import styles from './OptionGallery.module.css';

type Props = {
  phase: SessionState['phase'];
  optionSet: OptionSet | null;
  alert: SessionAlert | null;
  renderService: RenderService;
  onToggle(id: string): void;
  /** Used for skeleton proportions before any options exist. */
  print?: PrintSettings;
};

export function statusMessage(phase: Props['phase'], set: OptionSet | null): string {
  if (phase === 'generating') return MSG.generating;
  if (!set) return '';
  if (set.status === 'stale') return MSG.stale;
  const n = set.options.length;
  if (set.exhausted) return MSG.exhausted;
  if (set.shortfall === 'glyphs') return MSG.shortfallGlyphs(n);
  if (set.shortfall === 'fit') return MSG.shortfallFit(n);
  return MSG.ready(n);
}

export function OptionGallery({ phase, optionSet, alert, renderService, onToggle, print }: Props) {
  const options = useMemo(() => optionSet?.options ?? [], [optionSet]);
  const bitmaps = usePreviews(options, renderService);
  const [active, setActive] = useState(0);
  const boxes = useRef<Array<HTMLInputElement | null>>([]);
  const grid = useRef<HTMLDivElement>(null);
  const activeIndex = Math.min(active, Math.max(0, options.length - 1));
  const size = pixelSize(options[0]?.spec.print ?? print ?? DEFAULT_PRINT_SETTINGS);
  const aspectRatio = size.width / size.height;

  function columns(): number {
    const template = grid.current ? getComputedStyle(grid.current).gridTemplateColumns : '';
    return Math.max(1, template.split(' ').filter(Boolean).length);
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>, index: number) {
    const last = options.length - 1;
    const moves: Record<string, number> = {
      ArrowRight: index + 1,
      ArrowLeft: index - 1,
      ArrowDown: index + columns(),
      ArrowUp: index - columns(),
      Home: 0,
      End: last,
    };
    const target = moves[e.key];
    if (target === undefined) return;
    e.preventDefault();
    const next = Math.max(0, Math.min(last, target));
    setActive(next);
    boxes.current[next]?.focus();
  }

  const showAlert = alert?.kind === 'NO_OPTIONS';
  return (
    <div className={styles.gallery}>
      <Status tone="polite">{statusMessage(phase, optionSet)}</Status>
      {showAlert && <Status tone="alert">{alert.message}</Status>}
      {phase === 'generating' ? (
        <div className={styles.grid} aria-hidden="true">
          {Array.from({ length: OPTIONS_PER_SET }, (_, i) => (
            <div key={i} data-skeleton className={styles.card}>
              <div className={styles.skeleton} style={{ aspectRatio }} />
            </div>
          ))}
        </div>
      ) : options.length > 0 ? (
        <div className={styles.grid} ref={grid}>
          {options.map((o, i) => {
            const name = `Design ${i + 1}: ${o.spec.style.fontFamily} on ${describeStyleBackground(o.spec.style)}`;
            return (
              <OptionCard
                key={o.id}
                ref={(el) => {
                  boxes.current[i] = el;
                }}
                name={name}
                caption={o.spec.style.fontFamily}
                comboKey={o.spec.style.comboKey}
                selected={o.selected}
                aspectRatio={aspectRatio}
                bitmap={bitmaps.get(previewKey(o.id, o.spec))}
                tabIndex={i === activeIndex ? 0 : -1}
                onToggle={() => onToggle(o.id)}
                onFocus={() => setActive(i)}
                onKeyDown={(e) => onKeyDown(e, i)}
              />
            );
          })}
        </div>
      ) : (
        !showAlert && <p className={styles.empty}>Your designs will appear here.</p>
      )}
    </div>
  );
}
