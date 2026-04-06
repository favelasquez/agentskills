/**
 * SKILLS_MAP
 *
 * Maps detected stack technologies → skill suggestions.
 * Each entry:
 *   id        : unique tech identifier
 *   name      : human-readable label
 *   detect    : detection rules (packages | configFiles | configFileContent | packagePatterns)
 *   mcpSkills : array of skill descriptors:
 *
 *     GitHub:    { skillName, repo }           repo = 'owner/repo'
 *                fetched from: https://raw.githubusercontent.com/{repo}/HEAD/{skillName}/SKILL.md
 *
 *     Bitbucket: { skillName, bitbucket, version }   bitbucket = 'workspace/repo'
 *                fetched from: https://bitbucket.org/{bitbucket}/raw/master/src/skills/{skillName}/{version}/usage.md
 */
export const SKILLS_MAP = [
  // ── Angular ──────────────────────────────────────────────────
  // Angular version detection handled in collectSkills (reads @angular/core version)
  {
    id: 'angular-modern',
    name: 'Angular (v13+)',
    detect: {
      packages: ['@angular/core'],
      configFiles: ['angular.json'],
    },
    // Only suggest when Angular >= 13 — resolved dynamically in collectSkills
    minAngularVersion: 13,
    mcpSkills: [
      { skillName: 'angular-modern-review', bitbucket: 'walzate1/skills-standars', version: 'v1' },
    ],
  },
  {
    id: 'angular-mid',
    name: 'Angular (v6–v12)',
    detect: {
      packages: ['@angular/core'],
      configFiles: ['angular.json'],
    },
    minAngularVersion: 6,
    maxAngularVersion: 12,
    mcpSkills: [
      { skillName: 'angular-mid-review', bitbucket: 'walzate1/skills-standars', version: 'v1' },
    ],
  },
  {
    id: 'angular-legacy',
    name: 'Angular (legacy < v6)',
    detect: {
      packages: ['@angular/core'],
      configFiles: ['angular.json'],
    },
    maxAngularVersion: 5,
    mcpSkills: [
      { skillName: 'angular2-legacy-review', bitbucket: 'walzate1/skills-standars', version: 'v1' },
    ],
  },
  // ── Laravel (PHP) ────────────────────────────────────────────
  {
    id: 'laravel',
    name: 'Laravel',
    detect: {
      configFiles: ['artisan', 'composer.json'],
      configFileContent: {
        files: ['composer.json'],
        patterns: ['"laravel/framework"'],
      },
    },
    mcpSkills: [
      { skillName: 'laravel-audit', bitbucket: 'walzate1/skills-standars', version: 'v1' },
      { skillName: 'stack-detector', bitbucket: 'walzate1/skills-standars', version: 'v1' },
    ],
  },
  // ── Python / FastAPI ─────────────────────────────────────────
  {
    id: 'fastapi',
    name: 'FastAPI',
    detect: {
      configFiles: ['requirements.txt', 'pyproject.toml'],
      configFileContent: {
        files: ['requirements.txt', 'pyproject.toml'],
        patterns: ['fastapi', 'FastAPI'],
      },
    },
    mcpSkills: [
      { skillName: 'fastapi-audit', bitbucket: 'walzate1/skills-standars', version: 'v1' },
    ],
  },
  // ── C# / .NET ────────────────────────────────────────────────
  {
    id: 'csharp',
    name: 'C# / .NET',
    detect: {
      configFiles: [],
      configFileContent: {
        files: [],
        patterns: [],
        scanGradleLayout: false,
      },
      fileExtensions: ['.csproj', '.sln'],
    },
    mcpSkills: [
      { skillName: 'csharp-ef-audit', bitbucket: 'walzate1/skills-standars', version: 'v1' },
      { skillName: 'stack-detector', bitbucket: 'walzate1/skills-standars', version: 'v1' },
    ],
  },
  // ── AG Grid ──────────────────────────────────────────────────
  {
    id: 'ag-grid-v32',
    name: 'AG Grid (v32+)',
    detect: {
      packages: ['ag-grid-community', '@ag-grid-community/core', 'ag-grid-angular', 'ag-grid-react'],
    },
    minVersion: '32.0.0',
    mcpSkills: [
      { skillName: 'ag-grid', bitbucket: 'walzate1/skills-standars', version: 'v32' },
    ],
  },
  {
    id: 'ag-grid-legacy',
    name: 'AG Grid (< v32)',
    detect: {
      packages: ['ag-grid-community', '@ag-grid-community/core', 'ag-grid-angular', 'ag-grid-react'],
    },
    maxVersion: '31.9.9',
    mcpSkills: [
      { skillName: 'ag-grid', bitbucket: 'walzate1/skills-standars', version: 'v18' },
    ],
  },
  // ── Deepgram ─────────────────────────────────────────────────
  {
    id: 'deepgram',
    name: 'Deepgram',
    detect: {
      packages: ['@deepgram/sdk', 'deepgram'],
    },
    mcpSkills: [
      { skillName: 'deepgram-expert', bitbucket: 'walzate1/skills-standars', version: 'v1' },
    ],
  },
  // ── Twilio ───────────────────────────────────────────────────
  {
    id: 'twilio',
    name: 'Twilio',
    detect: {
      packages: ['twilio', '@twilio/conversations', '@twilio/voice-sdk'],
    },
    mcpSkills: [
      { skillName: 'twilio-expert', bitbucket: 'walzate1/skills-standars', version: 'v1' },
    ],
  },
  // ── Docker ───────────────────────────────────────────────────
  {
    id: 'docker',
    name: 'Docker',
    detect: {
      configFiles: ['Dockerfile', 'docker-compose.yml', 'docker-compose.yaml', '.dockerignore'],
    },
    mcpSkills: [
      { skillName: 'docker', bitbucket: 'walzate1/skills-standars', version: 'v1' },
    ],
  },
];

