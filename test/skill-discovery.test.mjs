import { describe, it, expect } from 'vitest';
import { createInstallableSkills } from '../src/skill-discovery.mjs';

describe('skill-discovery', () => {
  it('creates installable skills correctly', () => {
    const discoveredSkills = [
      { skillName: 'skill-1', url: 'https://...' },
      { skillName: 'skill-2', url: 'https://...' },
    ];
    const selectedSkills = ['skill-1'];
    const baseUrl = 'https://github.com/test/repo';

    const result = createInstallableSkills(discoveredSkills, selectedSkills, baseUrl, '');

    expect(result).toHaveLength(1);
    expect(result[0].skillName).toBe('skill-1');
    expect(result[0].baseUrl).toBe(baseUrl);
    expect(result[0].skillPath).toBe('');
    expect(result[0].version).toBeUndefined();
  });

  it('handles multiple selected skills', () => {
    const discoveredSkills = [
      { skillName: 'a', url: 'https://...' },
      { skillName: 'b', url: 'https://...' },
      { skillName: 'c', url: 'https://...' },
    ];
    const selectedSkills = ['a', 'c'];
    const baseUrl = 'https://github.com/test/repo';

    const result = createInstallableSkills(discoveredSkills, selectedSkills, baseUrl, '');

    expect(result).toHaveLength(2);
    expect(result.map(s => s.skillName)).toEqual(['a', 'c']);
  });

  it('includes skillPath in installable skills', () => {
    const discoveredSkills = [
      { skillName: 'computer-use', url: 'https://...' },
    ];
    const selectedSkills = ['computer-use'];
    const baseUrl = 'https://github.com/anthropics/skills';
    const skillPath = '/skills';

    const result = createInstallableSkills(discoveredSkills, selectedSkills, baseUrl, skillPath);

    expect(result).toHaveLength(1);
    expect(result[0].skillPath).toBe('/skills');
  });
});
