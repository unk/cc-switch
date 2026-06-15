/**
 * Minimal logging helpers for non-interactive output (list/remove/errors).
 * Interactive flows use @clack/prompts directly; these are for plain stdout.
 */

const useColor = process.stdout.isTTY && !process.env.NO_COLOR;

const wrap = (code: string) => (s: string) => (useColor ? `\x1b[${code}m${s}\x1b[0m` : s);

export const color = {
  dim: wrap('2'),
  bold: wrap('1'),
  red: wrap('31'),
  green: wrap('32'),
  yellow: wrap('33'),
  cyan: wrap('36'),
};

export function info(msg: string): void {
  process.stdout.write(`${msg}\n`);
}

export function warn(msg: string): void {
  process.stderr.write(`${color.yellow('!')} ${msg}\n`);
}

export function error(msg: string): void {
  process.stderr.write(`${color.red('✖')} ${msg}\n`);
}

export function success(msg: string): void {
  process.stdout.write(`${color.green('✔')} ${msg}\n`);
}
