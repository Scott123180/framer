import { useEffect, useState } from 'react';
import type { SavedDesign } from '@shared/domain';
import { MSG } from '@shared/ipc/messages';
import { useFramerApi } from '../../app/framer-api-context';
import { Button } from '../../ui/Button';
import { Status } from '../../ui/Status';
import { folderOf, saveFailedMessage } from '../options/useSaveSelected';
import { ConfirmDialog } from './ConfirmDialog';
import { excerpt } from './excerpt';
import styles from './History.module.css';

type Props = { designs: SavedDesign[]; onChanged(): void };
type Outcome = { kind: 'saved'; path: string } | { kind: 'failed'; message: string } | null;

const capital = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function describePrint(d: SavedDesign): { size: string; frame: string } {
  const { size, orientation, margin } = d.spec.print;
  return {
    size: `${size} ${capital(orientation)}`,
    frame: `Frame-ready: ${margin.enabled ? capital(margin.size) : 'Off'}`,
  };
}

export function SavedDesigns({ designs, onChanged }: Props) {
  const api = useFramerApi();
  const [pending, setPending] = useState<SavedDesign | null>(null);
  const [outcome, setOutcome] = useState<Outcome>(null);

  async function saveAgain(d: SavedDesign) {
    const res = await api.reexportDesign(d.id);
    setOutcome(
      res.ok
        ? { kind: 'saved', path: res.value.exportedPath }
        : { kind: 'failed', message: saveFailedMessage(res.error) },
    );
  }

  async function remove(d: SavedDesign) {
    await api.deleteDesign(d.id);
    onChanged();
  }

  if (designs.length === 0) return <p className={styles.empty}>{MSG.emptyDesigns}</p>;
  return (
    <>
      {outcome?.kind === 'saved' && (
        <Status tone="polite" variant="success">
          {MSG.saved(1, folderOf(outcome.path))}{' '}
          <Button
            variant="quiet"
            className={styles.small}
            onClick={() => void api.showInFolder(outcome.path)}
          >
            Show in folder
          </Button>
        </Status>
      )}
      {outcome?.kind === 'failed' && <Status tone="alert">{outcome.message}</Status>}
      <ul className={styles.list}>
        {designs.map((d) => {
          const name = excerpt(d.spec.quote.text);
          const { size, frame } = describePrint(d);
          return (
            <li key={d.id} className={styles.designItem}>
              <Thumbnail id={d.id} alt={`Saved design: ${name}`} />
              <div className={styles.meta}>
                <span className={styles.metaQuote}>{name}</span>
                <span className={styles.metaDetail}>{size}</span>
                <span className={styles.metaDetail}>{frame}</span>
                <span className={styles.metaDetail}>{new Date(d.savedAt).toLocaleDateString()}</span>
                <div className={styles.actions}>
                  <Button
                    className={styles.small}
                    aria-label={`Save again: ${name}`}
                    onClick={() => void saveAgain(d)}
                  >
                    Save again
                  </Button>
                  <Button
                    variant="quiet"
                    className={styles.small}
                    aria-label={`Delete design: ${name}`}
                    onClick={() => setPending(d)}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
      <ConfirmDialog
        open={pending !== null}
        title="Delete this design?"
        onCancel={() => setPending(null)}
        onConfirm={() => {
          if (pending) void remove(pending);
          setPending(null);
        }}
      />
    </>
  );
}

function Thumbnail({ id, alt }: { id: string; alt: string }) {
  const api = useFramerApi();
  const [src, setSrc] = useState<string | undefined>();
  useEffect(() => {
    let live = true;
    void api.getThumbnail(id).then((res) => {
      if (live && res.ok) setSrc(res.value);
    });
    return () => {
      live = false;
    };
  }, [api, id]);
  return <img className={styles.thumb} src={src} alt={alt} />;
}
