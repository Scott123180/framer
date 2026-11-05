import { shell } from 'electron';

export interface Shell {
  showItemInFolder(path: string): void;
}

export const electronShell: Shell = { showItemInFolder: (p) => shell.showItemInFolder(p) };
