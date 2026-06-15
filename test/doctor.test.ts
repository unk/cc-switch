import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { applyProfile } from '../src/core/apply.js';
import { runDoctor } from '../src/commands/doctor.js';
import { configDirFor } from '../src/core/paths.js';
import type { ShellInfo } from '../src/installers/shell.js';

let tmp: string;
let restore: () => void;

beforeEach(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ccp-doc-'));
  process.env.CC_SWITCH_HOME = tmp;
  // Silence doctor's stdout chatter during tests.
  const spy = vi.spyOn(process.stdout, 'write').mockReturnValue(true);
  restore = () => spy.mockRestore();
});

afterEach(() => {
  restore();
  fs.rmSync(tmp, { recursive: true, force: true });
  delete process.env.CC_SWITCH_HOME;
});

function shell(): ShellInfo {
  return { name: 'zsh', rcPath: path.join(tmp, '.zshrc') };
}

describe('runDoctor', () => {
  it('returns 0 for an empty registry', () => {
    expect(runDoctor()).toBe(0);
  });

  it('returns 0 for a healthy applied profile', () => {
    fs.writeFileSync(shell().rcPath, '# rc\n');
    applyProfile({
      alias: 'cc',
      custom: false,
      launchers: ['alias'],
      shell: shell(),
      createdAt: '2026-06-14T00:00:00.000Z',
    });
    expect(runDoctor()).toBe(0);
  });

  it('returns 1 when a profile config dir is missing', () => {
    fs.writeFileSync(shell().rcPath, '# rc\n');
    applyProfile({
      alias: 'cc',
      custom: false,
      launchers: ['alias'],
      shell: shell(),
      createdAt: '2026-06-14T00:00:00.000Z',
    });
    fs.rmSync(configDirFor('cc'), { recursive: true, force: true });
    expect(runDoctor()).toBe(1);
  });
});
