import * as clack from '@clack/prompts';
import { pickFolder } from './folder-picker.mjs';

// ── Colors ────────────────────────────────────────────────────

const c = {
  reset:   '\x1b[0m',
  bold:    '\x1b[1m',
  dim:     '\x1b[2m',
  cyan:    '\x1b[36m',
  green:   '\x1b[32m',
  yellow:  '\x1b[33m',
  red:     '\x1b[31m',
  blue:    '\x1b[34m',
  magenta: '\x1b[35m',
  white:   '\x1b[37m',
};

const fmt = {
  bold:    (s) => `${c.bold}${s}${c.reset}`,
  dim:     (s) => `${c.dim}${s}${c.reset}`,
  cyan:    (s) => `${c.cyan}${s}${c.reset}`,
  green:   (s) => `${c.green}${s}${c.reset}`,
  yellow:  (s) => `${c.yellow}${s}${c.reset}`,
  red:     (s) => `${c.red}${s}${c.reset}`,
  blue:    (s) => `${c.blue}${s}${c.reset}`,
  magenta: (s) => `${c.magenta}${s}${c.reset}`,
  white:   (s) => `${c.white}${s}${c.reset}`,
};

// ── Logo ──────────────────────────────────────────────────────

export function printLogo() {
  const cya  = c.cyan  + c.bold;
  const mag  = c.magenta + c.bold;
  const rst  = c.reset;

  process.stdout.write([
    '',
    `  ${cya} █████╗  ██████╗ ███████╗███╗   ██╗████████╗${rst}`,
    `  ${cya}██╔══██╗██╔════╝ ██╔════╝████╗  ██║╚══██╔══╝${rst}`,
    `  ${cya}███████║██║  ███╗█████╗  ██╔██╗ ██║   ██║   ${rst}`,
    `  ${cya}██╔══██║██║   ██║██╔══╝  ██║╚██╗██║   ██║   ${rst}`,
    `  ${cya}██║  ██║╚██████╔╝███████╗██║ ╚████║   ██║   ${rst}`,
    `  ${cya}╚═╝  ╚═╝ ╚═════╝ ╚══════╝╚═╝  ╚═══╝   ╚═╝   ${rst}`,
    '',
    `  ${mag}███████╗██╗  ██╗██╗██╗     ██╗     ███████╗${rst}`,
    `  ${mag}██╔════╝██║ ██╔╝██║██║     ██║     ██╔════╝${rst}`,
    `  ${mag}███████╗█████╔╝ ██║██║     ██║     ███████╗${rst}`,
    `  ${mag}╚════██║██╔═██╗ ██║██║     ██║     ╚════██║${rst}`,
    `  ${mag}███████║██║  ██╗██║███████╗███████╗███████║${rst}`,
    `  ${mag}╚══════╝╚═╝  ╚═╝╚═╝╚══════╝╚══════╝╚══════╝${rst}`,
    '',
    `  ${c.dim}  Install AI agent skills for your stack — one command${rst}`,
    '',
  ].join('\n'));
}

// ── Intro / Outro ─────────────────────────────────────────────

export function printIntro() {
  clack.intro(fmt.bold(fmt.cyan(' Agent Skills - By https://github.com/favelasquez')));
}

// ── Main menu ─────────────────────────────────────────────────

export async function promptMainMenu() {
  const action = await clack.select({
    message: fmt.bold('¿Qué querés hacer?'),
    options: [
      {
        value: 'install',
        label: fmt.bold('Nueva instalación'),
        hint:  'detectar stack e instalar skills para tus agentes',
      },
      {
        value: 'list',
        label: fmt.bold('Ver skills instaladas'),
        hint:  'listar skills con versión instalada y actualizaciones disponibles',
      },
      {
        value: 'update',
        label: fmt.bold('Actualizar skills'),
        hint:  'actualizar todas las skills instaladas a su última versión',
      },
      {
        value: 'exit',
        label: fmt.dim('Salir'),
      },
    ],
  });

  if (clack.isCancel(action)) { clack.cancel('Cancelado.'); process.exit(0); }
  return action;
}

// ── Installed skills summary ──────────────────────────────────

/**
 * updates: Map<skillName, latestVersion> — pass null to skip update badges.
 */