/**
 * UNIVERSAL_SKILLS
 *
 * Always suggested regardless of detected stack.
 * These are workflow/tooling skills useful for any project.
 */
export const UNIVERSAL_SKILLS = [
  { skillName: 'commits',                  bitbucket: 'walzate1/skills-standars', version: 'v1' },
  { skillName: 'review-pr',                bitbucket: 'walzate1/skills-standars', version: 'v1' },
  { skillName: 'resolve-conflicts',        bitbucket: 'walzate1/skills-standars', version: 'v1' },
  { skillName: 'gitignore-cleaner',        bitbucket: 'walzate1/skills-standars', version: 'v1' },
  { skillName: 'update-repo',              bitbucket: 'walzate1/skills-standars', version: 'v1' },
  { skillName: 'skill-creator',            bitbucket: 'walzate1/skills-standars', version: 'v1' },
  { skillName: 'stack-detector',           bitbucket: 'walzate1/skills-standars', version: 'v1' },
  { skillName: 'engram-expert',            bitbucket: 'walzate1/skills-standars', version: 'v1' },
  { skillName: 'engram-install-setup',     bitbucket: 'walzate1/skills-standars', version: 'v1' },
  { skillName: 'engram-memory-assistant',  bitbucket: 'walzate1/skills-standars', version: 'v1' },
];

/**
 * SDD_SKILLS
 *
 * Spec-Driven Development workflow skills — suggested as a group.
 */
export const SDD_SKILLS = [
  { skillName: 'sdd-init',    bitbucket: 'walzate1/skills-standars', version: 'v1' },
  { skillName: 'sdd-explore', bitbucket: 'walzate1/skills-standars', version: 'v1' },
  { skillName: 'sdd-propose', bitbucket: 'walzate1/skills-standars', version: 'v1' },
  { skillName: 'sdd-spec',    bitbucket: 'walzate1/skills-standars', version: 'v1' },
  { skillName: 'sdd-design',  bitbucket: 'walzate1/skills-standars', version: 'v1' },
  { skillName: 'sdd-tasks',   bitbucket: 'walzate1/skills-standars', version: 'v1' },
  { skillName: 'sdd-apply',   bitbucket: 'walzate1/skills-standars', version: 'v1' },
  { skillName: 'sdd-verify',  bitbucket: 'walzate1/skills-standars', version: 'v1' },
  { skillName: 'sdd-archive', bitbucket: 'walzate1/skills-standars', version: 'v1' },
];

/**
 * File extensions that indicate a web frontend project.
 */
export const WEB_FRONTEND_EXTENSIONS = new Set([
  '.html', '.htm', '.css', '.scss', '.sass', '.less',
  '.vue', '.svelte', '.jsx', '.tsx',
]);

/**
 * Packages that indicate a web frontend project.
 */
export const FRONTEND_PACKAGES = new Set([
  'react', 'react-dom', 'vue', 'svelte', '@sveltejs/kit',
  'angular', '@angular/core', 'astro', 'solid-js',
]);
