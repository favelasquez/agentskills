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

## Installing from Custom Repositories

You can now install skills from custom repositories, not just the central `favelasquez/repo-skills`. This allows you to:

- **Install from Vercel official skills**: `https://github.com/vercel/skills`
- **Install from your organization's private repo**: `https://github.com/my-org/internal-skills`
- **Install from community skill repositories**: Any public GitHub repository

### How to Install from a Custom Repo

1. Run `npx @favelasquez/agentskills`
2. Select **"Instalar desde repo personalizado"** (Install from custom repository)
3. Choose one of:
   - **Enter repo URL**: Paste a GitHub URL directly (e.g., `https://github.com/anthropics/skills`)
   - **Select from saved repos**: Choose from repositories you've registered before
4. **NEW**: Specify where skills are located in the repository:
   - Enter the folder path (e.g., `/skills`, `/src/skills`, or leave empty for root)
5. The CLI will validate the path and discover available skills
6. Select which skills to install
7. Optionally save the repository (with the path) for future use

### Specifying Skill Paths

Different repositories organize their skills differently:

- **Root level** (leave empty): `your-repo/skill-name/v1/usage.md`
  - Example: `https://github.com/favelasquez/repo-skills`
  - Path: *(empty)*

- **In `/skills` subfolder**: `your-repo/skills/skill-name/v1/usage.md`
  - Example: `https://github.com/anthropics/skills`
  - Path: `/skills`

- **In other paths**: `your-repo/src/skills/skill-name/v1/usage.md`
  - Path: `/src/skills`

When prompted "¿En qué carpeta están las skills?", enter the appropriate path. The CLI will validate it contains skills and report an error if the path is invalid.

### Supported Repository Formats

Custom repositories must follow this structure at the path you specify:

```
repo/
├── skill-1/
│   ├── v1/
│   │   └── usage.md
│   └── v2/
│       └── usage.md
├── skill-2/
│   └── v1/
│       └── usage.md
└── ...
```

Each skill directory can have multiple version folders (v1, v2, v3, etc.), and the CLI will automatically use the highest version available.

### Examples: Installing from Different Repositories

#### Anthropic Skills (subfolder structure)

```bash
npx @favelasquez/agentskills
# → "Instalar desde repo personalizado"
# → "Enter repo URL"
# → Paste: https://github.com/anthropics/skills
# → "¿En qué carpeta están las skills?"
# → Enter: /skills
# → Select your AI agent(s)
# → Choose skills to install
```

#### Vercel Skills (root level)

```bash
npx @favelasquez/agentskills
# → "Instalar desde repo personalizado"
# → "Enter repo URL"
# → Paste: https://github.com/vercel/skills
# → "¿En qué carpeta están las skills?"
# → Leave empty (press Enter)
# → Select your AI agent(s)
# → Choose skills to install
```

### Saving Custom Repositories

When you install from a custom repository URL, you'll be asked if you want to save it for future use. Saved repositories are stored in `.agentskills-repos.json` (project-level) or `~/.agentskills/repos.json` (global).

**The skill path is saved automatically with the repository**, so you won't need to specify it again when reusing the same repository.

Example saved config:

```json
{
  "repositories": [
    {
      "id": "anthropic-skills",
      "name": "Anthropic Skills",
      "url": "https://github.com/anthropics/skills",
      "skillPath": "/skills",
      "type": "github",
      "addedAt": "2024-01-15T10:30:00Z"
    },
    {
      "id": "vercel-skills",
      "name": "Vercel Official Skills",
      "url": "https://github.com/vercel/skills",
      "skillPath": "",
      "type": "github",
      "addedAt": "2024-01-15T10:30:00Z"
    }
  ]
}
```

### Troubleshooting Custom Repos

**"Repository validation failed" or "Invalid GitHub URL"**
- Ensure the URL is a valid GitHub repository
- Check that the repository is publicly accessible
- Example valid URLs:
  - `https://github.com/anthropics/skills`
  - `https://github.com/vercel/skills`
  - `https://github.com/your-org/ai-skills`

**"No skills found at path ..."**
- The specified path doesn't contain skill directories
- Double-check the path format (should start with `/` or be empty)
- Verify the repository actually contains skills at that location
- Try querying the GitHub API manually to see what's at that path
- Common paths to try: `/skills`, `/src/skills`, empty (root level)

**Path not found in repository**
- The path you entered doesn't exist in the repository
- Check the repository's file structure on GitHub
- Try browsing to the path directly on GitHub to verify it exists
- Use `https://github.com/owner/repo/tree/main/path` to check

**"Skill already installed"**
- The same skill name exists in multiple repositories
- Skills are shown as disabled if already installed in your project

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

## Author

Creado por https://github.com/favelasquez

## License

MIT
