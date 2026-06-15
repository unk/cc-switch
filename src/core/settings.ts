import { readJson, writeJson } from '../util/fs.js';
import { settingsPathFor } from './paths.js';
import type { AuthMethod } from './profile.js';

/**
 * The env keys this tool owns inside a profile's settings.json. We strip all of
 * these before re-applying, so switching auth method or custom→standard never
 * leaves a stale key behind. Any other keys in settings.json are user-owned and
 * preserved untouched.
 */
const MANAGED_ENV_KEYS = [
  'ANTHROPIC_BASE_URL',
  'ANTHROPIC_AUTH_TOKEN',
  'ANTHROPIC_API_KEY',
  'ANTHROPIC_MODEL',
  'ANTHROPIC_SMALL_FAST_MODEL',
] as const;

export interface ProfileSettingsSpec {
  custom: boolean;
  baseUrl?: string;
  authMethod?: AuthMethod;
  /** The token (Bearer) or api key value. Only used to write settings.json. */
  secret?: string;
  model?: string;
  smallFastModel?: string;
}

interface ClaudeSettings {
  env?: Record<string, string>;
  [key: string]: unknown;
}

/** Build just the managed env subset for a profile. */
export function buildManagedEnv(spec: ProfileSettingsSpec): Record<string, string> {
  const env: Record<string, string> = {};
  if (spec.custom) {
    if (spec.baseUrl) env.ANTHROPIC_BASE_URL = spec.baseUrl;
    if (spec.secret) {
      // Bearer token vs. x-api-key. Never set both — API_KEY would win over the
      // bearer token (see PLAN §2.2), so a token profile must omit API_KEY.
      if (spec.authMethod === 'apiKey') env.ANTHROPIC_API_KEY = spec.secret;
      else env.ANTHROPIC_AUTH_TOKEN = spec.secret;
    }
  }
  // A fixed model may be set for both custom and standard profiles.
  if (spec.model) env.ANTHROPIC_MODEL = spec.model;
  // Deprecated key, kept to match the interactive label (PLAN §7.1). May be
  // complemented with ANTHROPIC_DEFAULT_HAIKU_MODEL after real-model verification.
  if (spec.smallFastModel) env.ANTHROPIC_SMALL_FAST_MODEL = spec.smallFastModel;
  return env;
}

/**
 * Write the profile's settings.json (0600), merging our managed env keys into
 * any existing settings while preserving user-owned keys.
 */
export function writeProfileSettings(alias: string, spec: ProfileSettingsSpec): string {
  const p = settingsPathFor(alias);
  const existing = readJson<ClaudeSettings>(p, {});

  const env: Record<string, string> = { ...(existing.env ?? {}) };
  for (const key of MANAGED_ENV_KEYS) delete env[key];
  Object.assign(env, buildManagedEnv(spec));

  const next: ClaudeSettings = { ...existing };
  if (Object.keys(env).length > 0) next.env = env;
  else delete next.env;

  writeJson(p, next, 0o600);
  return p;
}
