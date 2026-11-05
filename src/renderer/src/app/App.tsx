import { useCallback, useEffect, useReducer, useState } from 'react';
import type { PrintSettings } from '@shared/domain';
import { MSG } from '@shared/ipc/messages';
import { dedupeKey, validateQuoteInput } from '@shared/domain/quote';
import { randomSeed } from '@engine/generate/prng';
import { ComposePanel } from '../features/compose/ComposePanel';
import { PrintSettingsPanel } from '../features/compose/PrintSettingsPanel';
import { OptionGallery } from '../features/options/OptionGallery';
import { SaveBar } from '../features/options/SaveBar';
import { HistoryPanel } from '../features/history/HistoryPanel';
import { useHistory } from '../features/history/useHistory';
import { useFramerApi } from './framer-api-context';
import {
  initialSessionState,
  selectExcludedCombos,
  selectGenerateLabel,
  sessionReducer,
} from '../state/session-reducer';
import { Status } from '../ui/Status';
import { cx } from '../ui/cx';
import type { RendererDeps } from './composition';
import { useRendererDeps } from './useRendererDeps';
import styles from './App.module.css';

/** Lets the "Generating designs…" skeletons paint before the synchronous layout work starts. */
const nextFrame = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

export function App({ loadDeps }: { loadDeps: () => Promise<RendererDeps> }) {
  const depsState = useRendererDeps(loadDeps);
  const deps = depsState.status === 'ready' ? depsState.deps : null;
  const [state, dispatch] = useReducer(sessionReducer, initialSessionState);
  const api = useFramerApi();
  const history = useHistory(api);
  const [notices, setNotices] = useState<string[]>([]);

  useEffect(() => {
    void api.getStartupInfo().then((res) => {
      if (res.ok)
        setNotices(
          res.value.notices.map((n) =>
            n.code === 'LIBRARY_RECOVERED' ? MSG.libraryRecovered(n.backupPath) : n.message,
          ),
        );
    });
  }, [api]);

  const generate = useCallback(async () => {
    if (!deps) return;
    const input = { text: state.quote.text, author: state.quote.author || null };
    const valid = validateQuoteInput(input);
    if (!valid.ok) {
      dispatch({ type: 'GENERATE_REJECTED', code: valid.code });
      return;
    }
    const exclude = selectExcludedCombos(state, dedupeKey(valid.value.text, valid.value.author));
    dispatch({ type: 'GENERATE_REQUESTED' });
    // Record the quote in history (FR-020) while the skeletons paint.
    const touched = await api.touchQuote(input);
    if (touched.ok) {
      dispatch({ type: 'QUOTE_TOUCHED', quoteId: touched.value.id });
      void history.refresh();
    }
    await nextFrame();
    const res = deps.generate({
      quote: input.text,
      author: input.author,
      print: state.print,
      exclude,
      seed: randomSeed(),
    });
    if (!res.ok) dispatch({ type: 'GENERATE_REJECTED', code: res.code });
    else dispatch({ type: 'OPTIONS_READY', ...res });
  }, [api, deps, history, state]);

  const changePrint = useCallback(
    (print: PrintSettings) => {
      dispatch({ type: 'PRINT_SETTINGS_CHANGED', print });
      if (deps && state.optionSet) {
        // Same styles, new size: drop only those that no longer fit (FR-015).
        const moved = state.optionSet.options.map((o) => ({ id: o.id, spec: { ...o.spec, print } }));
        dispatch({ type: 'OPTIONS_RELAID', keptIds: deps.relayout(moved) });
      }
    },
    [deps, state.optionSet],
  );

  return (
    <main className={styles.app}>
      <section aria-label="Quote" className={cx(styles.region, styles.compose)}>
        <h1 className={styles.heading}>Framer</h1>
        {notices.map((n) => (
          <Status key={n} tone="alert" className={styles.notice}>
            {n}
          </Status>
        ))}
        <ComposePanel
          text={state.quote.text}
          author={state.quote.author}
          onTextChange={(text) => dispatch({ type: 'QUOTE_CHANGED', text })}
          onAuthorChange={(author) => dispatch({ type: 'QUOTE_CHANGED', author })}
          onGenerate={() => void generate()}
          generateLabel={selectGenerateLabel(state)}
          alert={state.alert}
          disabled={!deps || state.phase === 'generating'}
        >
          <PrintSettingsPanel value={state.print} onChange={changePrint} />
        </ComposePanel>
      </section>
      <section aria-label="Design options" className={cx(styles.region, styles.options)}>
        <h2 className={styles.heading}>Design options</h2>
        {depsState.status === 'loading' && <Status tone="polite">{MSG.loadingFonts}</Status>}
        {depsState.status === 'failed' && <Status tone="alert">{depsState.message}</Status>}
        {deps && (
          <>
            <OptionGallery
              phase={state.phase}
              optionSet={state.optionSet}
              alert={state.alert}
              print={state.print}
              renderService={deps.renderService}
              onToggle={(id) => dispatch({ type: 'OPTION_TOGGLED', id })}
            />
            {state.optionSet && (
              <SaveBar
                state={state}
                dispatch={dispatch}
                renderService={deps.renderService}
                onSaved={() => void history.refresh()}
              />
            )}
          </>
        )}
      </section>
      <aside aria-label="History" className={cx(styles.region, styles.history)}>
        <HistoryPanel
          quotes={history.quotes}
          designs={history.designs}
          onSelectQuote={(q) => dispatch({ type: 'QUOTE_LOADED', text: q.text, author: q.author })}
          onChanged={() => void history.refresh()}
        />
      </aside>
    </main>
  );
}
