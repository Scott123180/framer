import type { SavedDesign } from '@shared/domain';
import { makeSpec } from '../../test/specs';
import type { InMemoryFramerApi } from '../../test/in-memory-framer-api';

/** Seeds an in-memory API with quotes (oldest first) and returns them. */
export async function seedQuotes(api: InMemoryFramerApi, texts: string[]) {
  for (const text of texts) await api.touchQuote({ text, author: null });
  api.calls.length = 0;
  return api.quotes;
}

export async function seedDesign(
  api: InMemoryFramerApi,
  text: string,
  print = makeSpec(1).print,
): Promise<SavedDesign> {
  const res = await api.saveDesign({
    spec: { ...makeSpec(1, print), quote: { text, author: null } },
    jpeg: new ArrayBuffer(3),
    quoteId: null,
  });
  api.calls.length = 0;
  if (!res.ok) throw new Error('seed failed');
  const { exportedPath: _ignored, ...design } = res.value;
  return design;
}
