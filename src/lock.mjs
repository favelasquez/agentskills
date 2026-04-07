import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const LOCK_FILENAME = '.agentskills-lock.json';

/**
 * Reads the lock file. Returns { skills: {} } if not found.
 */
export function readLock(projectDir) {
  try {
    return JSON.parse(readFileSync(join(projectDir, LOCK_FILENAME), 'utf-8'));
  } catch {
    return { skills: {} };
  }
}

/**
 * Writes the lock file.
 */
export function writeLock(projectDir, lock) {
  writeFileSync(
    join(projectDir, LOCK_FILENAME),
    JSON.stringify(lock, null, 2) + '\n',
    'utf-8',
  );
}

/**
 * Upserts skill entries into the lock file.
 * entries: [{ skillName, version, repo, agents: string[] }]
 */
export function upsertLockSkills(projectDir, entries) {
  const lock = readLock(projectDir);
  for (const { skillName, version, repo, agents } of entries) {
    lock.skills[skillName] = { version, repo, agents };
  }
  writeLock(projectDir, lock);
}
