import { contextBridge, ipcRenderer } from 'electron';
import { CHANNELS } from '@shared/ipc/channels';
import type { FramerApi } from '@shared/ipc/framer-api';

const invoke = (channel: string, payload?: unknown) => ipcRenderer.invoke(channel, payload);

const api: FramerApi = {
  touchQuote: (input) => invoke(CHANNELS.quotesTouch, input),
  listQuotes: () => invoke(CHANNELS.quotesList),
  deleteQuote: (id) => invoke(CHANNELS.quotesDelete, { id }),
  saveDesign: (input) => invoke(CHANNELS.designsSave, input),
  listDesigns: () => invoke(CHANNELS.designsList),
  getThumbnail: (id) => invoke(CHANNELS.designsThumb, { id }),
  reexportDesign: (id) => invoke(CHANNELS.designsReexport, { id }),
  deleteDesign: (id) => invoke(CHANNELS.designsDelete, { id }),
  showInFolder: (path) => invoke(CHANNELS.osShowInFolder, { path }),
  loadFontFiles: (ids) => invoke(CHANNELS.fontsLoad, { ids }),
  getStartupInfo: () => invoke(CHANNELS.appStartupInfo),
};

contextBridge.exposeInMainWorld('framer', api);
