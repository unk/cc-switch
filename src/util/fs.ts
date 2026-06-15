import fs from 'node:fs';
import path from 'node:path';

/** Create a directory (recursive). Owner-only perms for newly created dirs. */
export function ensureDir(dir: string, mode = 0o700): void {
  fs.mkdirSync(dir, { recursive: true, mode });
}

export function fileExists(p: string): boolean {
  try {
    fs.accessSync(p);
    return true;
  } catch {
    return false;
  }
}

export function readText(p: string): string {
  return fs.readFileSync(p, 'utf8');
}

/** Read + parse JSON, returning a fallback when the file is missing. */
export function readJson<T>(p: string, fallback: T): T {
  if (!fileExists(p)) return fallback;
  try {
    return JSON.parse(readText(p)) as T;
  } catch {
    throw new Error(`Failed to parse JSON at ${p} (file may be corrupted)`);
  }
}

/**
 * Atomically write a file with the given mode. Writes to a temp file in the
 * same directory then renames, so a crash never leaves a half-written file.
 */
export function writeFileAtomic(p: string, contents: string, mode = 0o600): void {
  const dir = path.dirname(p);
  ensureDir(dir);
  const tmp = path.join(dir, `.${path.basename(p)}.tmp-${process.pid}`);
  fs.writeFileSync(tmp, contents, { mode });
  // Ensure mode even if the file pre-existed with a different umask outcome.
  fs.chmodSync(tmp, mode);
  fs.renameSync(tmp, p);
}

/** Write a pretty-printed JSON file with restrictive perms (0600 default). */
export function writeJson(p: string, value: unknown, mode = 0o600): void {
  writeFileAtomic(p, `${JSON.stringify(value, null, 2)}\n`, mode);
}

/**
 * Back up a file to "<file>.bak-<n>" without overwriting an existing backup.
 * Returns the backup path, or null if the source did not exist.
 */
export function backupFile(p: string): string | null {
  if (!fileExists(p)) return null;
  let i = 0;
  let target = `${p}.cc-switch.bak`;
  while (fileExists(target)) {
    i += 1;
    target = `${p}.cc-switch.bak.${i}`;
  }
  fs.copyFileSync(p, target);
  return target;
}

export function removeFile(p: string): void {
  try {
    fs.unlinkSync(p);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err;
  }
}

/** Recursively remove a directory if it exists. */
export function removeDir(p: string): void {
  fs.rmSync(p, { recursive: true, force: true });
}
