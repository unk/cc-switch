import fs from 'node:fs';
import path from 'node:path';
import { backupFile, fileExists, readText } from '../util/fs.js';
import { home } from '../core/paths.js';
import type { ShellName } from './shell.js';

/**
 * Render a config dir for embedding in a shell command, preferring $HOME so the
 * line is portable and doesn't leak the absolute home path.
 */
export function renderConfigDir(configDir: string): string {
  const h = home();
  if (configDir === h) return '"$HOME"';
  if (configDir.startsWith(h + path.sep)) {
    return `"$HOME/${configDir.slice(h.length + 1)}"`;
  }
  return `"${configDir}"`;
}

/** Build the single alias line for the given shell. */
export function aliasLine(alias: string, configDir: string, shell: ShellName): string {
  const cfg = renderConfigDir(configDir);
  if (shell === 'fish') {
    // fish has no POSIX inline env assignment; use `env`.
    return `alias ${alias} 'env CLAUDE_CONFIG_DIR=${cfg} claude'`;
  }
  return `alias ${alias}='CLAUDE_CONFIG_DIR=${cfg} claude'`;
}

const markerStart = (alias: string) => `# >>> cc-switch: ${alias} >>>`;
const markerEnd = (alias: string) => `# <<< cc-switch: ${alias} <<<`;

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function blockRegex(alias: string): RegExp {
  const start = escapeRe(markerStart(alias));
  const end = escapeRe(markerEnd(alias));
  // Match the marker block plus a single trailing newline if present.
  return new RegExp(`${start}[\\s\\S]*?${end}\\n?`, 'g');
}

export function buildBlock(alias: string, configDir: string, shell: ShellName): string {
  return `${markerStart(alias)}\n${aliasLine(alias, configDir, shell)}\n${markerEnd(alias)}\n`;
}

function rcMode(rcPath: string): number {
  try {
    return fs.statSync(rcPath).mode & 0o777;
  } catch {
    return 0o644;
  }
}

function writeRc(rcPath: string, contents: string): void {
  const dir = path.dirname(rcPath);
  fs.mkdirSync(dir, { recursive: true });
  const mode = rcMode(rcPath);
  const tmp = path.join(dir, `.${path.basename(rcPath)}.tmp-${process.pid}`);
  fs.writeFileSync(tmp, contents, { mode });
  fs.chmodSync(tmp, mode);
  fs.renameSync(tmp, rcPath);
}

/** True when the rc file currently contains the marker block for `alias`. */
export function hasAlias(rcPath: string, alias: string): boolean {
  if (!fileExists(rcPath)) return false;
  return blockRegex(alias).test(readText(rcPath));
}

export interface AliasInjectResult {
  rcPath: string;
  backup: string | null;
  /** 'created' | 'updated' | 'unchanged' */
  action: 'created' | 'updated' | 'unchanged';
}

/**
 * Inject (or replace) the marker block for `alias` in the rc file. Idempotent:
 * re-running with the same values is a no-op; changed values replace the block
 * in place. A backup is taken before any modification.
 */
export function injectAlias(
  rcPath: string,
  alias: string,
  configDir: string,
  shell: ShellName,
): AliasInjectResult {
  const block = buildBlock(alias, configDir, shell);
  const exists = fileExists(rcPath);
  const original = exists ? readText(rcPath) : '';
  const re = blockRegex(alias);
  const hadBlock = re.test(original);

  let next: string;
  if (hadBlock) {
    next = original.replace(blockRegex(alias), block);
  } else {
    const sep = original.length === 0 || original.endsWith('\n') ? '' : '\n';
    const lead = original.length === 0 ? '' : '\n';
    next = `${original}${sep}${lead}${block}`;
  }

  if (next === original) {
    return { rcPath, backup: null, action: 'unchanged' };
  }

  const backup = backupFile(rcPath);
  writeRc(rcPath, next);
  return { rcPath, backup, action: hadBlock ? 'updated' : 'created' };
}

/** Remove the marker block for `alias`. Returns true if something was removed. */
export function removeAlias(
  rcPath: string,
  alias: string,
): { removed: boolean; backup: string | null } {
  if (!fileExists(rcPath)) return { removed: false, backup: null };
  const original = readText(rcPath);
  if (!blockRegex(alias).test(original)) return { removed: false, backup: null };

  let next = original.replace(blockRegex(alias), '');
  // Collapse any 3+ newline run left behind into a single blank line.
  next = next.replace(/\n{3,}/g, '\n\n');
  const backup = backupFile(rcPath);
  writeRc(rcPath, next);
  return { removed: true, backup };
}
