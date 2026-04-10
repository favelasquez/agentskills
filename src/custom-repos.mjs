import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { homedir } from 'node:os';

const PROJECT_CONFIG = '.agentskills-repos.json';
const GLOBAL_CONFIG_DIR = join(homedir(), '.agentskills');
const GLOBAL_CONFIG_FILE = join(GLOBAL_CONFIG_DIR, 'repos.json');

/**
 * Read config from project or global location
 */
export function readReposConfig(projectDir = process.cwd()) {
  // Try project-level first
  const projectConfigPath = join(projectDir, PROJECT_CONFIG);
  if (existsSync(projectConfigPath)) {
    try {
      return JSON.parse(readFileSync(projectConfigPath, 'utf-8'));
    } catch (err) {
      console.warn(`Failed to read project repos config: ${err.message}`);
    }
  }

  // Try global config
  if (existsSync(GLOBAL_CONFIG_FILE)) {
    try {
      return JSON.parse(readFileSync(GLOBAL_CONFIG_FILE, 'utf-8'));
    } catch (err) {
      console.warn(`Failed to read global repos config: ${err.message}`);
    }
  }

  return { repositories: [] };
}

/**
 * Write config to project-level (or global if isGlobal=true)
 */
export function writeReposConfig(config, isGlobal = false, projectDir = process.cwd()) {
  const configPath = isGlobal ? GLOBAL_CONFIG_FILE : join(projectDir, PROJECT_CONFIG);

  if (isGlobal && !existsSync(GLOBAL_CONFIG_DIR)) {
    // Create global config directory if needed
    try {
      mkdirSync(GLOBAL_CONFIG_DIR, { recursive: true });
    } catch (err) {
      console.warn(`Failed to create global config dir: ${err.message}`);
    }
  }

  writeFileSync(
    configPath,
    JSON.stringify(config, null, 2) + '\n',
    'utf-8',
  );
}

/**
 * Add a custom repository
 * repo = { id, name, url, type }
 *   id: unique identifier (e.g., "vercel-skills", "my-org-repo")
 *   name: human-readable name (e.g., "Vercel Skills", "My Organization")
 *   url: base URL to the repo (e.g., "https://github.com/vercel/skills")
 *   type: "github" (default), "vercel", or "custom"
 */
export function addCustomRepo(repo, projectDir = process.cwd(), isGlobal = false) {
  const config = readReposConfig(projectDir);

  // Validate required fields
  if (!repo.id || !repo.name || !repo.url) {
    throw new Error('Repo must have id, name, and url');
  }

  // Check for duplicates
  if (config.repositories.some((r) => r.id === repo.id)) {
    throw new Error(`Repo with id "${repo.id}" already exists`);
  }

  config.repositories.push({
    id: repo.id,
    name: repo.name,
    url: repo.url,
    type: repo.type || 'github',
    skillPath: repo.skillPath || '',  // Store the skill path
    addedAt: new Date().toISOString(),
  });

  writeReposConfig(config, isGlobal, projectDir);
  return config;
}

/**
 * Remove a custom repository
 */
export function removeCustomRepo(repoId, projectDir = process.cwd(), isGlobal = false) {
  const config = readReposConfig(projectDir);
  const initialLength = config.repositories.length;

  config.repositories = config.repositories.filter((r) => r.id !== repoId);

  if (config.repositories.length === initialLength) {
    throw new Error(`Repo with id "${repoId}" not found`);
  }

  writeReposConfig(config, isGlobal, projectDir);
  return config;
}

/**
 * Get all registered repositories (includes built-in central repo)
 */
export function getAllRepos(projectDir = process.cwd()) {
  const config = readReposConfig(projectDir);

  // Always include the central repo as a built-in option
  const builtIn = [
    {
      id: '__central__',
      name: 'Central Repo (favelasquez)',
      url: 'https://github.com/favelasquez/repo-skills',
      type: 'github',
      builtIn: true,
    },
  ];

  return [...builtIn, ...config.repositories];
}

/**
 * Get a specific repo by ID
 */
export function getRepo(repoId, projectDir = process.cwd()) {
  const repos = getAllRepos(projectDir);
  return repos.find((r) => r.id === repoId);
}

/**
 * List all registered custom repos (excludes built-in)
 */
export function listCustomRepos(projectDir = process.cwd()) {
  const config = readReposConfig(projectDir);
  return config.repositories;
}

/**
 * Parse and validate a GitHub URL
 * Accepts both formats:
 *   - https://github.com/owner/repo
 *   - https://github.com/owner/repo/tree/branch/path/to/skills
 * Returns: { owner, repo, branch, path, skillPath }
 */
export function parseGitHubUrl(url) {
  // Remove .git suffix and trailing slash
  url = url.replace(/\.git$/, '').replace(/\/$/, '');
  
  // Pattern: github.com/owner/repo[/tree/branch[/path...]]
  const match = url.match(/github\.com\/([^\/]+)\/([^\/]+)(?:\/tree\/([^\/]+)(?:\/(.+))?)?/i);
  if (match) {
    return {
      owner: match[1],
      repo: match[2],
      branch: match[3] || 'main',
      path: match[4] ? '/' + match[4] : '',
      skillPath: match[4] ? '/' + match[4] : '', // Alias for convenience
    };
  }
  return null;
}

/**
 * Normalize URL (remove trailing slash, git suffix)
 */
export function normalizeRepoUrl(url) {
  return url
    .replace(/\/$/, '') // Remove trailing slash
    .replace(/\.git$/, ''); // Remove .git suffix
}
