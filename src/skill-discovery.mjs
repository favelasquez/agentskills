import { listSkillsInRepoAtPath } from './mcp-client.mjs';
import { parseGitHubUrl, normalizeRepoUrl, getRepo } from './custom-repos.mjs';

/**
 * Discover and fetch skills from a custom repository at a specific path
 * Cleans up skill path if user provided /tree/branch/path format
 * Returns { repoId, baseUrl, path, skills: [{ skillName, description?, alreadyInstalled }] }
 */
export async function discoverSkillsInRepo(repoId, baseUrl, skillPath = '', installedNames = new Set()) {
  try {
    // Clean up skill path: if user pasted /tree/main/skills, extract just /skills
    let cleanPath = skillPath.trim();
    cleanPath = cleanPath.replace(/^\/tree\/[^\/]+\//, '/');
    cleanPath = cleanPath.replace(/\/$/, '');
    
    const skills = await listSkillsInRepoAtPath(baseUrl, cleanPath);
    
    return {
      repoId,
      baseUrl,
      path: cleanPath,  // Return the cleaned path
      skills: skills.map((s) => ({
        skillName: s.skillName,
        url: s.url,
        alreadyInstalled: installedNames.has(s.skillName),
      })),
    };
  } catch (err) {
    throw new Error(`Failed to discover skills from ${repoId}: ${err.message}`);
  }
}

/**
 * Validate if a GitHub URL is accessible and extract its components
 * Accepts:
 *   - https://github.com/owner/repo
 *   - https://github.com/owner/repo/tree/branch/path/to/skills
 * Returns: { valid, url, skillPath }
 */
export async function validateRepoUrl(url) {
  const normalized = normalizeRepoUrl(url);
  const parsed = parseGitHubUrl(normalized);
  
  if (!parsed) {
    throw new Error('Invalid GitHub URL format. Expected: https://github.com/owner/repo[/tree/branch/path]');
  }

  // Return normalized URL without /tree/branch/path parts for API calls
  // But preserve the skillPath if it was in the URL
  const baseUrl = `https://github.com/${parsed.owner}/${parsed.repo}`;
  const skillPath = parsed.skillPath || '';
  
  return {
    valid: true,
    url: baseUrl,
    skillPath, // Pass along any extracted path
  };
}

/**
 * Validate skills exist at a specific path
 * Handles user input that might include /tree/branch/ patterns
 */
export async function validateSkillPath(baseUrl, skillPath) {
  try {
    // Clean up skill path: if user pasted /tree/main/skills, extract just /skills
    let cleanPath = skillPath.trim();
    
    // Remove /tree/branch/ prefix if present (user might paste wrong format)
    cleanPath = cleanPath.replace(/^\/tree\/[^\/]+\//, '/');
    
    // Remove trailing slashes
    cleanPath = cleanPath.replace(/\/$/, '');
    
    const skills = await listSkillsInRepoAtPath(baseUrl, cleanPath);
    if (skills.length === 0) {
      throw new Error(`No skills found at path "${cleanPath || '(root)'}"`);
    }
    return {
      valid: true,
      skillCount: skills.length,
      path: cleanPath,
    };
  } catch (err) {
    throw new Error(`Validation failed: ${err.message}`);
  }
}

/**
 * Enrich repo with discovered skills info
 * Used for displaying repo details to user
 */
export async function enrichRepoWithSkills(repo, installedNames = new Set()) {
  if (!repo.baseUrl && repo.url) {
    // Convert url to baseUrl
    repo.baseUrl = normalizeRepoUrl(repo.url);
  }

  if (!repo.baseUrl) {
    return {
      ...repo,
      skillCount: 0,
      skills: [],
      error: 'No base URL available',
    };
  }

  try {
    // Use the skillPath from repo config (if available)
    const skillPath = repo.skillPath || '';
    const discovery = await discoverSkillsInRepo(repo.id, repo.baseUrl, skillPath, installedNames);
    return {
      ...repo,
      skillCount: discovery.skills.length,
      skills: discovery.skills,
    };
  } catch (err) {
    return {
      ...repo,
      skillCount: 0,
      skills: [],
      error: err.message,
    };
  }
}

/**
 * Create skill objects ready for installation from discovered skills
 */
export function createInstallableSkills(discoveredSkills, selectedSkillNames, baseUrl, skillPath = '') {
  return selectedSkillNames.map((skillName) => {
    const discovered = discoveredSkills.find((s) => s.skillName === skillName);
    return {
      skillName,
      baseUrl,
      skillPath,  // Pass the path where skills were found
      // version will be resolved during fetch
    };
  });
}
