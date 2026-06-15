import fs from 'node:fs';
import path from 'node:path';
import { fileExists, readText } from '../util/fs.js';
import { renderConfigDir } from './alias.js';

const SCRIPT_MARKER = '# cc-switch launcher:';

/** Build the wrapper-script body. Exports only CLAUDE_CONFIG_DIR (secrets stay in settings.json). */
export function buildScript(alias: string, configDir: string): string {
  return [
    '#!/bin/sh',
    `${SCRIPT_MARKER} ${alias}`,
    `export CLAUDE_CONFIG_DIR=${renderConfigDir(configDir)}`,
    'exec claude "$@"',
    '',
  ].join('\n');
}

/** True when the file at scriptPath is one we generated (safe to overwrite/remove). */
export function isOurScript(scriptPath: string): boolean {
  if (!fileExists(scriptPath)) return false;
  try {
    return readText(scriptPath).includes(SCRIPT_MARKER);
  } catch {
    return false;
  }
}

export interface ScriptWriteResult {
  scriptPath: string;
  action: 'created' | 'updated';
}

/**
 * Write an executable (0755) wrapper script. Refuses to clobber a pre-existing
 * file that we did not create.
 */
export function writeWrapperScript(
  scriptPath: string,
  alias: string,
  configDir: string,
): ScriptWriteResult {
  const existed = fileExists(scriptPath);
  if (existed && !isOurScript(scriptPath)) {
    throw new Error(
      `Refusing to overwrite ${scriptPath}: it exists and is not a cc-switch script.`,
    );
  }
  fs.mkdirSync(path.dirname(scriptPath), { recursive: true });
  const tmp = path.join(
    path.dirname(scriptPath),
    `.${path.basename(scriptPath)}.tmp-${process.pid}`,
  );
  fs.writeFileSync(tmp, buildScript(alias, configDir), { mode: 0o755 });
  fs.chmodSync(tmp, 0o755);
  fs.renameSync(tmp, scriptPath);
  return { scriptPath, action: existed ? 'updated' : 'created' };
}

/** Remove a wrapper script if it is ours. Returns true if removed. */
export function removeWrapperScript(scriptPath: string): boolean {
  if (!isOurScript(scriptPath)) return false;
  fs.unlinkSync(scriptPath);
  return true;
}
