import { vi, describe, it, expect, beforeEach } from 'vitest';
import { join } from 'node:path';

vi.mock('node:fs', () => ({
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  mkdirSync: vi.fn(),
}));

import { readFileSync, writeFileSync } from 'node:fs';
import { readLock, writeLock, upsertLockSkills } from '../src/lock.mjs';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('readLock', () => {
  it('returns { skills: {} } when readFileSync throws', () => {
    readFileSync.mockImplementation(() => { throw new Error('ENOENT'); });
    expect(readLock('/proj')).toEqual({ skills: {} });
  });

  it('returns parsed object when readFileSync returns valid JSON', () => {
    const data = { skills: { commits: { version: '1.0.0', repo: 'owner/repo', agents: [] } } };
    readFileSync.mockReturnValue(JSON.stringify(data));
    expect(readLock('/proj')).toEqual(data);
  });

  it('returns { skills: {} } when readFileSync returns invalid JSON', () => {
    readFileSync.mockReturnValue('{broken');
    expect(readLock('/proj')).toEqual({ skills: {} });
  });
});

describe('writeLock', () => {
  it('calls writeFileSync with correct path and serialized content', () => {
    const data = { skills: { commits: { version: '1.0.0', repo: 'owner/repo', agents: [] } } };
    writeLock('/proj', data);
    expect(writeFileSync).toHaveBeenCalledWith(
      join('/proj', '.agentskills-lock.json'),
      JSON.stringify(data, null, 2) + '\n',
      'utf-8',
    );
  });
});

describe('upsertLockSkills', () => {
  it('creates correct structure when lock is empty', () => {
    readFileSync.mockImplementation(() => { throw new Error('ENOENT'); });

    upsertLockSkills('/proj', [
      { skillName: 'commits', version: '1.0.0', repo: 'owner/repo', agents: ['claude-code'] },
    ]);

    expect(writeFileSync).toHaveBeenCalledWith(
      join('/proj', '.agentskills-lock.json'),
      JSON.stringify(
        { skills: { commits: { version: '1.0.0', repo: 'owner/repo', agents: ['claude-code'] } } },
        null,
        2,
      ) + '\n',
      'utf-8',
    );
  });

  it('merges entries without losing existing ones', () => {
    const existing = {
      skills: {
        commits: { version: '1.0.0', repo: 'owner/repo', agents: ['claude-code'] },
      },
    };
    readFileSync.mockReturnValue(JSON.stringify(existing));

    upsertLockSkills('/proj', [
      { skillName: 'docker', version: '2.0.0', repo: 'owner/repo', agents: ['cursor'] },
    ]);

    const expected = {
      skills: {
        commits: { version: '1.0.0', repo: 'owner/repo', agents: ['claude-code'] },
        docker: { version: '2.0.0', repo: 'owner/repo', agents: ['cursor'] },
      },
    };

    expect(writeFileSync).toHaveBeenCalledWith(
      join('/proj', '.agentskills-lock.json'),
      JSON.stringify(expected, null, 2) + '\n',
      'utf-8',
    );
  });
});
