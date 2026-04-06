#!/usr/bin/env node
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

import * as clack from '@clack/prompts';

import { AGENTS, AGENT_FLAGS, AGENT_BY_FLAG } from './agents.mjs';
import { detectTechnologies, collectSkills, getInstalledSkillNames, detectInstalledAgents } from './detect.mjs';
import { fetchSkillContents } from './mcp-client.mjs';
import { SKILLS_MAP } from './skills-map.mjs';
import {
  printLogo,
  printIntro,
  printOutro,
  printDetected,
  printDryRun,
  promptAgents,
  promptTechnologies,
  promptSkills,
  runWithProgress,
} from './ui.mjs';

// ── Arg Parsing ──────────────────────────────────────────────

function parseArgs(argv) {
  const args = argv.slice(2);
  const flags = {
    agents: [],
    dryRun: false,
    yes: false,
    dir: process.cwd(),
    help: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--dry-run' || arg === '-d') {
      flags.dryRun = true;
    } else if (arg === '-y' || arg === '--yes') {
      flags.yes = true;
    } else if (arg === '--help' || arg === '-h') {
      flags.help = true;
    } else if (arg === '--dir' && args[i + 1]) {
      flags.dir = resolve(args[++i]);
    } else if (arg.startsWith('--')) {
      const flag = arg.slice(2);
      if (AGENT_FLAGS.includes(flag)) {
        flags.agents.push(flag);
      } else {
        console.error(`Unknown flag: ${arg}`);
        process.exit(1);
      }
    }
  }

  return flags;
}

function printHelp() {
  console.log(`
  agentskills — detect your stack and install AI agent skills

  Usage:
    npx agentskills [options]

  Agent flags (select target agents):
${Object.values(AGENTS)
  .map((a) => `    --${a.flag.padEnd(16)} ${a.name}`)
  .join('\n')}

  Options:
    --dry-run, -d    Preview skills without installing
    -y, --yes        Skip confirmations (install all suggested)
    --dir <path>     Project directory to scan (default: cwd)
    --help, -h       Show this help
`);
}

// ── Installer ─────────────────────────────────────────────────

async function installSkill(skill, agentFlags, targetDir) {
  const paths = [];

  for (const flag of agentFlags) {
    const agent = AGENT_BY_FLAG[flag];
    if (!agent) continue;

    const files = await fetchSkillContents(
      [skill],
      targetDir,
      agent.installDir,
      agent.fileTemplate,
    );

    for (const { path, content } of files) {
      mkdirSync(dirname(path), { recursive: true });
      writeFileSync(path, content, 'utf-8');
      paths.push(path);
    }
  }

  return paths.length
    ? { success: true, paths }
    : { success: false, error: 'No files written' };
}

// ── Main ──────────────────────────────────────────────────────

async function main() {
  const flags = parseArgs(process.argv);

  if (flags.help) {
    printHelp();
    process.exit(0);
  }

  const projectDir = flags.dir;

  // ── Logo + intro ────────────────────────────────────────────
  printLogo();
  printIntro();

  // ── Step 1: Which agents? ───────────────────────────────────
  let agentFlags = flags.agents;
  if (!agentFlags.length) {
    const installedAgents = detectInstalledAgents();
    agentFlags = await promptAgents(installedAgents, Object.values(AGENTS));
  }

  // ── Step 2: Which technologies? ─────────────────────────────
  const selectedTechs = await promptTechnologies(SKILLS_MAP);
  const useAutoDetect  = selectedTechs.includes('__auto__');
  const manualTechIds  = selectedTechs.filter((id) => id !== '__auto__');

  // ── Scan ─────────────────────────────────────────────────────
  let detected   = [];
  let isFrontend = false;

  if (useAutoDetect) {
    const spinner = clack.spinner();
    spinner.start('Scanning project…');
    const result = detectTechnologies(projectDir);
    detected   = result.detected;
    isFrontend = result.isFrontend;
    const count = detected.length + (isFrontend ? 1 : 0);
    spinner.stop(`Scan complete — ${count} tech${count !== 1 ? 's' : ''} found`);
    printDetected(detected, [], isFrontend);
  }

  // Merge manual picks (avoid duplicates)
  if (manualTechIds.length) {
    const detectedIds = new Set(detected.map((t) => t.id));
    for (const tech of SKILLS_MAP.filter((t) => manualTechIds.includes(t.id))) {
      if (!detectedIds.has(tech.id)) {
        detected.push(tech);
        detectedIds.add(tech.id);
      }
    }
  }

  // ── Collect skill suggestions ────────────────────────────────
  const installedNames = getInstalledSkillNames(projectDir);
  const suggestions    = collectSkills({ detected, installedNames });

  // ── Step 3: Pick skills ──────────────────────────────────────
  let selected;

  if (flags.yes) {
    selected = suggestions
      .filter((s) => !s.alreadyInstalled)
      .map(({ skillName, repo, subdir, bitbucket, version }) => ({ skillName, repo, subdir, bitbucket, version }));
  } else {
    const enriched = suggestions.map((s) => ({
      ...s,
      displayName: s.skillName,
      description: s.bitbucket
        ? `bitbucket.org/${s.bitbucket}`
        : s.repo ? `github.com/${s.repo}` : '',
    }));

    const picked = await promptSkills(enriched);
    selected = picked.map((key) => {
      const skillName = key.split('@')[0];
      const match     = suggestions.find((s) => s.skillName === skillName);
      return {
        skillName,
        repo:      match?.repo,
        subdir:    match?.subdir,
        bitbucket: match?.bitbucket,
        version:   match?.version,
      };
    });
  }

  if (!selected.length) {
    printOutro(0, 0);
    process.exit(0);
  }

  // ── Dry-run ──────────────────────────────────────────────────
  if (flags.dryRun) {
    printDryRun(selected.map((s) => s.skillName), agentFlags);
    printOutro(0, 0);
    process.exit(0);
  }

  // ── Install ───────────────────────────────────────────────────
  const { installed, failed } = await runWithProgress(
    selected,
    agentFlags,
    async (skill) => {
      try {
        return await installSkill(skill, agentFlags, projectDir);
      } catch (err) {
        return { success: false, output: err.message };
      }
    },
  );

  printOutro(installed, failed);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