export function printInstalledSkills(agentSkills, { showIfEmpty = false, updates = null } = {}) {
  const withSkills = agentSkills.filter((a) => a.skills.length > 0);

  if (!withSkills.length) {
    if (showIfEmpty) clack.log.warn('No hay skills instaladas en este proyecto.');
    return;
  }

  const total = withSkills.reduce((n, a) => n + a.skills.length, 0);
  const lines = withSkills.map(
    ({ agentName, skills }) =>
      `  ${fmt.bold(agentName)}\n` +
      skills.map((s) => {
        const meta      = updates?.get(s.name);
        const hasUpdate = meta?.version && meta.version !== s.version;
        const verStr    = s.version ? fmt.yellow(s.version) : fmt.dim('sin versión');
        const badge     = hasUpdate ? `  ${fmt.green(`↑ ${meta.version} disponible`)}` : '';
        return `    ${fmt.dim('·')}  ${fmt.cyan(s.name)}  ${verStr}${badge}`;
      }).join('\n'),
  );

  const pendingCount = updates
    ? [...updates.entries()].filter(([name, meta]) => {
        const skill = withSkills.flatMap((a) => a.skills).find((s) => s.name === name);
        return meta?.version && skill && meta.version !== skill.version;
      }).length
    : 0;

  const updateNote = pendingCount > 0
    ? `  ${fmt.green(`· ${pendingCount} actualización${pendingCount !== 1 ? 'es' : ''} disponible${pendingCount !== 1 ? 's' : ''}`)}`
    : '';

  clack.log.info(
    `${fmt.bold('Skills instaladas')}  ${fmt.dim(`(${total} total)`)}${updateNote}\n` +
    lines.join('\n'),
  );
}

export function printOutro(installed, failed) {
  if (failed > 0) {
    clack.outro(
      `${fmt.green(`✔  ${installed} installed`)}   ${fmt.red(`✘  ${failed} failed`)}`,
    );
  } else if (installed > 0) {
    clack.outro(
      fmt.green(`✔  ${installed} skill${installed !== 1 ? 's' : ''} installed — you're all set!`),
    );
  } else {
    clack.outro(fmt.dim('Nothing to install. Already up to date.'));
  }
}

// ── Step 1 — Agent selection ──────────────────────────────────

export async function promptAgents(installedAgents, allAgents) {
  const detected  = new Set(installedAgents.map((a) => a.flag));

  const options = [
    {
      value: '__all__',
      label: fmt.bold('All agents'),
      hint:  'install for every supported agent',
    },
    ...allAgents.map((a) => ({
      value: a.flag,
      label: detected.has(a.flag)
        ? `${fmt.bold(a.name)}  ${fmt.green('● detected')}`
        : fmt.dim(a.name),
      hint: detected.has(a.flag) ? undefined : 'not detected in home dir',
    })),
    {
      value: '__custom__',
      label: fmt.bold('Custom agent'),
      hint:  'choose any folder on your filesystem',
    },
  ];

  const selected = await clack.multiselect({
    message: `${fmt.bold('Step 1 / 3')}  ${fmt.dim('—')}  Which AI agents do you use?`,
    options,
    initialValues: installedAgents.length
      ? installedAgents.map((a) => a.flag)
      : ['__all__'],
    required: true,
  });

  if (clack.isCancel(selected)) { clack.cancel('Cancelled.'); process.exit(0); }

  return selected.includes('__all__')
    ? allAgents.map((a) => a.flag)
    : selected;
}

// ── Step 2 — Technology selection ────────────────────────────

export async function promptTechnologies(allTechs) {
  const options = [
    {
      value: '__auto__',
      label: fmt.bold('Auto-detect'),
      hint:  'scan my project directory  (recommended)',
    },
    ...allTechs.map((t) => ({
      value: t.id,
      label: t.name,
    })),
  ];

  const selected = await clack.multiselect({
    message: `${fmt.bold('Step 2 / 3')}  ${fmt.dim('—')}  What technologies does your project use?`,
    options,
    initialValues: ['__auto__'],
    required: true,
  });

  if (clack.isCancel(selected)) { clack.cancel('Cancelled.'); process.exit(0); }

  return selected;
}

// ── Detection summary ─────────────────────────────────────────

export function printDetected(detected, combos, isFrontend) {
  if (!detected.length && !isFrontend) {
    clack.log.warn('No recognizable stack found in this directory.');
    return;
  }

  const techs = detected.map((t) => fmt.cyan(t.name));
  if (isFrontend) techs.push(fmt.cyan('Frontend'));

  clack.log.info(`Detected: ${techs.join(fmt.dim('  ·  '))}`);

  if (combos.length) {
    clack.log.info(`Combos: ${combos.map((combo) => fmt.magenta(combo.name)).join('  ·  ')}`);
  }
}

// ── Step 3 — Skill selection ──────────────────────────────────

