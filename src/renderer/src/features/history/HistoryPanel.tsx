import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import type { Quote, SavedDesign } from '@shared/domain';
import { useFramerApi } from '../../app/framer-api-context';
import { Button } from '../../ui/Button';
import { cx } from '../../ui/cx';
import { PreviousQuotes } from './PreviousQuotes';
import { SavedDesigns } from './SavedDesigns';
import { useMediaQuery } from './useMediaQuery';
import styles from './History.module.css';

export const WIDE_LAYOUT = '(min-width: 900px)';

type Props = {
  quotes: Quote[];
  designs: SavedDesign[];
  onSelectQuote(quote: Quote): void;
  onChanged(): void;
};

/** History: beside the gallery on wide windows, a drawer behind a "History" button below 900 px. */
export function HistoryPanel(props: Props) {
  const wide = useMediaQuery(WIDE_LAYOUT);
  const [open, setOpen] = useState(false);
  const toggle = useRef<HTMLButtonElement>(null);
  const drawerId = useId();

  useEffect(() => {
    if (wide || !open) return;
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape' && !document.querySelector('dialog[open]')) {
        setOpen(false);
        toggle.current?.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [wide, open]);

  if (wide) {
    return (
      <>
        <h2 className={styles.drawerTitle}>History</h2>
        <HistoryTabs {...props} />
      </>
    );
  }
  return (
    <>
      <Button ref={toggle} aria-expanded={open} aria-controls={drawerId} onClick={() => setOpen((o) => !o)}>
        History
      </Button>
      {open && (
        <div id={drawerId} className={styles.drawer}>
          <div className={styles.drawerHeader}>
            <h2 className={styles.drawerTitle}>History</h2>
            <Button
              variant="quiet"
              onClick={() => {
                setOpen(false);
                toggle.current?.focus();
              }}
            >
              Close
            </Button>
          </div>
          <HistoryTabs
            {...props}
            onSelectQuote={(q) => {
              props.onSelectQuote(q);
              setOpen(false);
            }}
          />
        </div>
      )}
    </>
  );
}

const TABS = [
  { key: 'quotes', label: 'Previous quotes' },
  { key: 'designs', label: 'Saved designs' },
] as const;

function HistoryTabs({ quotes, designs, onSelectQuote, onChanged }: Props) {
  const api = useFramerApi();
  const base = useId();
  const [active, setActive] = useState(0);
  const tabs = useRef<Array<HTMLButtonElement | null>>([]);

  function onKeyDown(e: KeyboardEvent<HTMLButtonElement>) {
    const step = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    const next = (active + step + TABS.length) % TABS.length;
    setActive(next);
    tabs.current[next]?.focus();
  }

  const tabId = (i: number) => `${base}-tab-${i}`;
  const panelId = (i: number) => `${base}-panel-${i}`;
  return (
    <div>
      <div role="tablist" aria-label="History" className={styles.tablist}>
        {TABS.map((t, i) => (
          <button
            key={t.key}
            ref={(el) => {
              tabs.current[i] = el;
            }}
            id={tabId(i)}
            type="button"
            role="tab"
            aria-selected={i === active}
            aria-controls={panelId(i)}
            tabIndex={i === active ? 0 : -1}
            className={cx('focus-ring', styles.tab)}
            onClick={() => setActive(i)}
            onKeyDown={onKeyDown}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div role="tabpanel" id={panelId(active)} aria-labelledby={tabId(active)} className={styles.panel}>
        {active === 0 ? (
          <PreviousQuotes
            quotes={quotes}
            onSelect={onSelectQuote}
            onDelete={(q) => void api.deleteQuote(q.id).then(onChanged)}
          />
        ) : (
          <SavedDesigns designs={designs} onChanged={onChanged} />
        )}
      </div>
    </div>
  );
}
