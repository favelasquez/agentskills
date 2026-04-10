import { get }               from 'node:https';
import { resolve as resolvePath } from 'node:path';

const GITHUB_RAW    = 'https://raw.githubusercontent.com';
const GITHUB_API    = 'https://api.github.com';

// ── HTTP fetch ────────────────────────────────────────────────

function fetchRaw(url, headers = {}) {
  return new Promise((resolve, reject) => {
    get(url, { headers }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        return fetchRaw(res.headers.location, headers).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode} fetching ${url}`));
      }
      const chunks = [];
      res.on('data', (chunk) => { chunks.push(chunk); });
      res.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
    }).on('error', reject);
  });
}

// ── URL builder ───────────────────────────────────────────────

/**
 * Parse and normalize GitHub URL to extract repo and path info
 * Supports: https://github.com/owner/repo[/tree/branch[/path]]
 * Returns: { baseUrl, path }
 * where baseUrl is owner/repo in raw.githubusercontent.com format
 * and path is everything after the branch (e.g., /skills/sub/folder)
 */
function parseGitHubRepoUrl(url) {
  // Already in raw format? Extract owner/repo
  if (url.includes('raw.githubusercontent.com')) {
    const match = url.match(/raw\.githubusercontent\.com\/([^\/]+)\/([^\/]+)/);
    if (match) {
      return {
        baseUrl: `https://raw.githubusercontent.com/${match[1]}/${match[2]}`,
        path: '',
      };
    }
  }
  
  // Parse GitHub web URL: github.com/owner/repo[/tree/branch[/path]]
  if (url.includes('github.com')) {
    url = url.replace(/\/$/, '').replace(/\.git$/, '');
    
    // Extract owner and repo
    const repoMatch = url.match(/github\.com\/([^\/]+)\/([^\/]+)/i);
    if (!repoMatch) return { baseUrl: url, path: '' };
    
    const owner = repoMatch[1];
    const repo = repoMatch[2];
    
    // Extract path after /tree/branch/
    // Pattern: /tree/{branch}/path/to/skills
    const pathMatch = url.match(/\/tree\/[^\/]+\/(.+)$/i);
    const path = pathMatch ? '/' + pathMatch[1] : '';
    
    return {
      baseUrl: `https://raw.githubusercontent.com/${owner}/${repo}`,
      path,
    };
  }
  
  // Non-GitHub URL
  return { baseUrl: url, path: '' };
}

/**
 * Build URL for a skill from various source types:
 * 
 * For custom repos, assumes this structure:
 * - baseUrl points to a GitHub repo (e.g., https://github.com/owner/repo or with /tree/branch/path)
 * - skillPath is the folder containing skills (extracted from URL if not provided)
 * - Each skill is a folder at skillPath/{skillName}
 * - Each skill folder contains a .md file at its root (e.g., library-review.md or SKILL.md)
 * 
 * Examples:
 *   buildSkillUrl({ skillName: 'review', baseUrl: 'https://github.com/org/repo/tree/main/skills' })
 *   → https://raw.githubusercontent.com/org/repo/main/skills/review/review.md
 * 
 * GitHub (repo = 'owner/repo'):
 *   → Tries: {repo}/main/{skillName}/skill.md
 * 
 * Custom repo (baseUrl = 'https://...'):
 *   → Tries: {baseUrl}/main/skillPath/{skillName}/{skillName}.md
 * 
 * Returns object with:
 *   - primary: first URL to try
 *   - alternatives: fallback URLs
 *   - all: all URLs in order
 */
