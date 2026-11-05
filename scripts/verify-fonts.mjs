#!/usr/bin/env node
// Checks the vendored font tree: every manifest entry has its font file, an OFL.txt in its family
// folder, the OFL-1.1 license, and a unique id. Used by `npm run fonts:verify` and CI.
import { access, readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const exists = (path) =>
  access(path).then(
    () => true,
    () => false,
  );

/** @returns {Promise<string[]>} one human-readable problem per issue; empty when all is well. */
export async function verifyFonts(rootDir) {
  const fontsDir = join(rootDir, 'assets', 'fonts');
  const manifest = JSON.parse(await readFile(join(fontsDir, 'fonts.manifest.json'), 'utf8'));
  const problems = [];
  const seenIds = new Set();
  const checkedFamilies = new Set();

  for (const entry of manifest) {
    if (seenIds.has(entry.id)) problems.push(`${entry.id}: duplicate id in fonts.manifest.json`);
    seenIds.add(entry.id);

    if (entry.license !== 'OFL-1.1') {
      problems.push(`${entry.id}: license is "${entry.license}", but every font must be OFL-1.1`);
    }
    if (!(await exists(join(fontsDir, entry.file)))) {
      problems.push(`${entry.id}: font file ${entry.file} is missing`);
    }
    const family = dirname(entry.file);
    if (!checkedFamilies.has(family)) {
      checkedFamilies.add(family);
      if (!(await exists(join(fontsDir, family, 'OFL.txt')))) {
        problems.push(`${family}: family folder has no OFL.txt`);
      }
    }
  }
  return problems;
}

const invokedDirectly = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) {
  const problems = await verifyFonts(process.cwd());
  if (problems.length > 0) {
    for (const p of problems) console.error(`✗ ${p}`);
    process.exit(1);
  }
  console.log('✓ fonts verified');
}
