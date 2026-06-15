import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { aliasLine, injectAlias, removeAlias, renderConfigDir } from '../src/installers/alias.js';

let tmp: string;
let rc: string;

beforeEach(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ccp-alias-'));
  process.env.CC_SWITCH_HOME = tmp;
  rc = path.join(tmp, '.zshrc');
});

afterEach(() => {
  fs.rmSync(tmp, { recursive: true, force: true });
  delete process.env.CC_SWITCH_HOME;
});

describe('renderConfigDir', () => {
  it('prefers $HOME for paths under home', () => {
    expect(renderConfigDir(path.join(tmp, '.cc-switch', 'cc'))).toBe('"$HOME/.cc-switch/cc"');
  });
  it('uses an absolute quoted path otherwise', () => {
    expect(renderConfigDir('/opt/x')).toBe('"/opt/x"');
  });
});

describe('aliasLine', () => {
  it('uses POSIX inline env for zsh/bash', () => {
    expect(aliasLine('cc', path.join(tmp, '.cc-switch', 'cc'), 'zsh')).toBe(
      `alias cc='CLAUDE_CONFIG_DIR="$HOME/.cc-switch/cc" claude'`,
    );
  });
  it('uses env(1) for fish', () => {
    expect(aliasLine('cc', path.join(tmp, '.cc-switch', 'cc'), 'fish')).toBe(
      `alias cc 'env CLAUDE_CONFIG_DIR="$HOME/.cc-switch/cc" claude'`,
    );
  });
});

describe('injectAlias', () => {
  it('creates a marker block in a fresh rc', () => {
    fs.writeFileSync(rc, '# my rc\nexport FOO=1\n');
    const res = injectAlias(rc, 'cc', path.join(tmp, '.cc-switch', 'cc'), 'zsh');
    expect(res.action).toBe('created');
    const text = fs.readFileSync(rc, 'utf8');
    expect(text).toContain('# >>> cc-switch: cc >>>');
    expect(text).toContain("alias cc='CLAUDE_CONFIG_DIR=");
    expect(text).toContain('export FOO=1');
  });

  it('is idempotent — re-running with same values changes nothing', () => {
    const dir = path.join(tmp, '.cc-switch', 'cc');
    injectAlias(rc, 'cc', dir, 'zsh');
    const first = fs.readFileSync(rc, 'utf8');
    const res = injectAlias(rc, 'cc', dir, 'zsh');
    expect(res.action).toBe('unchanged');
    expect(fs.readFileSync(rc, 'utf8')).toBe(first);
  });

  it('replaces the block in place when values change (no duplicates)', () => {
    injectAlias(rc, 'cc', path.join(tmp, 'a'), 'zsh');
    const res = injectAlias(rc, 'cc', path.join(tmp, 'b'), 'zsh');
    expect(res.action).toBe('updated');
    const text = fs.readFileSync(rc, 'utf8');
    expect(text.match(/# >>> cc-switch: cc >>>/g)).toHaveLength(1);
    expect(text).toContain('"$HOME/b"');
    expect(text).not.toContain('"$HOME/a"');
  });

  it('backs up the rc before modifying', () => {
    fs.writeFileSync(rc, 'orig\n');
    const res = injectAlias(rc, 'cc', path.join(tmp, 'a'), 'zsh');
    expect(res.backup).toBeTruthy();
    expect(fs.readFileSync(res.backup as string, 'utf8')).toBe('orig\n');
  });

  it('keeps blocks for different aliases independent', () => {
    injectAlias(rc, 'cc', path.join(tmp, 'a'), 'zsh');
    injectAlias(rc, 'cc-glm', path.join(tmp, 'b'), 'zsh');
    const text = fs.readFileSync(rc, 'utf8');
    expect(text).toContain('cc-switch: cc >>>');
    expect(text).toContain('cc-switch: cc-glm >>>');
  });
});

describe('removeAlias', () => {
  it('removes only the targeted block', () => {
    injectAlias(rc, 'cc', path.join(tmp, 'a'), 'zsh');
    injectAlias(rc, 'cc-glm', path.join(tmp, 'b'), 'zsh');
    const res = removeAlias(rc, 'cc');
    expect(res.removed).toBe(true);
    const text = fs.readFileSync(rc, 'utf8');
    expect(text).not.toContain('cc-switch: cc >>>');
    expect(text).toContain('cc-switch: cc-glm >>>');
  });

  it('returns removed=false when there is nothing to remove', () => {
    fs.writeFileSync(rc, 'nothing here\n');
    expect(removeAlias(rc, 'cc').removed).toBe(false);
  });
});
