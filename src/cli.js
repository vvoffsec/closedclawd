#!/usr/bin/env node
// src/cli.js

import { runInit } from './init.js';
import { runCreate } from './create.js';

export function parseCommand(args) {
  const command = args[0] || 'help';
  const flags = {};

  for (let i = 1; i < args.length; i++) {
    if (args[i] === '--path' && args[i + 1]) {
      flags.path = args[i + 1];
      i++;
    }
    if (args[i] === '--spec' && args[i + 1]) {
      flags.spec = args[i + 1];
      i++;
    }
    if (args[i] === '--force') {
      flags.force = true;
    }
  }

  const valid = ['init', 'create', 'help', 'version'];
  if (!valid.includes(command)) {
    return { command: 'help', flags };
  }

  return { command, flags };
}

function printHelp() {
  console.log(`
closedclawd - Autonomous project orchestrator built on RuFlo

Commands:
  init      Inject ClosedClawd orchestration into current project
  create    Interactive brainstorm → scaffold → autonomous build
  help      Show this help message
  version   Show version

Flags:
  --path <dir>    Target directory for create (default: sibling directory)
  --spec <file>   Spec file to drive autonomous scaffold + build
  --force         Overwrite existing config without merging
`);
}

async function main() {
  const args = process.argv.slice(2);
  const { command, flags } = parseCommand(args);

  switch (command) {
    case 'init':
      await runInit(process.cwd(), flags);
      break;
    case 'create':
      await runCreate(flags);
      break;
    case 'version':
      console.log('closedclawd v0.1.0');
      break;
    case 'help':
    default:
      printHelp();
  }
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
