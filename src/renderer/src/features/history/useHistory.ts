import { useCallback, useEffect, useState } from 'react';
import type { Quote, SavedDesign } from '@shared/domain';
import type { FramerApi } from '@shared/ipc/framer-api';

/** Previous quotes and saved designs from the library, with a refresh after anything changes. */
export function useHistory(api: FramerApi): {
  quotes: Quote[];
  designs: SavedDesign[];
  refresh(): Promise<void>;
} {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [designs, setDesigns] = useState<SavedDesign[]>([]);
  const refresh = useCallback(async () => {
    const [q, d] = await Promise.all([api.listQuotes(), api.listDesigns()]);
    if (q.ok) setQuotes(q.value);
    if (d.ok) setDesigns(d.value);
  }, [api]);
  useEffect(() => {
    void refresh();
  }, [refresh]);
  return { quotes, designs, refresh };
}
