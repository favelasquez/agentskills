import { vi, describe, it, expect, beforeEach } from 'vitest';
import { EventEmitter } from 'node:events';

vi.mock('node:https', () => ({
  get: vi.fn(),
}));

import { get } from 'node:https';
import {
  fetchSkillContents,
  fetchLatestVersion,
  checkUpdates,
} from '../src/mcp-client.mjs';

beforeEach(() => {
  vi.clearAllMocks();
});

function mockHttpResponse(statusCode, body, headers = {}) {
  get.mockImplementation((url, opts, cb) => {
    if (typeof opts === 'function') { cb = opts; }
    const res = new EventEmitter();
    res.statusCode = statusCode;
    res.headers = headers;
    const req = new EventEmitter();
    process.nextTick(() => {
      cb(res);
      if (body !== null) {
        res.emit('data', Buffer.from(body, 'utf-8'));
        res.emit('end');
      }
    });
    return req;
  });
}

function mockHttpError(message) {
  get.mockImplementation((url, opts, cb) => {
    if (typeof opts === 'function') { cb = opts; }
    const req = new EventEmitter();
    process.nextTick(() => req.emit('error', new Error(message)));
    return req;
  });
}

describe('fetchLatestVersion', () => {
  it('returns the highest version dir name', async () => {
    mockHttpResponse(200, JSON.stringify([
      { type: 'dir', name: 'v1' },
      { type: 'dir', name: 'v3' },
      { type: 'dir', name: 'v2' },
    ]));
    const result = await fetchLatestVersion('commits', 'owner/repo');
    expect(result).toBe('v3');
  });

  it('returns null when there are no version dirs', async () => {
    mockHttpResponse(200, JSON.stringify([
      { type: 'file', name: 'README.md' },
      { type: 'file', name: 'usage.md' },
    ]));
    const result = await fetchLatestVersion('commits', 'owner/repo');
    expect(result).toBeNull();
  });

  it('returns null when API returns a non-array', async () => {
    mockHttpResponse(200, JSON.stringify({ message: 'Not Found' }));
    const result = await fetchLatestVersion('commits', 'owner/repo');
    expect(result).toBeNull();
  });
});

describe('fetchSkillContents', () => {
  it('resolves to array with content from 200 response', async () => {
    mockHttpResponse(200, '# Skill Content');
    const skills = [{ skillName: 'commits', repo: 'owner/repo', version: 'v1' }];
    const results = await fetchSkillContents(skills, '/target', '.claude/commands');
    expect(results).toHaveLength(1);
    expect(results[0].content).toContain('# Skill Content');
  });

  it('strips UTF-8 BOM from response body', async () => {
    mockHttpResponse(200, '\uFEFF# Content');
    const skills = [{ skillName: 'commits', repo: 'owner/repo', version: 'v1' }];
    const results = await fetchSkillContents(skills, '/target', '.claude/commands');
    expect(results[0].content.startsWith('#')).toBe(true);
    expect(results[0].content.charCodeAt(0)).not.toBe(0xFEFF);
  });

  it('constructs path using targetDir + agentInstallDir + skillName.md for default template', async () => {
    mockHttpResponse(200, '# Content');
    const skills = [{ skillName: 'commits', repo: 'owner/repo', version: 'v1' }];
    const results = await fetchSkillContents(skills, '/target', '.claude/commands');
    expect(results[0].path.replace(/\\/g, '/')).toContain('.claude/commands');
    expect(results[0].path.replace(/\\/g, '/')).toContain('commits.md');
  });

  it('constructs path ending with skillName/SKILL.md for copilot template', async () => {
    mockHttpResponse(200, '# Content');
    const skills = [{ skillName: 'commits', repo: 'owner/repo', version: 'v1' }];
    const results = await fetchSkillContents(skills, '/target', '.github/skills', '{skillName}/SKILL.md');
    expect(results[0].path.replace(/\\/g, '/')).toContain('commits/SKILL.md');
  });

  it('rejects on HTTP 404', async () => {
    mockHttpResponse(404, 'Not Found');
    const skills = [{ skillName: 'commits', repo: 'owner/repo', version: 'v1' }];
    await expect(fetchSkillContents(skills, '/target', '.claude/commands')).rejects.toThrow('HTTP 404');
  });

  it('rejects on network error', async () => {
    mockHttpError('connection refused');
    const skills = [{ skillName: 'commits', repo: 'owner/repo', version: 'v1' }];
    await expect(fetchSkillContents(skills, '/target', '.claude/commands')).rejects.toThrow('connection refused');
  });
});

describe('checkUpdates', () => {
  it('returns a Map with entries for each skill when meta is available', async () => {
    get.mockImplementation((url, opts, cb) => {
      if (typeof opts === 'function') { cb = opts; }
      const req = new EventEmitter();
      process.nextTick(() => {
        const res = new EventEmitter();
        res.statusCode = 200;
        res.headers = {};
        cb(res);
        if (url.includes('api.github.com')) {
          res.emit('data', Buffer.from(JSON.stringify([{ type: 'dir', name: 'v1' }]), 'utf-8'));
        } else {
          res.emit('data', Buffer.from('---\nmetadata:\n  version: "1.0"\n---\n# content', 'utf-8'));
        }
        res.emit('end');
      });
      return req;
    });

    const skills = [
      { skillName: 'commits', repo: 'owner/repo' },
      { skillName: 'review-pr', repo: 'owner/repo' },
    ];
    const result = await checkUpdates(skills);
    expect(result).toBeInstanceOf(Map);
    expect(result.has('commits')).toBe(true);
    expect(result.has('review-pr')).toBe(true);
  });

  it('sets Map entry to null for skill with no repo', async () => {
    const skills = [{ skillName: 'local-skill', repo: null }];
    const result = await checkUpdates(skills);
    expect(result.get('local-skill')).toBeNull();
  });

  it('sets Map entry to null for a skill whose fetch fails, without rejecting the whole call', async () => {
    let callCount = 0;
    get.mockImplementation((url, opts, cb) => {
      if (typeof opts === 'function') { cb = opts; }
      const req = new EventEmitter();
      callCount++;
      if (url.includes('bad-skill')) {
        process.nextTick(() => req.emit('error', new Error('ECONNREFUSED')));
      } else {
        process.nextTick(() => {
          const res = new EventEmitter();
          res.statusCode = 200;
          res.headers = {};
          cb(res);
          if (url.includes('api.github.com')) {
            res.emit('data', Buffer.from(JSON.stringify([{ type: 'dir', name: 'v1' }])));
          } else {
            res.emit('data', Buffer.from('---\nmetadata:\n  version: "1.0"\n---\n# ok'));
          }
          res.emit('end');
        });
      }
      return req;
    });

    const skills = [
      { skillName: 'bad-skill', repo: 'owner/repo' },
      { skillName: 'good-skill', repo: 'owner/repo' },
    ];
    const result = await checkUpdates(skills);
    expect(result.get('bad-skill')).toBeNull();
    expect(result.get('good-skill')).not.toBeNull();
  });
});
