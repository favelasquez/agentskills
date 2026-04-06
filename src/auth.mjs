import { spawnSync }                    from 'node:child_process';
import { get }                          from 'node:https';
import { existsSync, readFileSync,
         writeFileSync, mkdirSync }     from 'node:fs';
import { join }                         from 'node:path';
import { homedir }                      from 'node:os';

const CACHE_PATH = join(homedir(), '.agentskills', 'token.json');
const BB_API     = 'api.bitbucket.org';

// In-process cache — base64(username:password)
let _cachedB64 = null;

// ── 1. Read credentials from git credential store ─────────────
// Atlassian Atlascode stores Bitbucket credentials here automatically.

function readCredentialsFromGit() {
  const result = spawnSync(
    'git',
    ['credential', 'fill'],
    { input: 'protocol=https\nhost=bitbucket.org\n', encoding: 'utf-8', timeout: 5000 },
  );

  if (result.error || result.status !== 0) return null;

  const lines = (result.stdout || '').split('\n');
  const pick  = (prefix) => {
    const l = lines.find((x) => x.startsWith(prefix));
    return l ? l.slice(prefix.length).trim() : null;
  };

  const username = pick('username=');
  const password = pick('password=');
  return username && password ? { username, password } : null;
}

// ── 2. Validate via Bitbucket API ─────────────────────────────

function validateBasicAuth(b64) {
  return new Promise((resolve) => {
    get(
      { hostname: BB_API, path: '/2.0/user', headers: { Authorization: `Basic ${b64}` } },
      (res) => { resolve(res.statusCode === 200); res.resume(); },
    ).on('error', () => resolve(false));
  });
}

// ── 3. Disk cache ─────────────────────────────────────────────

function loadCache() {
  try {
    if (!existsSync(CACHE_PATH)) return null;
    const { b64 } = JSON.parse(readFileSync(CACHE_PATH, 'utf-8'));
    return b64 || null;
  } catch { return null; }
}

function saveCache(b64) {
  try {
    mkdirSync(join(homedir(), '.agentskills'), { recursive: true });
    writeFileSync(CACHE_PATH, JSON.stringify({ b64 }, null, 2), 'utf-8');
  } catch {}
}

function clearCache() {
  try { writeFileSync(CACHE_PATH, JSON.stringify({}), 'utf-8'); } catch {}
}

// ── Public API ────────────────────────────────────────────────

/**
 * Returns a Basic Auth base64 string for Bitbucket API calls.
 *
 * Resolution order:
 *   1. In-process cache (fastest)
 *   2. Disk cache  ~/.agentskills/token.json
 *   3. git credential fill  (managed by Atlassian Atlascode in VS Code)
 *
 * Throws with clear instructions if credentials are missing or invalid.
 */
export async function getBitbucketAuth() {
  // 1. In-process cache
  if (_cachedB64) return _cachedB64;

  // 2. Disk cache
  const cached = loadCache();
  if (cached) {
    const valid = await validateBasicAuth(cached);
    if (valid) {
      _cachedB64 = cached;
      return _cachedB64;
    }
    clearCache(); // stale — discard
  }

  // 3. git credential fill
  const creds = readCredentialsFromGit();

  if (!creds) {
    throw new Error(
      '\n  ✗  No Bitbucket credentials found in git credential store.\n' +
      '     Activate the Atlassian (Atlascode) extension in VS Code,\n' +
      '     connect your Bitbucket account, and retry.\n',
    );
  }

  const b64   = Buffer.from(`${creds.username}:${creds.password}`).toString('base64');
  const valid = await validateBasicAuth(b64);

  if (!valid) {
    throw new Error(
      '\n  ✗  Bitbucket credentials are invalid or expired (401).\n' +
      '     Re-authenticate in VS Code via the Atlassian extension and retry.\n',
    );
  }

  saveCache(b64);
  _cachedB64 = b64;
  return _cachedB64;
}
