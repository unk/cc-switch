/**
 * Input validation shared by the interactive flow and CLI argument parsing.
 * Each validator returns an error message string, or null when the value is OK.
 */

// A safe command/alias name: starts alnum, then alnum plus - _ . — no path
// separators, whitespace, or shell metacharacters.
const ALIAS_RE = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

// Reserved names we refuse to shadow to avoid breaking the user's shell.
const RESERVED = new Set([
  'cd',
  'ls',
  'rm',
  'mv',
  'cp',
  'echo',
  'export',
  'alias',
  'unalias',
  'source',
  'exec',
  'sudo',
  'kill',
  'claude',
]);

export function validateAlias(value: string): string | null {
  const v = value.trim();
  if (!v) return 'Alias cannot be empty.';
  if (v.length > 64) return 'Alias is too long (max 64 characters).';
  if (!ALIAS_RE.test(v)) {
    return 'Alias may contain only letters, digits, "-", "_", "." and must start with a letter or digit.';
  }
  if (RESERVED.has(v)) return `"${v}" is a reserved command name — choose another alias.`;
  return null;
}

export function validateBaseUrl(value: string): string | null {
  const v = value.trim();
  if (!v) return 'Base URL cannot be empty.';
  let url: URL;
  try {
    url = new URL(v);
  } catch {
    return 'Base URL must be a valid URL (e.g. https://openrouter.ai/api).';
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return 'Base URL must use http or https.';
  }
  return null;
}

export function validateRequired(label: string): (value: string) => string | null {
  return (value: string) => (value.trim().length === 0 ? `${label} cannot be empty.` : null);
}