export async function promptSkills(suggestions) {
  if (!suggestions.length) {
    clack.log.warn('No skills found for the detected stack.');
    return [];
  }

  const stack     = suggestions.filter((s) => s.category === 'stack');
  const universal = suggestions.filter((s) => s.category === 'universal');
  const rest      = suggestions.filter((s) => s.category !== 'stack' && s.category !== 'universal');
  const ordered   = [...stack, ...universal, ...rest];

  const options = ordered.map((s) => {
    const source = s.sources.join('  ·  ');
    const label  = s.alreadyInstalled
      ? `${fmt.dim(s.displayName || s.skillName)}  ${fmt.green('✓ installed')}`
      : fmt.bold(s.displayName || s.skillName);
    const hint   = s.alreadyInstalled
      ? undefined
      : s.category === 'universal'
        ? 'universal'
        : source;

    return { value: s.skillName, label, hint };
  });

  const selected = await clack.multiselect({
    message: `${fmt.bold('Step 3 / 3')}  ${fmt.dim('—')}  Select skills to install  ${fmt.dim(`(${suggestions.length} available)`)}`,
    options,
    initialValues: ordered
      .filter((s) => !s.alreadyInstalled && s.category === 'stack')
      .map((s) => s.skillName),
    required: false,
  });

  if (clack.isCancel(selected)) { clack.cancel('Cancelled.'); process.exit(0); }

  return selected;
}

// ── Dry-run summary ───────────────────────────────────────────

export function printDryRun(selectedSkills, agentFlags) {
  clack.log.warn('Dry-run — nothing will be written.');

  if (!selectedSkills.length) {
    clack.log.message('No skills selected.');
    return;
  }

  const agentLabel = agentFlags.length ? agentFlags.join(', ') : 'all agents';
  clack.log.message(
    `Would install ${fmt.bold(String(selectedSkills.length))} skill(s) for ${fmt.cyan(agentLabel)}:\n` +
    selectedSkills.map((s) => `  ${fmt.dim('→')}  ${fmt.bold(s)}`).join('\n'),
  );
}

// ── Install progress ──────────────────────────────────────────

export async function runWithProgress(skills, agentIds, installFn) {
  let installed = 0;
  let failed    = 0;
  const errors  = [];
  const spinner = clack.spinner();

  for (const skill of skills) {
    const label = typeof skill === 'string' ? skill : skill.skillName;
    spinner.start(`Installing ${fmt.cyan(label)}…`);
    const result = await installFn(skill, agentIds);
    if (result.success) {
      spinner.stop(`${fmt.green('✔')}  ${fmt.bold(label)}`);
      installed++;
    } else {
      spinner.stop(`${fmt.red('✘')}  ${label}`);
      failed++;
      errors.push({ skill: label, output: result.output });
    }
  }

  if (errors.length) {
    clack.log.error('Some skills failed to install:');
    for (const e of errors) {
      clack.log.message(`  ${fmt.red(e.skill)}\n  ${fmt.dim(e.output.trim())}`);
    }
  }

  return { installed, failed, errors };
}

// ── Bitbucket credentials ─────────────────────────────────────

export async function promptBitbucketCredentials() {
  clack.log.warn(
    'Some skills are in a private Bitbucket repo.\n' +
    '  Provide your credentials to download them.\n' +
    `  ${fmt.dim('Tip: set BITBUCKET_USER and BITBUCKET_APP_PASSWORD env vars to skip this prompt.')}`,
  );

  const user = await clack.text({
    message: 'Bitbucket username:',
    validate: (v) => (v.trim() ? undefined : 'Required'),
  });
  if (clack.isCancel(user)) { clack.cancel('Cancelled.'); process.exit(0); }

  const pass = await clack.password({
    message: 'Bitbucket App Password:',
    validate: (v) => (v.trim() ? undefined : 'Required'),
  });
  if (clack.isCancel(pass)) { clack.cancel('Cancelled.'); process.exit(0); }

  return { user: user.trim(), pass: pass.trim() };
}

// ── Custom agent path ─────────────────────────────────────────

export async function promptCustomAgentPath() {
  clack.log.info(
    `${fmt.bold('Custom agent')}  ${fmt.dim('—')}  Skills will be saved as ${fmt.cyan('<folder>/<skillName>.md')}`,
  );

  try {
    const folder = await pickFolder(process.cwd());
    clack.log.success(`Folder selected: ${fmt.cyan(folder)}`);
    return folder;
  } catch {
    clack.cancel('Cancelled.');
    process.exit(0);
  }
}

// ── Manual skill fallback ─────────────────────────────────────

export async function promptManualSkill() {
  const skill = await clack.text({
    message: 'Enter a skill path (e.g. owner/repo/skill-name):',
    placeholder: 'owner/repo/skill-name',
    validate: (v) => (v.includes('/') ? undefined : 'Must be in owner/repo format'),
  });

  if (clack.isCancel(skill)) { clack.cancel('Cancelled.'); process.exit(0); }

  return skill;
}
