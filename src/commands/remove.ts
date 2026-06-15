import * as p from '@clack/prompts';
import { configDirFor, tildify } from '../core/paths.js';
import { getProfile, removeProfile } from '../core/registry.js';
import { removeAlias } from '../installers/alias.js';
import { removeWrapperScript } from '../installers/script.js';
import { removeDir, fileExists } from '../util/fs.js';
import { color, error, info } from '../util/log.js';

export async function runRemove(aliasArg?: string): Promise<number> {
  if (!aliasArg) {
    error('Usage: cc-switch remove <alias>');
    return 1;
  }

  const profile = getProfile(aliasArg);
  if (!profile) {
    error(`No profile named "${aliasArg}". Run \`cc-switch list\` to see profiles.`);
    return 1;
  }

  p.intro(color.bold(`Remove profile "${profile.alias}"`));

  const confirmed = await p.confirm({
    message: `Remove launchers and registry entry for "${profile.alias}"?`,
    initialValue: true,
  });
  if (p.isCancel(confirmed) || !confirmed) {
    p.cancel('Aborted. Nothing changed.');
    return 0;
  }

  const summary: string[] = [];

  // 1. Remove alias block from the shell rc (if installed).
  if (profile.launchers.includes('alias') && profile.shellRc) {
    const { removed, backup } = removeAlias(profile.shellRc, profile.alias);
    if (removed) {
      summary.push(`Removed alias from ${tildify(profile.shellRc)}`);
      if (backup) summary.push(`  backup: ${tildify(backup)}`);
    }
  }

  // 2. Remove wrapper script (if ours).
  if (profile.scriptPath && fileExists(profile.scriptPath)) {
    if (removeWrapperScript(profile.scriptPath)) {
      summary.push(`Removed script ${tildify(profile.scriptPath)}`);
    } else {
      summary.push(`Left ${tildify(profile.scriptPath)} (not a cc-switch script)`);
    }
  }

  // 3. Offer to delete the isolated config dir (holds credentials + sessions).
  const configDir = profile.configDir || configDirFor(profile.alias);
  if (fileExists(configDir)) {
    const delDir = await p.confirm({
      message: `Also delete ${tildify(configDir)}? This erases its login + session history.`,
      initialValue: false,
    });
    if (!p.isCancel(delDir) && delDir) {
      removeDir(configDir);
      summary.push(`Deleted config dir ${tildify(configDir)}`);
    } else {
      summary.push(`Kept config dir ${tildify(configDir)}`);
    }
  }

  // 4. Drop from registry.
  removeProfile(profile.alias);
  summary.push('Removed registry entry');

  p.outro(color.green('Done.'));
  for (const line of summary) info(`  ${line}`);

  if (profile.launchers.includes('alias') && profile.shellRc) {
    info('');
    info(
      color.dim(`Open a new shell (or 'source ${tildify(profile.shellRc)}') to drop the alias.`),
    );
  }
  return 0;
}
