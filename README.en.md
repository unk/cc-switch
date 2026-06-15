# cc-switch

[한국어](README.md) | **English**

A CLI tool that interactively and effortlessly sets up multiple **Claude Code
profiles** (different accounts / custom model gateways).

```bash
npx @naram/cc-switch
```

Just answer a few questions, and you'll be able to launch Claude Code with
different accounts and models using commands like `cc`, `claude-o`, or `cc-glm`.

---

## What is a "profile"?

Claude Code has no official "profile" feature. A profile in this tool means:

> a bundle of an **isolated `CLAUDE_CONFIG_DIR`** + (optional) **custom model
> env** + a **launcher (alias/script)**

`CLAUDE_CONFIG_DIR` is where Claude Code stores all of its settings,
credentials, sessions, and history. Separating this directory per profile keeps
**accounts and sessions fully isolated** (on macOS, even Keychain entries are
separated by the directory path hash).

---

## Quick start

```bash
# Create a profile interactively
npx @naram/cc-switch

# Or after installing globally
npm i -g @naram/cc-switch
cc-switch            # = cc-switch create
cc-switch list
cc-switch doctor
cc-switch remove cc-glm
```

### Example 1 — Add a standard account

```
alias        : cc-o
custom model : No
launchers    : alias
```

→ Run `cc-o` in a new shell, and Claude Code starts in an environment isolated
from your main account. Log in once, and the credentials are bound to that
profile.

### Example 2 — Custom gateway (e.g. GLM)

```
alias            : cc-glm
custom model     : Yes
auth method      : AUTH_TOKEN (Bearer)
base URL         : https://api.z.ai/api/anthropic
auth token       : ********           (input masked)
model            : glm-5.1
small fast model : glm-4.5-air
launchers        : alias + script
```

→ The `cc-glm` command immediately launches Claude Code connected to that
gateway/model.

---

## Commands

| Command                          | Description                                                              |
| -------------------------------- | ------------------------------------------------------------------------ |
| `cc-switch` / `cc-switch create` | Create a profile interactively (rerunning an existing alias updates it)  |
| `cc-switch list`                 | List registered profiles                                                 |
| `cc-switch remove <alias>`       | Remove a profile (cleans up launchers; config dir deleted after confirm) |
| `cc-switch doctor`               | Check claude installation / PATH / profile status                        |
| `cc-switch help`                 | Show help                                                                |

---

## What gets created and where

```
~/.cc-switch/
├── profiles.json          # Central registry (metadata, 0600) — no secrets stored
├── cc-glm/                # The profile's CLAUDE_CONFIG_DIR
│   ├── settings.json      # env (BASE_URL/AUTH_TOKEN/MODEL...) — 0600
│   └── ...                # (after login) credentials, sessions, history
└── cc-o/
    └── settings.json
```

Launchers:

- **alias** — injected into your shell rc file (`~/.zshrc`, etc.) as a marker block
  ```bash
  # >>> cc-switch: cc-glm >>>
  alias cc-glm='CLAUDE_CONFIG_DIR="$HOME/.cc-switch/cc-glm" claude'
  # <<< cc-switch: cc-glm <<<
  ```
- **script** — an executable file (default `~/.local/bin/<alias>`):
  ```sh
  #!/bin/sh
  # cc-switch launcher: cc-glm
  export CLAUDE_CONFIG_DIR="$HOME/.cc-switch/cc-glm"
  exec claude "$@"
  ```

---

## Security design

- **Tokens/API keys are never exposed in launchers (rc/script).** They are stored
  only in that profile's `settings.json` (`env`), with file permissions `0600`.
- Launchers only export `CLAUDE_CONFIG_DIR` and run `claude`.
- The central `profiles.json` stores only metadata needed to reconstruct, and
  **never stores secrets.**
- A backup (`<rc>.cc-switch.bak`) is always created before modifying an rc file.
- Tokens are masked during input and never printed back to the screen.

> **Note (when using AUTH_TOKEN):** If `ANTHROPIC_API_KEY` is exported globally in
> your environment, it takes precedence over the Bearer token. When using a
> token-based profile, unset the global `ANTHROPIC_API_KEY`.

---

## Requirements

- Node.js **18+**
- **macOS / Linux** (Windows/PowerShell is currently out of scope)
- Shells: **zsh / bash / fish**
- [Claude Code](https://claude.com/claude-code) (`claude`) installed — if not
  installed, profiles are still created but you'll need to install it before running.

After applying, aliases take effect only after you **open a new shell** or run
`source ~/.zshrc`.

---

## Removal / cleanup

```bash
cc-switch remove <alias>      # cleans up alias/script/registry (config dir after confirm)
```

To remove everything manually, delete the `# >>> cc-switch: ... >>>` block in
your rc file, `~/.local/bin/<alias>`, and `~/.cc-switch/<alias>/`.

---

## Development

```bash
npm install
npm run build       # tsup bundle → dist/index.js
npm test            # vitest
npm run lint        # tsc --noEmit + prettier --check
```

## License

MIT
