import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { applyProfile } from '../src/core/apply.js';
import { getProfile } from '../src/core/registry.js';
import type { ShellInfo } from '../src/installers/shell.js';

let tmp: string;

beforeEach(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ccp-e2e-'));
  process.env.CC_SWITCH_HOME = tmp;
});

afterEach(() => {
  fs.rmSync(tmp, { recursive: true, force: true });
  delete process.env.CC_SWITCH_HOME;
});

function shell(): ShellInfo {
  return { name: 'zsh', rcPath: path.join(tmp, '.zshrc') };
}

describe('applyProfile (end-to-end)', () => {
  it('writes config dir, settings, alias, script and registers a custom profile', () => {
    fs.writeFileSync(shell().rcPath, '# rc\n');
    const scriptPath = path.join(tmp, 'bin', 'cc-glm');

    const res = applyProfile({
      alias: 'cc-glm',
      custom: true,
      baseUrl: 'https://api.z.ai/api/anthropic',
      authMethod: 'token',
      secret: 'sk-secret',
      model: 'glm-5.1',
      smallFastModel: 'glm-4.5-air',
      launchers: ['alias', 'script'],
      scriptPath,
      shell: shell(),
      createdAt: '2026-06-14T00:00:00.000Z',
    });

    // config dir + settings.json (0600, holds the secret)
    expect(fs.existsSync(path.join(tmp, '.cc-switch', 'cc-glm'))).toBe(true);
    const settings = JSON.parse(fs.readFileSync(res.settingsPath, 'utf8'));
    expect(settings.env.ANTHROPIC_AUTH_TOKEN).toBe('sk-secret');
    expect(settings.env.ANTHROPIC_MODEL).toBe('glm-5.1');
    expect(fs.statSync(res.settingsPath).mode & 0o777).toBe(0o600);

    // alias injected
    expect(fs.readFileSync(shell().rcPath, 'utf8')).toContain('# >>> cc-switch: cc-glm >>>');

    // script written + executable
    expect(fs.statSync(scriptPath).mode & 0o777).toBe(0o755);

    // registry records metadata WITHOUT the secret
    const stored = getProfile('cc-glm');
    expect(stored?.baseUrl).toBe('https://api.z.ai/api/anthropic');
    expect(JSON.stringify(stored)).not.toContain('sk-secret');
  });

  it('generated wrapper script actually exports CLAUDE_CONFIG_DIR to claude', () => {
    // Fake `claude` that prints the env var the launcher must set.
    const fakeBin = path.join(tmp, 'fakebin');
    fs.mkdirSync(fakeBin, { recursive: true });
    const fakeClaude = path.join(fakeBin, 'claude');
    fs.writeFileSync(fakeClaude, '#!/bin/sh\nprintf "%s" "$CLAUDE_CONFIG_DIR"\n', { mode: 0o755 });
    fs.chmodSync(fakeClaude, 0o755);

    const scriptPath = path.join(tmp, 'bin', 'cc');
    applyProfile({
      alias: 'cc',
      custom: false,
      launchers: ['script'],
      scriptPath,
      shell: shell(),
      createdAt: '2026-06-14T00:00:00.000Z',
    });

    const out = execFileSync(scriptPath, [], {
      env: { ...process.env, PATH: `${fakeBin}:${process.env.PATH ?? ''}`, HOME: tmp },
      encoding: 'utf8',
    });
    expect(out).toBe(path.join(tmp, '.cc-switch', 'cc'));
  });
});
