import { ensureDir } from '../util/fs.js';
import { injectAlias, type AliasInjectResult } from '../installers/alias.js';
import { writeWrapperScript, type ScriptWriteResult } from '../installers/script.js';
import type { ShellInfo } from '../installers/shell.js';
import { configDirFor } from './paths.js';
import type { AuthMethod, Launcher, Profile } from './profile.js';
import { upsertProfile } from './registry.js';
import { writeProfileSettings } from './settings.js';

/** A fully-resolved profile spec produced by the interactive flow (or a test). */
export interface CreateSpec {
  alias: string;
  custom: boolean;
  baseUrl?: string;
  authMethod?: AuthMethod;
  /** Secret value (token or api key). Written to settings.json only. */
  secret?: string;
  model?: string;
  smallFastModel?: string;
  launchers: Launcher[];
  /** Resolved absolute path for the wrapper script (when 'script' is selected). */
  scriptPath?: string;
  /** Detected shell, used when 'alias' is selected. */
  shell: ShellInfo;
  /** ISO creation timestamp. */
  createdAt: string;
}

export interface ApplyResult {
  profile: Profile;
  settingsPath: string;
  aliasResult?: AliasInjectResult;
  scriptResult?: ScriptWriteResult;
}

/**
 * Side-effecting apply step shared by `runCreate` and tests: writes the config
 * dir + settings.json, installs the selected launchers, and records the profile
 * in the registry. Pure of any prompting so it can be exercised headlessly.
 */
export function applyProfile(spec: CreateSpec): ApplyResult {
  const configDir = configDirFor(spec.alias);
  ensureDir(configDir, 0o700);

  const settingsPath = writeProfileSettings(spec.alias, {
    custom: spec.custom,
    baseUrl: spec.baseUrl,
    authMethod: spec.authMethod,
    secret: spec.secret,
    model: spec.model,
    smallFastModel: spec.smallFastModel,
  });

  let aliasResult: AliasInjectResult | undefined;
  if (spec.launchers.includes('alias')) {
    aliasResult = injectAlias(spec.shell.rcPath, spec.alias, configDir, spec.shell.name);
  }

  let scriptResult: ScriptWriteResult | undefined;
  if (spec.launchers.includes('script') && spec.scriptPath) {
    scriptResult = writeWrapperScript(spec.scriptPath, spec.alias, configDir);
  }

  const profile: Profile = {
    alias: spec.alias,
    configDir,
    custom: spec.custom,
    baseUrl: spec.custom ? spec.baseUrl : undefined,
    authMethod: spec.custom ? spec.authMethod : undefined,
    model: spec.model,
    smallFastModel: spec.smallFastModel,
    launchers: spec.launchers,
    scriptPath: spec.scriptPath,
    shellRc: spec.launchers.includes('alias') ? spec.shell.rcPath : undefined,
    createdAt: spec.createdAt,
  };
  upsertProfile(profile);

  return { profile, settingsPath, aliasResult, scriptResult };
}
