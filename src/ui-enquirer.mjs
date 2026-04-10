import Enquirer from 'enquirer';
import { pickFolder } from './folder-picker.mjs';

const enquirer = new Enquirer();

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
  console.log('');
  console.log(fmt.bold(fmt.cyan(' ⚙  Agent Skills - By https://github.com/favelasquez')));
  console.log('');
}

export function printOutro(installed, failed) {
  console.log('');
  if (failed > 0) {
    console.log(
      `${fmt.green(`✔  ${installed} installed`)}   ${fmt.red(`✘  ${failed} failed`)}`
    );
  } else if (installed > 0) {
    console.log(
      fmt.green(`✔  ${installed} skill${installed !== 1 ? 's' : ''} installed — you're all set!`)
    );
  } else {
    console.log(fmt.dim('Nothing to install. Already up to date.'));
  }
  console.log('');
}

// ── Main menu ─────────────────────────────────────────────────

export async function promptMainMenu() {
  try {
    const response = await enquirer.prompt({
      type: 'select',
      name: 'action',
      message: fmt.bold('¿Qué querés hacer?'),
      choices: [
        {
          name: 'install',
          message: fmt.bold('Nueva instalación'),
          hint:  'detectar stack e instalar skills para tus agentes',
        },
        {
          name: 'custom-repo',
          message: fmt.bold('Instalar desde repo personalizado'),
          hint:  'instalar skills desde Vercel, tu org, o comunidad',
        },
        {
          name: 'list',
          message: fmt.bold('Ver skills instaladas'),
          hint:  'listar skills con versión instalada y actualizaciones disponibles',
        },
        {
          name: 'update',
          message: fmt.bold('Actualizar skills'),
          hint:  'actualizar todas las skills instaladas a su última versión',
        },
        {
          name: 'exit',
          message: fmt.dim('Salir'),
        },
      ],
    });
    return response.action;
  } catch (e) {
    console.log(fmt.red('✖ Cancelado.'));
    process.exit(0);
  }
}

// ── Installed skills summary ──────────────────────────────────

