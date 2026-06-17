import * as p from '@clack/prompts';
import path from 'node:path';
import { applyProfile } from '../core/apply.js';
import { configDirFor, defaultBinDir, expandHome, tildify } from '../core/paths.js';
import type { AuthMethod, Launcher } from '../core/profile.js';
import { getProfile } from '../core/registry.js';
import { claudeInstalled, commandExists, detectShell, isOnPath } from '../installers/shell.js';
import { color } from '../util/log.js';
import { validateAlias, validateBaseUrl, validateRequired } from '../util/validate.js';

/** Unwrap a clack prompt result, exiting cleanly on Ctrl-C / cancel. */
function ensure<T>(value: T | symbol): T {
  if (p.isCancel(value)) {
    p.cancel('Cancelled. Nothing was changed.');
    process.exit(130);
  }
  return value as T;
}

export async function runCreate(): Promise<number> {
  p.intro(color.bold('cc-switch — new Claude Code profile'));

  if (!claudeInstalled()) {
    p.log.warn(
      'The `claude` command was not found on PATH. The profile will still be created, but install Claude Code before launching it.',
    );
  }

  // 1. Alias --------------------------------------------------------------
  const alias = ensure(
    await p.text({
      message: 'Launch alias (the command you will type)',
      placeholder: 'cc',
      validate: (v) => validateAlias(v ?? '') ?? undefined,
    }),
  ).trim();

  const existing = getProfile(alias);
  if (existing) {
    const ov = ensure(
      await p.confirm({
        message: `Profile "${alias}" already exists. Update it?`,
        initialValue: true,
      }),
    );
    if (!ov) {
      p.cancel('Aborted.');
      return 0;
    }
  } else if (commandExists(alias)) {
    p.log.warn(
      `"${alias}" already resolves to an existing command. Your alias/script will shadow it in new shells.`,
    );
  }

  // 2. Custom model? ------------------------------------------------------
  const custom = ensure(
    await p.confirm({
      message: 'Use a custom model / third-party gateway? (No = standard Claude account)',
      initialValue: false,
    }),
  );

  let baseUrl: string | undefined;
  let authMethod: AuthMethod | undefined;
  let secret: string | undefined;
  let model: string | undefined;
  let smallFastModel: string | undefined;

  if (custom) {
    authMethod = ensure(
      await p.select({
        message: 'Authentication method',
        initialValue: 'token' as AuthMethod,
        options: [
          { value: 'token', label: 'AUTH_TOKEN (Bearer)', hint: 'OpenRouter, most gateways' },
          { value: 'apiKey', label: 'API_KEY (x-api-key)', hint: 'Anthropic-style key' },
        ],
      }),
    );

    p.log.info(
      `OpenRouter is the most common gateway. Its Claude-compatible base URL is ${color.cyan('https://openrouter.ai/api')} ${color.dim('(auth: AUTH_TOKEN = your OpenRouter API key)')}.\n${color.dim('Tip: press')} ${color.cyan('Tab')} ${color.dim('at any prompt below to autofill the suggested value.')}`,
    );

    baseUrl = ensure(
      await p.text({
        message: 'Gateway base URL',
        placeholder: 'https://openrouter.ai/api',
        validate: (v) => validateBaseUrl(v ?? '') ?? undefined,
      }),
    ).trim();

    secret = ensure(
      await p.password({
        message: authMethod === 'apiKey' ? 'API key' : 'Auth token',
        validate: (v) => validateRequired('Value')(v ?? '') ?? undefined,
      }),
    );

    const m = ensure(
      await p.text({
        message: 'Default model (ANTHROPIC_MODEL)',
        placeholder: 'anthropic/claude-opus-4.8',
      }),
    ).trim();
    model = m || undefined;

    const sfm = ensure(
      await p.text({
        message: 'Small/fast model (optional, Enter to skip)',
        placeholder: 'anthropic/claude-haiku-4.5',
      }),
    ).trim();
    smallFastModel = sfm || undefined;
  } else {
    const fixModel = ensure(
      await p.confirm({
        message: 'Pin a default model for this profile?',
        initialValue: false,
      }),
    );
    if (fixModel) {
      const m = ensure(
        await p.text({
          message: 'Default model (ANTHROPIC_MODEL)',
          placeholder: 'claude-opus-4-8',
        }),
      ).trim();
      model = m || undefined;
    }
  }

  // 3. Launchers ----------------------------------------------------------
  const shell = detectShell();
  const launchers = ensure(
    await p.multiselect({
      message: 'How do you want to launch this profile?',
      required: true,
      initialValues: ['alias'] as Launcher[],
      options: [
        { value: 'alias', label: `Shell alias`, hint: `${shell.name} → ${tildify(shell.rcPath)}` },
        { value: 'script', label: 'Wrapper script', hint: 'an executable on your PATH' },
      ],
    }),
  ) as Launcher[];

  let scriptPath: string | undefined;
  if (launchers.includes('script')) {
    const binDir = ensure(
      await p.text({
        message: 'Install the wrapper script into which directory?',
        placeholder: tildify(defaultBinDir()),
        initialValue: tildify(defaultBinDir()),
        validate: (v) => validateRequired('Directory')(v ?? '') ?? undefined,
      }),
    ).trim();
    const resolvedBin = expandHome(binDir);
    scriptPath = path.join(resolvedBin, alias);
    if (!isOnPath(resolvedBin)) {
      p.log.warn(
        `${tildify(resolvedBin)} is not on your PATH. Add it (e.g. export PATH="${binDir}:$PATH") or the "${alias}" command won't be found.`,
      );
    }
  }

  if (launchers.includes('alias') && shell.name === 'unknown') {
    p.log.warn(
      `Could not detect a supported shell (SHELL=${process.env.SHELL ?? 'unset'}). The alias will be written to ${tildify(shell.rcPath)} using POSIX syntax.`,
    );
  }

  // 4. Summary + confirm --------------------------------------------------
  const configDir = configDirFor(alias);
  const summaryLines = [
    `${color.dim('alias')}      ${alias}`,
    `${color.dim('type')}       ${custom ? 'custom gateway' : 'standard account'}`,
    ...(custom
      ? [
          `${color.dim('baseUrl')}    ${baseUrl}`,
          `${color.dim('auth')}       ${authMethod === 'apiKey' ? 'API_KEY (x-api-key)' : 'AUTH_TOKEN (Bearer)'}`,
          `${color.dim('secret')}     ${'•'.repeat(8)} (stored in settings.json, 0600)`,
        ]
      : []),
    ...(model ? [`${color.dim('model')}      ${model}`] : []),
    ...(smallFastModel ? [`${color.dim('smallFast')}  ${smallFastModel}`] : []),
    `${color.dim('configDir')}  ${tildify(configDir)}`,
    `${color.dim('launchers')}  ${launchers.join(', ')}`,
    ...(scriptPath ? [`${color.dim('script')}     ${tildify(scriptPath)}`] : []),
    ...(launchers.includes('alias') ? [`${color.dim('rc')}         ${tildify(shell.rcPath)}`] : []),
  ];
  p.note(summaryLines.join('\n'), 'Summary');

  const go = ensure(await p.confirm({ message: 'Apply this configuration?', initialValue: true }));
  if (!go) {
    p.cancel('Aborted. Nothing was changed.');
    return 0;
  }

  // 5. Apply --------------------------------------------------------------
  const s = p.spinner();
  s.start('Writing profile');

  applyProfile({
    alias,
    custom,
    baseUrl,
    authMethod,
    secret,
    model,
    smallFastModel,
    launchers,
    scriptPath,
    shell,
    createdAt: new Date().toISOString(),
  });

  s.stop('Profile written');

  // 6. Post-install guidance ---------------------------------------------
  const next: string[] = [];
  if (launchers.includes('alias')) {
    next.push(`Open a new shell, or run: ${color.cyan(`source ${tildify(shell.rcPath)}`)}`);
  }
  next.push(`Launch with: ${color.cyan(alias)}`);
  if (!custom) {
    next.push(`First run will prompt you to log in (isolated from your other accounts).`);
  }
  if (custom && authMethod === 'token') {
    next.push(
      color.dim(
        'Note: if you have a global ANTHROPIC_API_KEY exported, unset it for this profile — it would override the bearer token.',
      ),
    );
  }
  p.note(next.join('\n'), 'Next steps');
  p.outro(color.green(`Profile "${alias}" is ready.`));
  return 0;
}
