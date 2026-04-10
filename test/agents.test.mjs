import { describe, it, expect } from 'vitest';
import { AGENT_FLAGS, AGENTS, AGENT_BY_FLAG, resolveAgentIds } from '../src/agents.mjs';

describe('AGENT_FLAGS', () => {
  it('contains exactly 6 flags', () => {
    expect(AGENT_FLAGS).toHaveLength(6);
  });

  it('contains the expected flag strings', () => {
    expect(AGENT_FLAGS).toEqual(
      expect.arrayContaining(['claude-code', 'cursor', 'gemini', 'copilot', 'cline', 'codex']),
    );
  });

  it('length matches the number of AGENTS entries', () => {
    expect(AGENT_FLAGS.length).toBe(Object.keys(AGENTS).length);
  });
});

describe('AGENTS', () => {
  it('every entry has id, name, flag, homeDir, installDir as strings', () => {
    for (const agent of Object.values(AGENTS)) {
      expect(typeof agent.id).toBe('string');
      expect(typeof agent.name).toBe('string');
      expect(typeof agent.flag).toBe('string');
      expect(typeof agent.homeDir).toBe('string');
      expect(typeof agent.installDir).toBe('string');
    }
  });

  it('copilot has fileTemplate "{skillName}/SKILL.md"', () => {
    expect(AGENTS['copilot'].fileTemplate).toBe('{skillName}/SKILL.md');
  });
});

describe('AGENT_BY_FLAG', () => {
  it('returns the correct object for "claude-code"', () => {
    expect(AGENT_BY_FLAG['claude-code']).toEqual(AGENTS['claude-code']);
  });

  it('returns undefined for a nonexistent flag', () => {
    expect(AGENT_BY_FLAG['nonexistent']).toBeUndefined();
  });
});

describe('resolveAgentIds', () => {
  it('returns ids for known flags', () => {
    expect(resolveAgentIds(['claude-code', 'cursor'])).toEqual(['claude-code', 'cursor']);
  });

  it('filters out unknown flags', () => {
    expect(resolveAgentIds(['claude-code', 'UNKNOWN'])).toEqual(['claude-code']);
  });

  it('returns empty array for empty input', () => {
    expect(resolveAgentIds([])).toEqual([]);
  });
});
