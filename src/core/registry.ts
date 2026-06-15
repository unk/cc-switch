import { readJson, writeJson } from '../util/fs.js';
import { registryPath } from './paths.js';
import { emptyRegistry, type Profile, type Registry } from './profile.js';

/** Load the central registry, returning an empty one when absent. */
export function loadRegistry(): Registry {
  const reg = readJson<Registry>(registryPath(), emptyRegistry());
  // Defensive: tolerate a hand-edited/older file missing fields.
  if (!reg.profiles) reg.profiles = [];
  if (!reg.version) reg.version = 1;
  return reg;
}

/** Persist the registry with 0600 perms. */
export function saveRegistry(reg: Registry): void {
  writeJson(registryPath(), reg, 0o600);
}

export function getProfile(alias: string): Profile | undefined {
  return loadRegistry().profiles.find((p) => p.alias === alias);
}

export function listProfiles(): Profile[] {
  return loadRegistry()
    .profiles.slice()
    .sort((a, b) => a.alias.localeCompare(b.alias));
}

/** Insert or replace a profile by alias, then persist. */
export function upsertProfile(profile: Profile): void {
  const reg = loadRegistry();
  const idx = reg.profiles.findIndex((p) => p.alias === profile.alias);
  if (idx >= 0) reg.profiles[idx] = profile;
  else reg.profiles.push(profile);
  saveRegistry(reg);
}

/** Remove a profile from the registry. Returns the removed profile, if any. */
export function removeProfile(alias: string): Profile | undefined {
  const reg = loadRegistry();
  const idx = reg.profiles.findIndex((p) => p.alias === alias);
  if (idx < 0) return undefined;
  const [removed] = reg.profiles.splice(idx, 1);
  saveRegistry(reg);
  return removed;
}
