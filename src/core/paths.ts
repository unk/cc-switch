import os from 'node:os';
import path from 'node:path';

/**
 * Central path resolver for all runtime artifacts.
 *
 * The root can be overridden via CC_SWITCH_HOME (used by tests and advanced
 * users). Everything the tool manages lives under this root, except the wrapper
 * scripts which go to a user-chosen bin dir (default ~/.local/bin).
 */

export function home(): string {
  return process.env.CC_SWITCH_HOME && process.env.CC_SWITCH_HOME.trim().length > 0
    ? path.resolve(process.env.CC_SWITCH_HOME)
    : os.homedir();
}

/** Root directory the tool manages: ~/.cc-switch */
export function rootDir(): string {
  return path.join(home(), '.cc-switch');
}

/** Central registry file: ~/.cc-switch/profiles.json */
export function registryPath(): string {
  return path.join(rootDir(), 'profiles.json');
}

/** A profile's isolated CLAUDE_CONFIG_DIR: ~/.cc-switch/<alias> */
export function configDirFor(alias: string): string {
  return path.join(rootDir(), alias);
}

/** A profile's settings.json (lives inside its CLAUDE_CONFIG_DIR). */
export function settingsPathFor(alias: string): string {
  return path.join(configDirFor(alias), 'settings.json');
}

/** Default install dir for wrapper scripts. */
export function defaultBinDir(): string {
  return path.join(home(), '.local', 'bin');
}

/**
 * Expand a leading ~ to the home directory so user-entered paths like
 * "~/.local/bin" resolve correctly.
 */
export function expandHome(p: string): string {
  if (p === '~') return home();
  if (p.startsWith('~/')) return path.join(home(), p.slice(2));
  return path.resolve(p);
}

/** Render an absolute path back with ~ for display. */
export function tildify(p: string): string {
  const h = home();
  return p.startsWith(h) ? `~${p.slice(h.length)}` : p;
}