export function printInstalledSkills(agentSkills, { showIfEmpty = false, updates = null } = {}) {
  const withSkills = agentSkills.filter((a) => a.skills.length > 0);

  if (!withSkills.length) {
    if (showIfEmpty) console.log(fmt.yellow('⚠  No hay skills instaladas en este proyecto.'));
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

  console.log(
    `${fmt.bold('Skills instaladas')}  ${fmt.dim(`(${total} total)`)}${updateNote}\n` +
    lines.join('\n')
  );
}

// ── Detected technologies ─────────────────────────────────────

export function printDetected(technologies, hint = '') {
  console.log('');
  console.log(fmt.bold(fmt.cyan('🔍 Tecnologías detectadas')));
  technologies.forEach((tech) => {
    console.log(`   ${fmt.green('✔')}  ${fmt.bold(tech)}`);
  });
  if (hint) {
    console.log(fmt.dim(`\n   ${hint}`));
  }
}

export function printDryRun(skills) {
  console.log('');
  console.log(fmt.bold(fmt.yellow('📋 Dry run')));
  console.log(fmt.dim('Esto es lo que se instalaría:'));
  skills.forEach((skill) => {
    console.log(`   ${fmt.dim('·')}  ${fmt.cyan(skill.skillName)}`);
  });
}

// ── Step 1 — Agent selection ──────────────────────────────────

export async function promptAgents(installedAgents, allAgents) {
  const detected  = new Set(installedAgents.map((a) => a.flag));

  const choices = [
    {
      name: '__all__',
      message: fmt.bold('All agents'),
      hint:  'install for every supported agent',
    },
    ...allAgents.map((a) => ({
      name: a.flag,
      message: detected.has(a.flag)
        ? `${fmt.bold(a.name)}  ${fmt.green('● detected')}`
        : fmt.dim(a.name),
      hint: detected.has(a.flag) ? undefined : 'not detected in home dir',
    })),
    {
      name: '__custom__',
      message: fmt.bold('Custom agent'),
      hint:  'choose any folder on your filesystem',
    },
  ];

  try {
    const response = await enquirer.prompt({
      type: 'multiselect',
      name: 'agents',
      message: `${fmt.bold('Step 1 / 3')}  ${fmt.dim('—')}  Which AI agents do you use?`,
      choices,
      initial: installedAgents.length
        ? installedAgents.map((a) => a.flag)
        : ['__all__'],
    });

    const selected = response.agents;
    return selected.includes('__all__')
      ? allAgents.map((a) => a.flag)
      : selected;
  } catch (e) {
    console.log(fmt.red('✖ Cancelled.'));
    process.exit(0);
  }
}

// ── Step 2 — Technology selection ────────────────────────────

export async function promptTechnologies(allTechs) {
  const choices = [
    {
      name: '__auto__',
      message: fmt.bold('Auto-detect'),
      hint: 'scan my project directory  (recommended)',
    },
    ...allTechs.map((t) => ({
      name: t.id,
      message: t.name,
    })),
  ];

  try {
    const response = await enquirer.prompt({
      type: 'multiselect',
      name: 'technologies',
      message: `${fmt.bold('Step 2 / 3')}  ${fmt.dim('—')}  What technologies does your project use?`,
      choices,
      initial: ['__auto__'],
    });
    return response.technologies;
  } catch (e) {
    console.log(fmt.red('✖ Cancelled.'));
    process.exit(0);
  }
}

// ── Step 3 — Skills selection ────────────────────────────────

export async function promptSkills(suggestions) {
  if (!suggestions.length) {
    console.log(fmt.yellow('⚠  No skills found for the detected stack.'));
    return [];
  }

  const stack     = suggestions.filter((s) => s.category === 'stack');
  const universal = suggestions.filter((s) => s.category === 'universal');
  const rest      = suggestions.filter((s) => s.category !== 'stack' && s.category !== 'universal');
  const ordered   = [...stack, ...universal, ...rest];

  const choices = ordered.map((s) => ({
    name: s.skillName,
    message: s.alreadyInstalled
      ? `${fmt.dim(s.displayName || s.skillName)}  ${fmt.green('✓ installed')}`
      : fmt.bold(s.displayName || s.skillName),
    hint: s.alreadyInstalled
      ? undefined
      : s.category === 'universal'
        ? 'universal'
        : s.description || '',
  }));

  try {
    const response = await enquirer.prompt({
      type: 'multiselect',
      name: 'skills',
      message: `${fmt.bold('Step 3 / 3')}  ${fmt.dim('—')}  Select skills to install  ${fmt.dim(`(${suggestions.length} available)`)}`,
      choices,
      initial: ordered
        .filter((s) => !s.alreadyInstalled && s.category === 'stack')
        .map((s) => s.skillName),
    });

    return response.skills;
  } catch (e) {
    console.log(fmt.red('✖ Cancelled.'));
    process.exit(0);
  }
}

// ── Confirmation prompt ──────────────────────────────────────

export async function confirm(message) {
  try {
    const response = await enquirer.prompt({
      type: 'confirm',
      name: 'value',
      message: fmt.bold(message),
    });
    return response.value;
  } catch (e) {
    return false;
  }
}

// ── Text input ───────────────────────────────────────────────

export async function promptText(message, { initial = '' } = {}) {
  try {
    const response = await enquirer.prompt({
      type: 'input',
      name: 'value',
      message: fmt.bold(message),
      initial,
    });
    return response.value;
  } catch (e) {
    console.log(fmt.red('✖ Cancelled.'));
    process.exit(0);
  }
}

// ── Custom agent path ────────────────────────────────────────

export async function promptCustomAgentPath() {
  try {
    const response = await enquirer.prompt({
      type: 'input',
      name: 'value',
      message: fmt.bold('Enter the folder path to your custom agent config:'),
    });
    return response.value;
  } catch (e) {
    console.log(fmt.red('✖ Cancelled.'));
    process.exit(0);
  }
}

// ── Progress / Spinner ──────────────────────────────────────

const spinnerFrames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

export async function runWithProgress(skills, agentIds, installFn) {
  let installed = 0;
  let failed    = 0;
  const errors  = [];
  
  const createSpinner = () => {
    let spinnerInterval = null;
    let frameIndex = 0;
    let currentSpinner = null;
    
    return {
      start: (text) => {
        frameIndex = 0;
        const startTime = Date.now();
        currentSpinner = { text, startTime };

        spinnerInterval = setInterval(() => {
          const frame = spinnerFrames[frameIndex % spinnerFrames.length];
          process.stdout.write(`\r${fmt.cyan(frame)}  ${text}`);
          frameIndex++;
        }, 80);
      },
      stop: (text) => {
        clearInterval(spinnerInterval);
        const elapsed = currentSpinner
          ? ((Date.now() - currentSpinner.startTime) / 1000).toFixed(2)
          : '0.00';
        process.stdout.write(`\r${text} ${fmt.dim(`(${elapsed}s)`)}\n`);
        currentSpinner = null;
      },
    };
  };
  
  const spinner = createSpinner();

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
    console.log(fmt.red('✖ Some skills failed to install:'));
    for (const e of errors) {
      console.log(`  ${fmt.red(e.skill)}\n  ${fmt.dim(e.output.trim())}`);
    }
  }

  return { installed, failed, errors };
}

