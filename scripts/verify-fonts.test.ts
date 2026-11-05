import { execFile } from 'node:child_process';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { promisify } from 'node:util';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { verifyFonts } from './verify-fonts.mjs';

const run = promisify(execFile);
const script = resolve(import.meta.dirname, 'verify-fonts.mjs');

const entry = (over: Record<string, unknown> = {}) => ({
  id: 'lora-400',
  family: 'Lora',
  category: 'serif',
  weight: 400,
  style: 'normal',
  file: 'lora/Lora.ttf',
  license: 'OFL-1.1',
  caseTransform: 'none',
  ...over,
});

let root: string;
const fontsDir = () => join(root, 'assets', 'fonts');

async function tree(manifest: unknown[], files: Record<string, string>) {
  await mkdir(fontsDir(), { recursive: true });
  await writeFile(join(fontsDir(), 'fonts.manifest.json'), JSON.stringify(manifest));
  for (const [path, content] of Object.entries(files)) {
    await mkdir(join(fontsDir(), path, '..'), { recursive: true });
    await writeFile(join(fontsDir(), path), content);
  }
}

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'framer-fonts-'));
});
afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

describe('verifyFonts', () => {
  it('returns no problems for a valid tree', async () => {
    await tree([entry()], { 'lora/Lora.ttf': 'x', 'lora/OFL.txt': 'license' });
    expect(await verifyFonts(root)).toEqual([]);
  });

  it('reports a missing font file', async () => {
    await tree([entry()], { 'lora/OFL.txt': 'license' });
    const problems: string[] = await verifyFonts(root);
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain('lora-400');
    expect(problems[0]).toContain('lora/Lora.ttf');
  });

  it('reports a family folder without OFL.txt', async () => {
    await tree([entry()], { 'lora/Lora.ttf': 'x' });
    const problems: string[] = await verifyFonts(root);
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain('OFL.txt');
    expect(problems[0]).toContain('lora');
  });

  it('reports a non-OFL license', async () => {
    await tree([entry({ license: 'Apache-2.0' })], { 'lora/Lora.ttf': 'x', 'lora/OFL.txt': 'l' });
    const problems: string[] = await verifyFonts(root);
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain('lora-400');
    expect(problems[0]).toContain('Apache-2.0');
  });

  it('reports a duplicated id', async () => {
    await tree([entry(), entry()], { 'lora/Lora.ttf': 'x', 'lora/OFL.txt': 'l' });
    const problems: string[] = await verifyFonts(root);
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain('lora-400');
    expect(problems[0]).toMatch(/duplicate/i);
  });

  it('exits non-zero and prints every problem from the CLI', async () => {
    await tree([entry(), entry({ id: 'x-400', file: 'x/X.ttf', license: 'MIT' })], { 'lora/Lora.ttf': 'x' });
    const err = await run('node', [script], { cwd: root }).then(
      () => null,
      (e: { code: number; stderr: string }) => e,
    );
    expect(err?.code).not.toBe(0);
    expect(err?.stderr).toContain('OFL.txt');
    expect(err?.stderr).toContain('x/X.ttf');
    expect(err?.stderr).toContain('MIT');
  });

  it('exits zero from the CLI when everything is fine', async () => {
    await tree([entry()], { 'lora/Lora.ttf': 'x', 'lora/OFL.txt': 'l' });
    await expect(run('node', [script], { cwd: root })).resolves.toBeTruthy();
  });
});
