import { resolve } from 'node:path';

import { AGENT_FLAGS } from './agents.mjs';

export function parseArgs(argv) {
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
