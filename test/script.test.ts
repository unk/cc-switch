import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  buildScript,
  isOurScript,
  removeWrapperScript,
  writeWrapperScript,
} from '../src/installers/script.js';

let tmp: string;

beforeEach(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ccp-script-'));
  process.env.CC_SWITCH_HOME = tmp;
});

afterEach(() => {
  fs.rmSync(tmp, { recursive: true, force: true });
  delete process.env.CC_SWITCH_HOME;
});

describe('buildScript', () => {
  it('exports only CLAUDE_CONFIG_DIR and execs claude', () => {
    const body = buildScript('cc', path.join(tmp, '.cc-switch', 'cc'));
    expect(body).toContain('#!/bin/sh');
    expect(body).toContain('export CLAUDE_CONFIG_DIR="$HOME/.cc-switch/cc"');
    expect(body).toContain('exec claude "$@"');
    expect(body).not.toContain('ANTHROPIC');
  });
});

describe('writeWrapperScript', () => {
  it('writes an executable (0755) script we recognize as ours', () => {
    const sp = path.join(tmp, 'bin', 'cc');
    const res = writeWrapperScript(sp, 'cc', path.join(tmp, '.cc-switch', 'cc'));
    expect(res.action).toBe('created');
    expect(fs.statSync(sp).mode & 0o777).toBe(0o755);
    expect(isOurScript(sp)).toBe(true);
  });

  it('overwrites its own script (idempotent updates)', () => {
    const sp = path.join(tmp, 'bin', 'cc');
    writeWrapperScript(sp, 'cc', path.join(tmp, 'a'));
    const res = writeWrapperScript(sp, 'cc', path.join(tmp, 'b'));
    expect(res.action).toBe('updated');
  });

  it('refuses to clobber a foreign file', () => {
    const sp = path.join(tmp, 'bin', 'cc');
    fs.mkdirSync(path.dirname(sp), { recursive: true });
    fs.writeFileSync(sp, '#!/bin/sh\necho not ours\n');
    expect(() => writeWrapperScript(sp, 'cc', path.join(tmp, 'a'))).toThrow(
      /Refusing to overwrite/,
    );
  });
});

describe('removeWrapperScript', () => {
  it('removes our script and ignores foreign files', () => {
    const sp = path.join(tmp, 'bin', 'cc');
    writeWrapperScript(sp, 'cc', path.join(tmp, 'a'));
    expect(removeWrapperScript(sp)).toBe(true);
    expect(fs.existsSync(sp)).toBe(false);

    const foreign = path.join(tmp, 'bin', 'other');
    fs.writeFileSync(foreign, 'echo hi\n');
    expect(removeWrapperScript(foreign)).toBe(false);
    expect(fs.existsSync(foreign)).toBe(true);
  });
});
