import fs from 'node:fs';
import path from 'node:path';
import { rootDir, tildify } from '../core/paths.js';
import { listProfiles } from '../core/registry.js';
import { hasAlias } from '../installers/alias.js';
import { isOurScript } from '../installers/script.js';
import { claudeInstalled, isOnPath } from '../installers/shell.js';
import { color, info } from '../util/log.js';

const OK = color.green('✔');
const BAD = color.red('✖');
const WARN = color.yellow('!');

function line(status: string, label: string, detail = ''): void {
  info(`  ${status} ${label}${detail ? color.dim(`  ${detail}`) : ''}`);
}

/** Lightweight environment + profile health check. Returns 0 if no errors. */
export function runDoctor(): number {
  let errors = 0;

  info(color.bold('Environment'));
  if (claudeInstalled()) {
    line(OK, 'claude is on PATH');
  } else {
    line(BAD, 'claude not found on PATH', 'install Claude Code first');
    errors += 1;
  }
  line(OK, 'profiles root', tildify(rootDir()));

  const profiles = listProfiles();
  info('');
  info(color.bold(`Profiles (${profiles.length})`));
  if (profiles.length === 0) {
    info(color.dim('  none yet — run `cc-switch create`'));
  }

  for (const p of profiles) {
    info(color.bold(`  ${p.alias}`));

    // config dir
    if (fs.existsSync(p.configDir)) line(OK, 'config dir', tildify(p.configDir));
    else {
      line(BAD, 'config dir missing', tildify(p.configDir));
      errors += 1;
    }

    // settings.json + perms
    const settings = path.join(p.configDir, 'settings.json');
    if (fs.existsSync(settings)) {
      const mode = fs.statSync(settings).mode & 0o777;
      if (mode === 0o600) line(OK, 'settings.json', '0600');
      else line(WARN, 'settings.json perms not 0600', `0${mode.toString(8)}`);
    } else {
      line(WARN, 'settings.json missing', tildify(settings));
    }

    // alias launcher
    if (p.launchers.includes('alias')) {
      if (p.shellRc && hasAlias(p.shellRc, p.alias)) {
        line(OK, 'alias installed', tildify(p.shellRc));
      } else {
        line(BAD, 'alias block missing from rc', p.shellRc ? tildify(p.shellRc) : '(unknown rc)');
        errors += 1;
      }
    }

    // script launcher
    if (p.launchers.includes('script') && p.scriptPath) {
      if (isOurScript(p.scriptPath)) {
        line(OK, 'wrapper script', tildify(p.scriptPath));
        const dir = path.dirname(p.scriptPath);
        if (isOnPath(dir)) line(OK, 'script dir on PATH', tildify(dir));
        else {
          line(WARN, 'script dir not on PATH', tildify(dir));
        }
      } else {
        line(BAD, 'wrapper script missing', tildify(p.scriptPath));
        errors += 1;
      }
    }
  }

  info('');
  if (errors === 0) info(color.green('No problems found.'));
  else info(color.red(`${errors} problem(s) found.`));
  return errors === 0 ? 0 : 1;
}
