import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('node:fs', () => ({
  readFileSync: vi.fn(),
  existsSync: vi.fn(),
  readdirSync: vi.fn(),
  writeFileSync: vi.fn(),
  mkdirSync: vi.fn(),
  statSync: vi.fn(),
}));

vi.mock('node:os', () => ({
  homedir: vi.fn(() => '/fake/home'),
}));

import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { homedir } from 'node:os';
import {
  readJson,
  getAllPackageNames,
  getDeclaredMajorVersion,
  getInstalledMajorVersion,
  detectInstalledAgents,
  getInstalledSkillNames,
  collectSkills,
  detectTechnologies,
} from '../src/detect.mjs';

beforeEach(() => {
  vi.clearAllMocks();
  readFileSync.mockImplementation(() => { throw Object.assign(new Error('ENOENT'), { code: 'ENOENT' }); });
  existsSync.mockReturnValue(false);
  readdirSync.mockImplementation(() => { throw Object.assign(new Error('ENOENT'), { code: 'ENOENT' }); });
});

function setupVirtualFs(files = {}, dirs = {}) {
  existsSync.mockImplementation((p) => {
    const n = p.replace(/\\/g, '/');
    return n in files || n in dirs;
  });
  readFileSync.mockImplementation((p) => {
    const n = p.replace(/\\/g, '/');
    if (n in files) return files[n];
    throw Object.assign(new Error('ENOENT'), { code: 'ENOENT' });
  });
  readdirSync.mockImplementation((p, opts) => {
    const n = p.replace(/\\/g, '/');
    const entries = dirs[n];
    if (!entries) throw Object.assign(new Error('ENOENT'), { code: 'ENOENT' });
    if (opts?.withFileTypes) return entries;
    return entries.map((e) => e.name);
  });
}

function fakeFile(name) { return { name, isFile: () => true, isDirectory: () => false }; }
function fakeDir(name) { return { name, isFile: () => false, isDirectory: () => true }; }

describe('getAllPackageNames', () => {
  it('returns [] for null input', () => {
    expect(getAllPackageNames(null)).toEqual([]);
  });

  it('returns keys from dependencies only', () => {
    const pkg = { dependencies: { react: '^18.0.0', lodash: '^4.0.0' } };
    expect(getAllPackageNames(pkg)).toEqual(['react', 'lodash']);
  });

  it('merges dependencies and devDependencies', () => {
    const pkg = {
      dependencies: { react: '^18.0.0' },
      devDependencies: { vitest: '^1.0.0' },
    };
    const result = getAllPackageNames(pkg);
    expect(result).toContain('react');
    expect(result).toContain('vitest');
    expect(result).toHaveLength(2);
  });
});

describe('getDeclaredMajorVersion', () => {
  it('returns major version from ^ range', () => {
    const pkg = { dependencies: { react: '^15.0.0' } };
    expect(getDeclaredMajorVersion(pkg, 'react')).toBe(15);
  });

  it('returns major version from ~ range', () => {
    const pkg = { dependencies: { react: '~8.0.0' } };
    expect(getDeclaredMajorVersion(pkg, 'react')).toBe(8);
  });

  it('returns null for package not in pkg', () => {
    const pkg = { dependencies: { react: '^18.0.0' } };
    expect(getDeclaredMajorVersion(pkg, 'vue')).toBeNull();
  });

  it('returns null for null pkg', () => {
    expect(getDeclaredMajorVersion(null, 'react')).toBeNull();
  });
});

describe('getInstalledMajorVersion', () => {
  it('returns major version when package.json exists in node_modules', () => {
    setupVirtualFs({
      '/project/node_modules/react/package.json': JSON.stringify({ version: '18.2.0' }),
    });
    expect(getInstalledMajorVersion('/project', 'react')).toBe(18);
  });

  it('returns null when package is not in node_modules', () => {
    setupVirtualFs({});
    expect(getInstalledMajorVersion('/project', 'react')).toBeNull();
  });
});

describe('readJson', () => {
  it('parses valid JSON and returns the object', () => {
    setupVirtualFs({ '/project/package.json': '{"name":"test","version":"1.0.0"}' });
    expect(readJson('/project/package.json')).toEqual({ name: 'test', version: '1.0.0' });
  });

  it('returns null for a missing file', () => {
    setupVirtualFs({});
    expect(readJson('/project/missing.json')).toBeNull();
  });

  it('returns null for invalid JSON', () => {
    setupVirtualFs({ '/project/bad.json': 'not valid json {{' });
    expect(readJson('/project/bad.json')).toBeNull();
  });
});

