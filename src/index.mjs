#!/usr/bin/env node
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

import * as clack from '@clack/prompts';

import { AGENTS, AGENT_FLAGS, AGENT_BY_FLAG } from './agents.mjs';
import { detectTechnologies, collectSkills, getInstalledSkillNames, getInstalledSkillsAll, detectInstalledAgents } from './detect.mjs';
import { fetchSkillContents, checkUpdates } from './mcp-client.mjs';
import { readLock, upsertLockSkills } from './lock.mjs';
import { SKILLS_MAP, UNIVERSAL_SKILLS } from './skills-map.mjs';
import {
  printLogo,
  printIntro,
  printOutro,
  printDetected,
  printDryRun,
  printInstalledSkills,
  promptMainMenu,
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
  let resolvedVersion = skill.version ?? null;

  for (const flag of agentFlags) {
    const agent = AGENT_BY_FLAG[flag];
    if (!agent) continue;

    const files = await fetchSkillContents(
      [skill],
      targetDir,
      agent.installDir,
      agent.fileTemplate,
    );

    for (const { path, content, version } of files) {
      mkdirSync(dirname(path), { recursive: true });
      writeFileSync(path, content, 'utf-8');
      paths.push(path);
      if (version) resolvedVersion = version;
    }
  }

  return paths.length
    ? { success: true, paths, version: resolvedVersion }
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

  // ── Main loop ─────────────────────────────────────────────────
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const menuAction = await promptMainMenu();

    if (menuAction === 'exit') break;

    // ── Ver skills / Actualizar ──────────────────────────────────
    if (menuAction === 'list' || menuAction === 'update') {
      const lock        = readLock(projectDir);
      const rawSkills   = getInstalledSkillsAll(projectDir, lock);

      // Build repo lookup from skills maps as fallback for skills not in lock
      const repoLookup  = new Map([
        ...UNIVERSAL_SKILLS.map((s) => [s.skillName, s.repo]),
        ...SKILLS_MAP.flatMap((t) => (t.mcpSkills || []).map((s) => [s.skillName, s.repo])),
      ]);

      // Enrich skills that have no repo in lock with the one from the maps
      const agentSkills = rawSkills.map((a) => ({
        ...a,
        skills: a.skills.map((s) => ({
          ...s,
          repo: s.repo ?? repoLookup.get(s.name) ?? null,
        })),
      }));

      // Only universal skills are auto-updated; stack skills are excluded.
      // Skills without githubRelease (no lock entry) are included — any latest is "available".
      const universalNames = new Set(UNIVERSAL_SKILLS.map((s) => s.skillName));
      const allSkills   = agentSkills.flatMap((a) => a.skills)
        .filter((s) => s.repo && universalNames.has(s.name))
        .map((s) => ({ skillName: s.name, repo: s.repo }));

      let updates = null;
      if (allSkills.length) {
        const spinner = clack.spinner();
        spinner.start('Verificando actualizaciones…');
        updates = await checkUpdates(allSkills);
        spinner.stop('Versiones verificadas.');
      }

      printInstalledSkills(agentSkills, { showIfEmpty: true, updates });

      if (menuAction === 'update') {
        clack.log.info('Solo se actualizarán las skills universales (commits, review-pr, etc.).');

        const toUpdate = agentSkills.flatMap((a) =>
          a.skills
            .filter((s) => {
              const meta = updates?.get(s.name);
              // Compare semantic version from local file vs GitHub — no lock involved
              return meta?.version && meta.version !== s.version && s.repo && universalNames.has(s.name);
            })
            .map((s) => ({
              skillName: s.name,
              version:   updates.get(s.name).folder,  // folder name (v2) used for download URL
              repo:      s.repo,
              agents:    lock.skills[s.name]?.agents ?? [a.agentFlag],
            })),
        );

        const unique = [...new Map(toUpdate.map((s) => [s.skillName, s])).values()];

        if (!unique.length) {
          clack.log.success('Todo está actualizado. No hay nuevas versiones disponibles.');
          continue;
        }

        const { installed, failed } = await runWithProgress(
          unique,
          unique.flatMap((s) => s.agents),
          async (skill) => {
            try {
              return await installSkill(skill, skill.agents, projectDir);
            } catch (err) {
              return { success: false, output: err.message };
            }
          },
        );

        if (installed > 0) {
          upsertLockSkills(
            projectDir,
            unique.map((s) => ({ skillName: s.skillName, version: s.version, repo: s.repo, agents: s.agents })),
          );
        }

        clack.log.info(`${installed} actualizada${installed !== 1 ? 's' : ''}${failed > 0 ? `, ${failed} fallida${failed !== 1 ? 's' : ''}` : ''}.`);
      }

      continue;
    }

    // ── Nueva instalación ────────────────────────────────────────

    // Step 1: Which agents?
    let agentFlags = flags.agents;
    if (!agentFlags.length) {
      const installedAgents = detectInstalledAgents();
      agentFlags = await promptAgents(installedAgents, Object.values(AGENTS));
    }

    // Step 2: Which technologies?
    const selectedTechs = await promptTechnologies(SKILLS_MAP);
    const useAutoDetect  = selectedTechs.includes('__auto__');
    const manualTechIds  = selectedTechs.filter((id) => id !== '__auto__');

    // Scan
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

    if (manualTechIds.length) {
      const detectedIds = new Set(detected.map((t) => t.id));
      for (const tech of SKILLS_MAP.filter((t) => manualTechIds.includes(t.id))) {
        if (!detectedIds.has(tech.id)) {
          detected.push(tech);
          detectedIds.add(tech.id);
        }
      }
    }

    // Collect suggestions
    const installedNames = getInstalledSkillNames(projectDir);
    const suggestions    = collectSkills({ detected, installedNames });

    // Step 3: Pick skills
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

    if (!selected.length) continue;

    // Dry-run
    if (flags.dryRun) {
      printDryRun(selected.map((s) => s.skillName), agentFlags);
      continue;
    }

    // Install
    const succeededSkills = [];
    const { installed, failed } = await runWithProgress(
      selected,
      agentFlags,
      async (skill) => {
        try {
          const result = await installSkill(skill, agentFlags, projectDir);
          if (result.success) succeededSkills.push({ ...skill, resolvedVersion: result.version });
          return result;
        } catch (err) {
          return { success: false, output: err.message };
        }
      },
    );

    if (succeededSkills.length) {
      upsertLockSkills(
        projectDir,
        succeededSkills.map((s) => ({
          skillName: s.skillName,
          version:   s.resolvedVersion ?? s.version ?? null,
          repo:      s.repo ?? null,
          agents:    agentFlags,
        })),
      );
    }

    clack.log.info(`${installed} instalada${installed !== 1 ? 's' : ''}${failed > 0 ? `, ${failed} fallida${failed !== 1 ? 's' : ''}` : ''}.`);
  }

  printOutro(0, 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
