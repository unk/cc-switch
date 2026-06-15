import { listProfiles } from '../core/registry.js';
import { tildify } from '../core/paths.js';
import { color, info } from '../util/log.js';

function pad(s: string, width: number): string {
  return s.length >= width ? s : s + ' '.repeat(width - s.length);
}

export function runList(): number {
  const profiles = listProfiles();
  if (profiles.length === 0) {
    info('No profiles yet. Run `cc-switch create` to add one.');
    return 0;
  }

  const rows = profiles.map((p) => ({
    alias: p.alias,
    model: p.model ?? (p.custom ? '(gateway default)' : '(account default)'),
    type: p.custom ? 'custom' : 'standard',
    launchers: p.launchers.join(', ') || '—',
    configDir: tildify(p.configDir),
  }));

  const headers = {
    alias: 'ALIAS',
    model: 'MODEL',
    type: 'TYPE',
    launchers: 'LAUNCHERS',
    configDir: 'CONFIG DIR',
  };
  const widths = {
    alias: Math.max(headers.alias.length, ...rows.map((r) => r.alias.length)),
    model: Math.max(headers.model.length, ...rows.map((r) => r.model.length)),
    type: Math.max(headers.type.length, ...rows.map((r) => r.type.length)),
    launchers: Math.max(headers.launchers.length, ...rows.map((r) => r.launchers.length)),
  };

  info(
    color.bold(
      `${pad(headers.alias, widths.alias)}  ${pad(headers.model, widths.model)}  ${pad(headers.type, widths.type)}  ${pad(headers.launchers, widths.launchers)}  ${headers.configDir}`,
    ),
  );
  for (const r of rows) {
    info(
      `${pad(r.alias, widths.alias)}  ${pad(r.model, widths.model)}  ${pad(r.type, widths.type)}  ${pad(r.launchers, widths.launchers)}  ${color.dim(r.configDir)}`,
    );
  }
  return 0;
}
