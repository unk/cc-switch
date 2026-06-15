import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileExists } from '../util/fs.js';
import { home } from '../core/paths.js';

export type ShellName = 'zsh' | 'bash' | 'fish' | 'unknown';

export interface ShellInfo {
  name: ShellName;
  /** rc file to inject aliases into (may not exist yet). */
  rcPath: string;
}

/** Detect the user's login shell from $SHELL and map it to its rc file. */
export function detectShell(): ShellInfo {
  const shellPath = process.env.SHELL ?? '';
  const base = path.basename(shellPath);
  const h = home();

  if (base === 'zsh') {
    const zdot = process.env.ZDOTDIR && process.env.ZDOTDIR.trim() ? process.env.ZDOTDIR : h;
    return { name: 'zsh', rcPath: path.join(zdot, '.zshrc') };
  }
  if (base === 'bash') {
    // Prefer ~/.bashrc; fall back to ~/.bash_profile when only that exists.
    const bashrc = path.join(h, '.bashrc');
    const bashProfile = path.join(h, '.bash_profile');
    if (!fileExists(bashrc) && fileExists(bashProfile)) {
      return { name: 'bash', rcPath: bashProfile };
    }
    return { name: 'bash', rcPath: bashrc };
  }
  if (base === 'fish') {
    return { name: 'fish', rcPath: path.join(h, '.config', 'fish', 'config.fish') };
  }
  return { name: 'unknown', rcPath: path.join(h, '.profile') };
}

/** True if `claude` is resolvable on PATH. */
export function claudeInstalled(): boolean {
  return commandExists('claude');
}

/**
 * Check whether a command name resolves on PATH (existing binary). Used to warn
 * about alias collisions. Returns false on any lookup failure.
 */
export function commandExists(name: string): boolean {
  try {
    // Pass `name` as $0 so it is never interpreted as part of the script.
    execFileSync('/bin/sh', ['-c', 'command -v "$0"', name], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

/** True if `dir` is present in the current PATH. */
export function isOnPath(dir: string): boolean {
  const resolved = path.resolve(dir);
  return (process.env.PATH ?? '')
    .split(path.delimiter)
    .some((entry) => entry && path.resolve(entry) === resolved);
}
