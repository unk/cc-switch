import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  getProfile,
  listProfiles,
  loadRegistry,
  removeProfile,
  upsertProfile,
} from '../src/core/registry.js';
import { registryPath } from '../src/core/paths.js';
import type { Profile } from '../src/core/profile.js';

let tmp: string;

function makeProfile(alias: string, over: Partial<Profile> = {}): Profile {
  return {
    alias,
    configDir: `/tmp/${alias}`,
    custom: false,
    launchers: ['alias'],
    createdAt: '2026-06-14T00:00:00.000Z',
    ...over,
  };
}

beforeEach(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ccp-reg-'));
  process.env.CC_SWITCH_HOME = tmp;
});

afterEach(() => {
  fs.rmSync(tmp, { recursive: true, force: true });
  delete process.env.CC_SWITCH_HOME;
});

describe('registry', () => {
  it('starts empty', () => {
    expect(loadRegistry()).toEqual({ version: 1, profiles: [] });
    expect(listProfiles()).toEqual([]);
  });

  it('upserts and reads back a profile', () => {
    upsertProfile(makeProfile('cc'));
    expect(getProfile('cc')?.alias).toBe('cc');
    expect(listProfiles()).toHaveLength(1);
  });

  it('replaces on duplicate alias instead of appending', () => {
    upsertProfile(makeProfile('cc', { model: 'a' }));
    upsertProfile(makeProfile('cc', { model: 'b' }));
    expect(listProfiles()).toHaveLength(1);
    expect(getProfile('cc')?.model).toBe('b');
  });

  it('lists profiles sorted by alias', () => {
    upsertProfile(makeProfile('zebra'));
    upsertProfile(makeProfile('alpha'));
    expect(listProfiles().map((p) => p.alias)).toEqual(['alpha', 'zebra']);
  });

  it('removes a profile and returns it', () => {
    upsertProfile(makeProfile('cc'));
    const removed = removeProfile('cc');
    expect(removed?.alias).toBe('cc');
    expect(getProfile('cc')).toBeUndefined();
    expect(removeProfile('cc')).toBeUndefined();
  });

  it('writes the registry file with 0600 perms', () => {
    upsertProfile(makeProfile('cc'));
    const mode = fs.statSync(registryPath()).mode & 0o777;
    expect(mode).toBe(0o600);
  });
});