export function buildSkillUrl({ skillName, repo, baseUrl, skillPath = '', version }) {
  const ver = version || 'v1';
  
  const urls = [];
  
  if (repo) {
    // GitHub format: owner/repo - Try multiple patterns
    urls.push(`${GITHUB_RAW}/${repo}/main/${skillName}/skill.md`);
    urls.push(`${GITHUB_RAW}/${repo}/main/${skillName}/${ver}/usage.md`);
    urls.push(`${GITHUB_RAW}/${repo}/main/${skillName}/README.md`);
  } else if (baseUrl) {
    // Custom repo: parse URL to extract base and embedded path
    const parsed = parseGitHubRepoUrl(baseUrl);
    
    // Use provided skillPath or fall back to path extracted from URL
    const finalPath = skillPath || parsed.path;
    const pathSegment = finalPath ? finalPath.replace(/^\//, '').replace(/\/$/, '') : '';
    const pathPrefix = pathSegment ? `${pathSegment}/` : '';
    
    // Try to find .md in the skill folder root (multiple common names)
    urls.push(`${parsed.baseUrl}/main/${pathPrefix}${skillName}/${skillName}.md`);
    urls.push(`${parsed.baseUrl}/main/${pathPrefix}${skillName}/skill.md`);
    urls.push(`${parsed.baseUrl}/main/${pathPrefix}${skillName}/SKILL.md`);
    urls.push(`${parsed.baseUrl}/main/${pathPrefix}${skillName}/README.md`);
  } else {
    throw new Error(`Skill "${skillName}" has no repo or baseUrl field`);
  }
  
  // Return object with primary URL and alternatives for fallback
  return {
    primary: urls[0],
    alternatives: urls.slice(1),
    all: urls
  };
}

// ── Main export ───────────────────────────────────────────────

/**
 * Fetches skill content from various sources.
 * For central repos: resolves the latest available version first
 * For custom repos: no version resolution needed (skills are flat structure)
 * Each result includes the resolved version so the caller can store it in the lock.
 * 
 * skill can have:
 *   - repo: 'owner/repo' for GitHub central
 *   - baseUrl: base URL for custom repos
 */
export async function fetchSkillContents(skills, targetDir, agentInstallDir, fileTemplate = '{skillName}.md') {
  const results = [];

  for (const skill of skills) {
    const { skillName, repo, baseUrl, skillPath } = skill;

    // Resolve version: only for central repos (repo field)
    // Custom repos don't have versioning
    let version = skill.version;
    if (!version && repo) {
      version = await fetchLatestVersion(skillName, repo);
    }

    const urlObj = buildSkillUrl({ skillName, repo, baseUrl, skillPath, version });

    // Try primary URL first, then alternatives
    let content;
    let lastError;
    
    for (const url of urlObj.all) {
      try {
        content = await fetchRaw(url);
        break; // Success, exit loop
      } catch (err) {
        lastError = err;
        // Continue to next URL
      }
    }
    
    if (!content) {
      throw new Error(`Could not fetch ${skillName} from any location: ${lastError?.message || 'unknown error'}`);
    }

    // Strip UTF-8 BOM if present so YAML frontmatter parses correctly
    if (content.charCodeAt(0) === 0xFEFF) {
      content = content.slice(1);
    }

    const fileName = fileTemplate.replace('{skillName}', skillName);
    const path     = resolvePath(targetDir, agentInstallDir, fileName);

    results.push({ path, content, version });
  }

  return results;
}

export async function listSkills() {
  return [];
}

// ── Version checking ──────────────────────────────────────────

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    get(url, { headers: { 'User-Agent': 'agentskills/1.0' } }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        return fetchJson(res.headers.location).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode}`));
      }
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf-8'))); }
        catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

/**
 * Fetches the latest available version folder for a skill from GitHub.
 * Looks for dirs matching /^v\d+/ and returns the one with the highest number.
 * Only used for central repos (with 'repo' field).
 */
export async function fetchLatestVersion(skillName, repo) {
  const url = `${GITHUB_API}/repos/${repo}/contents/${skillName}`;
  const entries = await fetchJson(url);
  if (!Array.isArray(entries)) return null;
  const versions = entries
    .filter((e) => e.type === 'dir' && /^v\d+/.test(e.name))
    .map((e) => e.name)
    .sort((a, b) => parseInt(b.slice(1), 10) - parseInt(a.slice(1), 10));
  return versions[0] ?? null;
}

/**
 * List available skills in a custom repo at a specific path.
 * Returns array of { skillName, url } objects.
 * baseUrl can be in formats:
 *   - https://github.com/owner/repo
 *   - https://github.com/owner/repo/tree/main
 *   - https://github.com/owner/repo/tree/main/skills
 *   - https://raw.githubusercontent.com/owner/repo
 * skillPath overrides any path in the baseUrl
 */
export async function listSkillsInRepoAtPath(baseUrl, skillPath = '') {
  // Parse the URL to extract owner/repo and any embedded path/branch
  const parsed = parseGitHubRepoUrl(baseUrl);
  
  // Extract owner and repo from baseUrl
  const baseMatch = baseUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/i);
  if (!baseMatch) {
    throw new Error('Custom repo must be a GitHub URL for skill discovery');
  }

  const repo = `${baseMatch[1]}/${baseMatch[2]}`;
  
  // Use provided skillPath or fallback to path embedded in URL
  const finalPath = skillPath || parsed.path;
  
  // Normalize path: ensure it starts with /
  let normalizedPath = finalPath.trim();
  if (normalizedPath && !normalizedPath.startsWith('/')) {
    normalizedPath = '/' + normalizedPath;
  }
  
  // GitHub API endpoint (uses main branch by default)
  const url = `${GITHUB_API}/repos/${repo}/contents${normalizedPath}`;
  
  try {
    const entries = await fetchJson(url);
    
    if (!Array.isArray(entries)) {
      throw new Error(`Path "${finalPath || '(root)'}" does not contain skill directories`);
    }
    
    const skills = entries
      .filter((e) => e.type === 'dir' && !e.name.startsWith('.'))
      .map((e) => ({
        skillName: e.name,
        url: e.html_url,
      }));
    
    if (skills.length === 0) {
      throw new Error(`No skills found at path "${finalPath || '(root)'}". Found directories: ${entries.map(e => e.name).join(', ') || 'none'}`);
    }
    
    return skills;
  } catch (err) {
    if (err.message.includes('404')) {
      throw new Error(`Path "${finalPath || '(root)'}" not found in repository`);
    }
    throw err;
  }
}

/**
 * List available skills in a custom repo.
 * Returns array of { skillName, url } objects.
 * Requires repo structure with skill directories.
 */
export async function listSkillsInRepo(baseUrl) {
  const match = baseUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/i);
  if (!match) {
    throw new Error('Custom repo must be a GitHub URL for skill discovery');
  }

  const repo = `${match[1]}/${match[2]}`;
  
  // Try multiple common paths where skills might be located
  const pathsToTry = [
    '',              // Root level: owner/repo/contents
    '/skills',       // Subfolder: owner/repo/contents/skills (Anthropic style)
    '/src/skills',   // Alternative: owner/repo/contents/src/skills
  ];

  for (const path of pathsToTry) {
    try {
      const url = `${GITHUB_API}/repos/${repo}/contents${path}`;
      const entries = await fetchJson(url);
      
      if (!Array.isArray(entries)) continue;
      
      const skills = entries
        .filter((e) => e.type === 'dir' && !e.name.startsWith('.'))
        .map((e) => ({
          skillName: e.name,
          url: e.html_url,
          path: path,  // Track which path skills were found
        }));
      
      // If we found skills at this path, return them
      if (skills.length > 0) {
        return { skills, path };
      }
    } catch (err) {
      // Try next path
      continue;
    }
  }
  
  // If no skills found in any path, throw error
  throw new Error(`No skills found in ${baseUrl}. Tried paths: root, /skills, /src/skills`);
}

/**
 * Fetches the metadata.version from the latest version's usage.md on GitHub.
 * Returns { folder, version } where folder is e.g. "v2" and version is the
 * semantic version from the file's frontmatter metadata (e.g. "2.0").
 */
async function fetchLatestSkillMeta(skillName, repo) {
  const folder = await fetchLatestVersion(skillName, repo);
  if (!folder) return { folder: null, version: null };
  const url = `${GITHUB_RAW}/${repo}/main/${skillName}/${folder}/usage.md`;
  const content = await fetchRaw(url);
  const match = content.match(/^\s+version\s*:\s*["']?([^"'\n]+?)["']?\s*$/m);
  return { folder, version: match ? match[1].trim() : null };
}

/**
 * Batch-checks GitHub for the latest semantic version of each skill.
 * Compares against the installed file's metadata.version — no lock involved.
 * skills: [{ skillName, repo }]
 * Returns Map<skillName, { folder, version } | null>
 */
export async function checkUpdates(skills) {
  const results = new Map();
  await Promise.allSettled(
    skills.map(async ({ skillName, repo }) => {
      if (!repo) { results.set(skillName, null); return; }
      try {
        results.set(skillName, await fetchLatestSkillMeta(skillName, repo));
      } catch {
        results.set(skillName, null);
      }
    }),
  );
  return results;
}