describe('detectInstalledAgents', () => {
  it('returns entries for agents whose homeDir exists', () => {
    existsSync.mockImplementation((p) => {
      const n = p.replace(/\\/g, '/');
      return n === '/fake/home/.claude' || n === '/fake/home/.cursor';
    });
    const result = detectInstalledAgents('/fake/home');
    expect(result).toHaveLength(2);
    const flags = result.map((a) => a.flag);
    expect(flags).toContain('claude-code');
    expect(flags).toContain('cursor');
  });

  it('returns [] when no agent home dirs exist', () => {
    existsSync.mockReturnValue(false);
    const result = detectInstalledAgents('/fake/home');
    expect(result).toEqual([]);
  });
});

describe('getInstalledSkillNames', () => {
  it('returns a Set of .md filenames from .claude/commands', () => {
    setupVirtualFs(
      {},
      { '/project/.claude/commands': [fakeFile('commits.md'), fakeFile('review-pr.md')] },
    );
    const result = getInstalledSkillNames('/project');
    expect(result).toBeInstanceOf(Set);
    expect(result.has('commits.md')).toBe(true);
    expect(result.has('review-pr.md')).toBe(true);
  });

  it('returns an empty Set when the commands dir does not exist', () => {
    setupVirtualFs({});
    const result = getInstalledSkillNames('/project');
    expect(result).toBeInstanceOf(Set);
    expect(result.size).toBe(0);
  });
});

describe('collectSkills', () => {
  it('includes universal skills with category "universal" when detected is empty', () => {
    const result = collectSkills({ detected: [], installedNames: new Set() });
    expect(result.length).toBeGreaterThan(0);
    const universalEntries = result.filter((s) => s.category === 'universal');
    expect(universalEntries.length).toBeGreaterThan(0);
  });

  it('includes both universal and stack skills when detected has entries', () => {
    const fakeTech = {
      name: 'FakeTech',
      mcpSkills: [{ skillName: 'fake-skill', repo: 'owner/repo', version: 'v1' }],
    };
    const result = collectSkills({ detected: [fakeTech], installedNames: new Set() });
    const categories = new Set(result.map((s) => s.category));
    expect(categories.has('universal')).toBe(true);
    expect(categories.has('stack')).toBe(true);
  });

  it('marks entry as alreadyInstalled when skillName.md is in installedNames', () => {
    const result = collectSkills({
      detected: [],
      installedNames: new Set(['commits.md']),
    });
    const commitsEntry = result.find((s) => s.skillName === 'commits');
    expect(commitsEntry).toBeDefined();
    expect(commitsEntry.alreadyInstalled).toBe(true);
  });

  it('deduplicates skills that appear in both universal and a detected stack entry', () => {
    const fakeTech = {
      name: 'FakeTech',
      mcpSkills: [{ skillName: 'commits', repo: 'owner/repo', version: 'v1' }],
    };
    const result = collectSkills({ detected: [fakeTech], installedNames: new Set() });
    const commitsEntries = result.filter((s) => s.skillName === 'commits');
    expect(commitsEntries).toHaveLength(1);
  });
});

describe('detectTechnologies', () => {
  it('detects angular-modern for Angular v17 project', () => {
    setupVirtualFs(
      {
        '/project/package.json': JSON.stringify({
          dependencies: { '@angular/core': '^17.0.0' },
        }),
        '/project/angular.json': '{}',
        '/project/node_modules/@angular/core/package.json': JSON.stringify({ version: '17.3.0' }),
      },
      { '/project': [] },
    );
    const { detected } = detectTechnologies('/project');
    const ids = detected.map((t) => t.id);
    expect(ids.some((id) => id.includes('modern'))).toBe(true);
  });

  it('does not detect any angular entry when no angular deps are present', () => {
    setupVirtualFs(
      {
        '/project/package.json': JSON.stringify({
          dependencies: { react: '^18.0.0' },
        }),
      },
      { '/project': [] },
    );
    const { detected } = detectTechnologies('/project');
    const ids = detected.map((t) => t.id);
    expect(ids.some((id) => id.startsWith('angular'))).toBe(false);
  });
});
