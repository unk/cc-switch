import { runCreate } from './commands/create.js';
import { runDoctor } from './commands/doctor.js';
import { runList } from './commands/list.js';
import { runRemove } from './commands/remove.js';
import { color, error, info } from './util/log.js';

const VERSION = process.env.CC_SWITCH_VERSION ?? '0.0.0-dev';

const HELP = `${color.bold('cc-switch')} — set up isolated Claude Code profiles

${color.bold('USAGE')}
  cc-switch [command]

${color.bold('COMMANDS')}
  create            Create a new profile (interactive). Default when no command given.
  list              List configured profiles.
  remove <alias>    Remove a profile (cleans launchers; config dir on confirm).
  doctor            Check claude install, PATH, and profile health.
  help              Show this help.
  version           Show version.

${color.bold('OPTIONS')}
  -h, --help        Show this help.
  -v, --version     Show version.

${color.bold('EXAMPLES')}
  npx @naram/cc-switch            # create a profile interactively
  cc-switch list
  cc-switch remove cc-or

Profiles are stored under ${color.dim('~/.cc-switch')}. Secrets live only in each
profile's settings.json (chmod 0600) — never in your shell rc.`;

async function main(argv: string[]): Promise<number> {
  const [cmd, ...rest] = argv;

  switch (cmd) {
    case undefined:
    case 'create':
      return runCreate();
    case 'list':
    case 'ls':
      return runList();
    case 'remove':
    case 'rm':
      return runRemove(rest[0]);
    case 'doctor':
      return runDoctor();
    case 'help':
    case '--help':
    case '-h':
      info(HELP);
      return 0;
    case 'version':
    case '--version':
    case '-v':
      info(VERSION);
      return 0;
    default:
      error(`Unknown command: ${cmd}`);
      info(`Run ${color.cyan('cc-switch help')} for usage.`);
      return 1;
  }
}

main(process.argv.slice(2))
  .then((code) => {
    process.exitCode = code;
  })
  .catch((err: unknown) => {
    error(err instanceof Error ? err.message : String(err));
    process.exitCode = 1;
  });
