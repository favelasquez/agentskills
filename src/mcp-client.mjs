import { get }               from 'node:https';

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
 * GitHub:    { skillName, repo: 'owner/repo', version? }
 *            → https://raw.githubusercontent.com/{repo}/main/{skillName}/{version}/usage.md
 */
function buildSkillUrl({ skillName, repo, version }) {
  if (repo) {
    const ver = version || 'v1';
    return `${GITHUB_RAW}/${repo}/main/${skillName}/${ver}/usage.md`;
  }
  throw new Error(`Skill "${skillName}" has no repo field`);
}

// ── Main export ───────────────────────────────────────────────

/**
 * Fetches skill content from GitHub.
 * If skill has no version, resolves the latest available version first.
 * Each result includes the resolved version so the caller can store it in the lock.
 */
export async function fetchSkillContents(skills, targetDir, agentInstallDir, fileTemplate = '{skillName}.md') {
  const results = [];

  for (const skill of skills) {
    const { skillName, repo } = skill;

    // Resolve version: use explicit one or fetch latest from GitHub
    const version = skill.version || await fetchLatestVersion(skillName, repo);

    const url = buildSkillUrl({ skillName, repo, version });

    let content = await fetchRaw(url);

    // Strip UTF-8 BOM if present so YAML frontmatter parses correctly
    if (content.charCodeAt(0) === 0xFEFF) {
      content = content.slice(1);
    }

    const fileName = fileTemplate.replace('{skillName}', skillName);
    const path     = `${targetDir}/${agentInstallDir}/${fileName}`;

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
