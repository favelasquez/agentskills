import { get }               from 'node:https';

const GITHUB_RAW    = 'https://raw.githubusercontent.com';

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
 */
export async function fetchSkillContents(skills, targetDir, agentInstallDir, fileTemplate = '{skillName}.md') {
  const results = [];

  for (const skill of skills) {
    const { skillName } = skill;
    const url = buildSkillUrl(skill);

    const headers = {};
    let content = await fetchRaw(url, headers);
    
    // Strip UTF-8 BOM if present so YAML frontmatter parses correctly
    if (content.charCodeAt(0) === 0xFEFF) {
      content = content.slice(1);
    }

    const fileName = fileTemplate.replace('{skillName}', skillName);
    const path     = `${targetDir}/${agentInstallDir}/${fileName}`;

    results.push({ path, content });
  }

  return results;
}

export async function listSkills() {
  return [];
}
