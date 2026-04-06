```
 █████╗  ██████╗ ███████╗███╗   ██╗████████╗
██╔══██╗██╔════╝ ██╔════╝████╗  ██║╚══██╔══╝
███████║██║  ███╗█████╗  ██╔██╗ ██║   ██║
██╔══██║██║   ██║██╔══╝  ██║╚██╗██║   ██║
██║  ██║╚██████╔╝███████╗██║ ╚████║   ██║
╚═╝  ╚═╝ ╚═════╝ ╚══════╝╚═╝  ╚═══╝   ╚═╝

███████╗██╗  ██╗██╗██╗     ██╗     ███████╗
██╔════╝██║ ██╔╝██║██║     ██║     ██╔════╝
███████╗█████╔╝ ██║██║     ██║     ███████╗
╚════██║██╔═██╗ ██║██║     ██║     ╚════██║
███████║██║  ██╗██║███████╗███████╗███████║
╚══════╝╚═╝  ╚═╝╚═╝╚══════╝╚══════╝╚══════╝
```

> Detect your project's tech stack and install AI agent skills in one command.

## What it does

`agentskills` scans your project directory, identifies the technologies in use (Angular, Laravel, FastAPI, Docker, AG Grid, etc.), and installs the matching skill files into your AI agent's configuration folder. No manual copy-pasting, no hunting for skill repos.

## Requirements

- **Node.js 18 or higher**

## Usage

```bash
npx @favelasquez/agentskills
```

That's it. The CLI will:

1. Detect your stack
2. Suggest matching skills
3. Ask which agents to install for (Claude Code, Cursor, Copilot, etc.)
4. Let you pick which skills to install
5. Download and write the skill files

### Options

| Flag | Description |
|------|-------------|
| `--claude-code` | Install for Claude Code |
| `--cursor` | Install for Cursor |
| `--gemini` | Install for Gemini CLI |
| `--copilot` | Install for GitHub Copilot |
| `--cline` | Install for Cline |
| `--codex` | Install for Codex |
| `--dry-run`, `-d` | Preview what would be installed without writing files |
| `-y`, `--yes` | Skip confirmations, install all suggested skills |
| `--dir <path>` | Scan a specific directory instead of the current folder |
| `--help`, `-h` | Show help |

### Examples

```bash
# Interactive mode — detect stack, pick agent and skills
npx @favelasquez/agentskills

# Install only for Claude Code, no prompts
npx @favelasquez/agentskills --claude-code -y

# Preview what would be installed for Cursor
npx @favelasquez/agentskills --cursor --dry-run

# Scan a different project folder
npx @favelasquez/agentskills --dir /path/to/project
```

## Supported stacks

| Technology | Detected by |
|------------|-------------|
| Angular (v13+, v6–v12, legacy) | `@angular/core` + `angular.json` |
| Laravel | `artisan` + `composer.json` |
| FastAPI | `requirements.txt` / `pyproject.toml` |
| C# / .NET | `.csproj` / `.sln` files |
| AG Grid v32+ | `ag-grid-community`, `ag-grid-angular`, etc. |
| AG Grid < v32 | Same packages, lower version |
| Deepgram | `@deepgram/sdk` |
| Twilio | `twilio`, `@twilio/conversations` |
| Docker | `Dockerfile`, `docker-compose.yml` |

### Universal skills

These are always suggested regardless of the detected stack:

- `commits` — standardized commit messages
- `review-pr` — pull request review workflow
- `resolve-conflicts` — git conflict resolution
- `gitignore-cleaner` — clean up `.gitignore` files
- `update-repo` — repo update workflow
- `skill-creator` — create new skills
- `stack-detector` — stack detection helper
- `engram-expert` — Engram memory expert
- `engram-install-setup` — Engram installation and setup
- `engram-memory-assistant` — Engram memory assistant

## Agent install locations

| Agent | Skills folder |
|-------|---------------|
| Claude Code | `.claude/skills/` |
| Cursor | `.cursor/rules/` |
| Gemini CLI | `.gemini/skills/` |
| GitHub Copilot | `.github/skills/{skill}/SKILL.md` |
| Cline | `.clinerules/` |
| Codex | `.codex/skills/` |

## Skills source

Skills are fetched directly from the [favelasquez/repo-skills](https://github.com/favelasquez/repo-skills) GitHub repository. No authentication is required.

## Troubleshooting

### `EOVERRIDE` — Override conflicts with direct dependency

```
npm error code EOVERRIDE
npm error Override for moment@^2.30.1 conflicts with direct dependency
```

This is not an agentskills issue. It means your project's `package.json` has an `overrides` entry that conflicts with one of its own direct dependencies. npm 8+ blocks the install entirely when this happens.

**Workaround:** run the command from outside your project directory and point it at the project with `--dir`:

```bash
cd ~
npx @favelasquez/agentskills --dir /path/to/your/project
```

---

### `SyntaxError: Unexpected token {`

Your Node.js version is too old. agentskills requires **Node.js 18 or higher**.

Check your version with `node -v` and upgrade at [nodejs.org](https://nodejs.org).

## Author

Creado por https://github.com/favelasquez

## License

MIT
