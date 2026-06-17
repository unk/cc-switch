/** Authentication method for a custom-model (gateway) profile. */
export type AuthMethod = 'token' | 'apiKey';

/** A launcher kind the user can install for a profile. */
export type Launcher = 'alias' | 'script';

/**
 * A profile as persisted in the central registry (~/.cc-switch/profiles.json).
 *
 * SECURITY: secrets (auth token / api key) are NEVER stored here. They live only
 * in the profile's settings.json (0600). The registry holds reconstruction
 * metadata so we can list/remove/edit profiles without exposing secrets.
 */
export interface Profile {
  /** Launch command name, e.g. "cc". Unique key. */
  alias: string;
  /** Absolute path to this profile's CLAUDE_CONFIG_DIR. */
  configDir: string;
  /** Whether this profile routes to a custom model gateway. */
  custom: boolean;
  /** Gateway base URL (custom only). */
  baseUrl?: string;
  /** How the gateway authenticates (custom only). */
  authMethod?: AuthMethod;
  /** Default model override (e.g. "anthropic/claude-opus-4.8"). */
  model?: string;
  /** Small/fast model override (e.g. "anthropic/claude-haiku-4.5"). */
  smallFastModel?: string;
  /** Which launchers were installed. */
  launchers: Launcher[];
  /** Absolute path of the wrapper script, when a 'script' launcher exists. */
  scriptPath?: string;
  /** rc file the alias block was injected into, when an 'alias' launcher exists. */
  shellRc?: string;
  /** ISO timestamp of creation. */
  createdAt: string;
}

export interface Registry {
  version: 1;
  profiles: Profile[];
}

export function emptyRegistry(): Registry {
  return { version: 1, profiles: [] };
}