// ── Custom repository prompts ────────────────────────────────

export async function promptCustomRepoSource() {
  const choices = [
    {
      name: 'enter-url',
      message: fmt.bold('From a GitHub URL'),
      hint: 'https://github.com/owner/repo',
    },
    {
      name: 'saved',
      message: fmt.bold('From a saved repository'),
      hint: 'use a previously saved custom repo',
    },
  ];

  try {
    const response = await enquirer.prompt({
      type: 'select',
      name: 'source',
      message: fmt.bold('Where is your custom repository?'),
      choices,
    });
    return response.source;
  } catch (e) {
    console.log(fmt.red('✖ Cancelled.'));
    process.exit(0);
  }
}

export async function promptRepoUrl() {
  return promptText(
    'Enter the GitHub repository URL:',
    { initial: 'https://github.com/owner/repo' }
  );
}

export async function promptSaveCustomRepo(url) {
  const save = await confirm('Save this repository for future use?');

  if (save) {
    const id = await promptText(
      'Repo identifier (e.g., vercel-skills, my-org):',
      { initial: '' }
    );

    const name = await promptText(
      'Repo name (human-readable):',
      { initial: '' }
    );

    return {
      save: true,
      repo: {
        id: id.trim(),
        name: name.trim(),
        url: url.trim(),
        type: 'github',
      },
    };
  }

  return { save: false, repo: null };
}

export async function promptSelectSavedRepo(repos) {
  const choices = repos.map((repo) => ({
    name: repo.id,
    message: `${fmt.bold(repo.name)} ${fmt.dim(repo.url)}`,
    hint: repo.skillPath ? `skillPath: ${repo.skillPath}` : '',
  }));

  try {
    const response = await enquirer.prompt({
      type: 'select',
      name: 'repo',
      message: fmt.bold('Select a repository:'),
      choices,
    });
    return response.repo;
  } catch (e) {
    console.log(fmt.red('✖ Cancelled.'));
    process.exit(0);
  }
}

export async function promptSelectSkillsFromRepo(skills) {
  const choices = skills.map((skill) => ({
    name: skill.skillName,
    message: skill.skillName,
    hint: skill.description || '',
  }));

  try {
    const response = await enquirer.prompt({
      type: 'multiselect',
      name: 'skills',
      message: fmt.bold('Select skills to install:'),
      choices,
    });
    return response.skills;
  } catch (e) {
    console.log(fmt.red('✖ Cancelled.'));
    process.exit(0);
  }
}

export async function promptSkillPath() {
  return promptText(
    'Enter the path to skills in the repository (leave empty for root):',
    { initial: '' }
  );
}

// ── Messages ─────────────────────────────────────────────────

export function printDiscoveringSkills(repoName) {
  const spinner = clack.spinner();
  spinner.start(`🔍 Discovering skills in ${repoName}...`);
  return spinner;
}

export function printRepoInfo(repoName, skillsCount) {
  console.log(fmt.bold(fmt.cyan(`\n📦 Repository: ${repoName}`)));
  console.log(fmt.dim(`   Found ${skillsCount} skill${skillsCount !== 1 ? 's' : ''}`));
}

// ── Spinner and Logging (clack compatibility) ──────────────

export const clack = {
  spinner: () => {
    let spinnerInterval = null;
    let frameIndex = 0;
    let currentSpinner = null;
    
    return {
      start: (text) => {
        frameIndex = 0;
        const startTime = Date.now();
        currentSpinner = { text, startTime };

        spinnerInterval = setInterval(() => {
          const frame = spinnerFrames[frameIndex % spinnerFrames.length];
          process.stdout.write(`\r${fmt.cyan(frame)}  ${text}`);
          frameIndex++;
        }, 80);
      },
      stop: (text) => {
        clearInterval(spinnerInterval);
        const elapsed = currentSpinner
          ? ((Date.now() - currentSpinner.startTime) / 1000).toFixed(2)
          : '0.00';
        process.stdout.write(`\r${fmt.green('✓')}  ${text} ${fmt.dim(`(${elapsed}s)`)}\n`);
        currentSpinner = null;
      },
    };
  },
  log: {
    info: (text) => console.log(fmt.cyan('ℹ  ' + text)),
    success: (text) => console.log(fmt.green('✓  ' + text)),
    warn: (text) => console.log(fmt.yellow('⚠  ' + text)),
    error: (text) => console.log(fmt.red('✖  ' + text)),
  },
};
