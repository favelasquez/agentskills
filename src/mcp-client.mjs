import { get }               from 'node:https';
import { getBitbucketAuth } from './auth.mjs';

const GITHUB_RAW    = 'https://raw.githubusercontent.com';
const BITBUCKET_API = 'https://api.bitbucket.org/2.0/repositories';

// ── HTTP fetch ────────────────────────────────────────────────

function fetchRaw(url, headers = {}) {
  return new Promise((resolve, reject) => {
    get(url, { headers }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        return fetchRaw(res.headers.location, headers).then(resolve).catch(reject);
      }
      if (res.statusCode === 401 || res.statusCode === 403) {
        return reject(new Error(
          `Access denied (${res.statusCode}). ` +
          `Re-authenticate in VS Code via the Atlassian extension and retry.`,
        ));
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode} fetching ${url}`));
      }
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => resolve(body));
    }).on('error', reject);
  });
}

// ── URL builder ───────────────────────────────────────────────

/**
 * GitHub:    { skillName, repo: 'owner/repo', subdir? }
 *            → https://raw.githubusercontent.com/{repo}/HEAD/{skillName}/SKILL.md
 *
 * Bitbucket: { skillName, bitbucket: 'workspace/repo', version }
 *            → https://bitbucket.org/{workspace/repo}/raw/master/src/skills/{skillName}/{version}/usage.md
 */
function buildSkillUrl({ skillName, repo, subdir, bitbucket, version }) {
  if (bitbucket) {
    const ver = version || 'v1';
    return `${BITBUCKET_API}/${bitbucket}/src/master/src/skills/${skillName}/${ver}/usage.md`;
  }
  if (repo) {
    const skillPath = subdir ? `${subdir}/${skillName}/SKILL.md` : `${skillName}/SKILL.md`;
    return `${GITHUB_RAW}/${repo}/HEAD/${skillPath}`;
  }
  throw new Error(`Skill "${skillName}" has no repo or bitbucket field`);
}

// ── Main export ───────────────────────────────────────────────

/**
 * Fetches skill content from GitHub or Bitbucket.
 * Bitbucket skills use the token from git credential store (Atlassian Atlascode).
 */
export async function fetchSkillContents(skills, targetDir, agentInstallDir, fileTemplate = '{skillName}.md') {
  const results = [];

  // Resolve Bitbucket auth once for the whole batch
  const needsBitbucket = skills.some((s) => s.bitbucket);
  let bbAuth = null;
  if (needsBitbucket) {
    bbAuth = await getBitbucketAuth();
  }

  for (const skill of skills) {
    const { skillName, bitbucket } = skill;
    const url = buildSkillUrl(skill);

    const headers = {};
    if (bitbucket && bbAuth) {
      headers['Authorization'] = `Basic ${bbAuth}`;
    }

    const content = await fetchRaw(url, headers);
    const fileName = fileTemplate.replace('{skillName}', skillName);
    const path     = `${targetDir}/${agentInstallDir}/${fileName}`;

    results.push({ path, content });
  }

  return results;
}

export async function listSkills() {
  return [];
}
