import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { readReposConfig, addCustomRepo, removeCustomRepo, getAllRepos, parseGitHubUrl, normalizeRepoUrl } from '../src/custom-repos.mjs';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

describe('custom-repos', () => {
  let tempDir;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'test-'));
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('reads empty config when file does not exist', () => {
    const config = readReposConfig(tempDir);
    expect(config).toEqual({ repositories: [] });
  });

  it('adds a custom repository', () => {
    const repo = {
      id: 'test-repo',
      name: 'Test Repo',
      url: 'https://github.com/test/repo',
      type: 'github',
    };

    addCustomRepo(repo, tempDir);
    const config = readReposConfig(tempDir);
    
    expect(config.repositories).toHaveLength(1);
    expect(config.repositories[0].id).toBe('test-repo');
  });

  it('removes a custom repository', () => {
    const repo = {
      id: 'test-repo',
      name: 'Test Repo',
      url: 'https://github.com/test/repo',
    };

    addCustomRepo(repo, tempDir);
    removeCustomRepo('test-repo', tempDir);
    const config = readReposConfig(tempDir);
    
    expect(config.repositories).toHaveLength(0);
  });

  it('includes built-in central repo in getAllRepos', () => {
    const repos = getAllRepos(tempDir);
    const central = repos.find(r => r.builtIn);
    
    expect(central).toBeDefined();
    expect(central.id).toBe('__central__');
  });

  it('parses GitHub URLs correctly', () => {
    const url = 'https://github.com/vercel/skills';
    const parsed = parseGitHubUrl(url);
    
    expect(parsed).toEqual({ owner: 'vercel', repo: 'skills' });
  });

  it('normalizes repository URLs', () => {
    const url1 = 'https://github.com/test/repo/';
    const url2 = 'https://github.com/test/repo.git';
    
    expect(normalizeRepoUrl(url1)).toBe('https://github.com/test/repo');
    expect(normalizeRepoUrl(url2)).toBe('https://github.com/test/repo');
  });
});
