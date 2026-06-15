import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { buildManagedEnv, writeProfileSettings } from '../src/core/settings.js';
import { settingsPathFor } from '../src/core/paths.js';

let tmp: string;

beforeEach(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ccp-set-'));
  process.env.CC_SWITCH_HOME = tmp;
});

afterEach(() => {
  fs.rmSync(tmp, { recursive: true, force: true });
  delete process.env.CC_SWITCH_HOME;
});

describe('buildManagedEnv', () => {
  it('sets token + baseUrl + models for a custom token profile', () => {
    const env = buildManagedEnv({
      custom: true,
      authMethod: 'token',
      baseUrl: 'https://gw/api',
      secret: 'sk-tok',
      model: 'glm-5.1',
      smallFastModel: 'glm-4.5-air',
    });
    expect(env).toEqual({
      ANTHROPIC_BASE_URL: 'https://gw/api',
      ANTHROPIC_AUTH_TOKEN: 'sk-tok',
      ANTHROPIC_MODEL: 'glm-5.1',
      ANTHROPIC_SMALL_FAST_MODEL: 'glm-4.5-air',
    });
  });

  it('never sets both AUTH_TOKEN and API_KEY', () => {
    const tok = buildManagedEnv({
      custom: true,
      authMethod: 'token',
      secret: 's',
      baseUrl: 'https://g',
    });
    expect(tok.ANTHROPIC_API_KEY).toBeUndefined();
    expect(tok.ANTHROPIC_AUTH_TOKEN).toBe('s');

    const key = buildManagedEnv({
      custom: true,
      authMethod: 'apiKey',
      secret: 's',
      baseUrl: 'https://g',
    });
    expect(key.ANTHROPIC_AUTH_TOKEN).toBeUndefined();
    expect(key.ANTHROPIC_API_KEY).toBe('s');
  });

  it('omits gateway keys for a standard profile but keeps a pinned model', () => {
    const env = buildManagedEnv({ custom: false, model: 'claude-opus-4-8' });
    expect(env).toEqual({ ANTHROPIC_MODEL: 'claude-opus-4-8' });
  });
});

describe('writeProfileSettings', () => {
  it('writes settings.json with env and 0600 perms', () => {
    writeProfileSettings('cc', {
      custom: true,
      authMethod: 'token',
      baseUrl: 'https://g',
      secret: 't',
    });
    const p = settingsPathFor('cc');
    const json = JSON.parse(fs.readFileSync(p, 'utf8'));
    expect(json.env.ANTHROPIC_AUTH_TOKEN).toBe('t');
    expect(fs.statSync(p).mode & 0o777).toBe(0o600);
  });

  it('preserves user-owned keys and strips stale managed keys on re-write', () => {
    const p = settingsPathFor('cc');
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(
      p,
      JSON.stringify({ includeCoAuthoredBy: false, env: { ANTHROPIC_API_KEY: 'old', FOO: 'bar' } }),
    );

    // Re-write as a token profile: API_KEY must be gone, FOO + top-level key kept.
    writeProfileSettings('cc', {
      custom: true,
      authMethod: 'token',
      baseUrl: 'https://g',
      secret: 't',
    });
    const json = JSON.parse(fs.readFileSync(p, 'utf8'));
    expect(json.includeCoAuthoredBy).toBe(false);
    expect(json.env.FOO).toBe('bar');
    expect(json.env.ANTHROPIC_API_KEY).toBeUndefined();
    expect(json.env.ANTHROPIC_AUTH_TOKEN).toBe('t');
  });
});
