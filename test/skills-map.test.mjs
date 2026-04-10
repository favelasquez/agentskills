import { describe, it, expect } from 'vitest';
import {
  SKILLS_MAP,
  UNIVERSAL_SKILLS,
  WEB_FRONTEND_EXTENSIONS,
  FRONTEND_PACKAGES,
} from '../src/skills-map.mjs';

describe('SKILLS_MAP', () => {
  it('is a non-empty array', () => {
    expect(Array.isArray(SKILLS_MAP)).toBe(true);
    expect(SKILLS_MAP.length).toBeGreaterThan(0);
  });

  it('every entry has id, name, and detect', () => {
    for (const entry of SKILLS_MAP) {
      expect(typeof entry.id).toBe('string');
      expect(entry.id.length).toBeGreaterThan(0);
      expect(typeof entry.name).toBe('string');
      expect(entry.name.length).toBeGreaterThan(0);
      expect(entry.detect).toBeDefined();
      expect(typeof entry.detect).toBe('object');
    }
  });

  it('every mcpSkills entry has skillName and repo', () => {
    for (const entry of SKILLS_MAP) {
      for (const skill of entry.mcpSkills) {
        expect(typeof skill.skillName).toBe('string');
        expect(typeof skill.repo).toBe('string');
      }
    }
  });

  it('no duplicate ids', () => {
    const ids = SKILLS_MAP.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('angular-modern has minAngularVersion: 13', () => {
    const entry = SKILLS_MAP.find((e) => e.id === 'angular-modern');
    expect(entry?.minAngularVersion).toBe(13);
  });

  it('angular-mid has minAngularVersion: 6 and maxAngularVersion: 12', () => {
    const entry = SKILLS_MAP.find((e) => e.id === 'angular-mid');
    expect(entry?.minAngularVersion).toBe(6);
    expect(entry?.maxAngularVersion).toBe(12);
  });

  it('angular-legacy has maxAngularVersion: 5', () => {
    const entry = SKILLS_MAP.find((e) => e.id === 'angular-legacy');
    expect(entry?.maxAngularVersion).toBe(5);
  });
});

describe('UNIVERSAL_SKILLS', () => {
  it('contains an entry with skillName "commits" and a repo field', () => {
    const entry = UNIVERSAL_SKILLS.find((s) => s.skillName === 'commits');
    expect(entry).toBeDefined();
    expect(typeof entry.repo).toBe('string');
  });
});

describe('WEB_FRONTEND_EXTENSIONS', () => {
  it('is a Set', () => {
    expect(WEB_FRONTEND_EXTENSIONS).toBeInstanceOf(Set);
  });

  it('contains expected frontend extensions', () => {
    expect(WEB_FRONTEND_EXTENSIONS.has('.html')).toBe(true);
    expect(WEB_FRONTEND_EXTENSIONS.has('.vue')).toBe(true);
    expect(WEB_FRONTEND_EXTENSIONS.has('.tsx')).toBe(true);
    expect(WEB_FRONTEND_EXTENSIONS.has('.svelte')).toBe(true);
    expect(WEB_FRONTEND_EXTENSIONS.has('.scss')).toBe(true);
  });

  it('does not contain non-frontend extensions', () => {
    expect(WEB_FRONTEND_EXTENSIONS.has('.mjs')).toBe(false);
    expect(WEB_FRONTEND_EXTENSIONS.has('.json')).toBe(false);
  });
});

describe('FRONTEND_PACKAGES', () => {
  it('is a Set', () => {
    expect(FRONTEND_PACKAGES).toBeInstanceOf(Set);
  });

  it('contains expected frontend packages', () => {
    expect(FRONTEND_PACKAGES.has('react')).toBe(true);
    expect(FRONTEND_PACKAGES.has('vue')).toBe(true);
    expect(FRONTEND_PACKAGES.has('@angular/core')).toBe(true);
  });

  it('does not contain backend packages', () => {
    expect(FRONTEND_PACKAGES.has('express')).toBe(false);
  });
});
