/**
 * Agent definitions.
 *
 * Each entry maps a CLI flag (e.g. --claude-code) to:
 *   - id          : identifier used internally and passed to `skills add -a <id>`
 *   - name        : human-readable label
 *   - flag        : CLI flag without leading --
 *   - homeDir     : folder inside $HOME that signals the agent is installed
 *   - installDir  : relative path inside the PROJECT where skills are placed
 */
export const AGENTS = {
  'claude-code': {
    id: 'claude-code',
    name: 'Claude Code',
    flag: 'claude-code',
    homeDir: '.claude',
    installDir: '.claude/skills',
  },
  cursor: {
    id: 'cursor',
    name: 'Cursor',
    flag: 'cursor',
    homeDir: '.cursor',
    installDir: '.cursor/rules',
  },
  'gemini-cli': {
    id: 'gemini-cli',
    name: 'Gemini CLI',
    flag: 'gemini',
    homeDir: '.gemini',
    installDir: '.gemini/skills',
  },
  copilot: {
    id: 'github-copilot',
    name: 'GitHub Copilot',
    flag: 'copilot',
    homeDir: '.copilot',
    installDir: '.github/skills',
    fileTemplate: '{skillName}/SKILL.md',
  },
  cline: {
    id: 'cline',
    name: 'Cline',
    flag: 'cline',
    homeDir: '.cline',
    installDir: '.clinerules',
  },
  codex: {
    id: 'codex',
    name: 'Codex',
    flag: 'codex',
    homeDir: '.codex',
    installDir: '.codex/skills',
  },
};

/**
 * All supported flags (without --).
 * Used to validate CLI args.
 */
export const AGENT_FLAGS = Object.values(AGENTS).map((a) => a.flag);

/**
 * Map from flag → agent entry (fast lookup).
 */
export const AGENT_BY_FLAG = Object.fromEntries(
  Object.values(AGENTS).map((a) => [a.flag, a]),
);

/**
 * Returns agent IDs for a list of flags.
 * e.g. ['claude-code', 'cursor'] → ['claude-code', 'cursor']
 */
export function resolveAgentIds(flags) {
  return flags.map((f) => AGENT_BY_FLAG[f]?.id).filter(Boolean);
}
