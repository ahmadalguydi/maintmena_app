import { spawnSync } from 'node:child_process';
import process from 'node:process';
import { syncState } from './ruflo-sync-state.mjs';

const args = process.argv.slice(2);

function shouldSyncBefore(argv) {
  const [command, subcommand] = argv;
  return (
    (command === 'swarm' && subcommand === 'status') ||
    (command === 'agent' && (subcommand === 'list' || subcommand === 'metrics' || subcommand === 'health')) ||
    (command === 'task' && (subcommand === 'list' || subcommand === 'status'))
  );
}

function shouldSyncAfter(argv) {
  const [command, subcommand] = argv;
  return (
    (command === 'agent' && ['spawn', 'stop'].includes(subcommand)) ||
    (command === 'task' && ['create', 'assign', 'cancel', 'retry'].includes(subcommand)) ||
    (command === 'swarm' && ['init', 'start', 'stop', 'scale', 'coordinate'].includes(subcommand))
  );
}

if (shouldSyncBefore(args)) {
  syncState({ verbose: false });
}

const result = spawnSync('npx', ['-y', '@claude-flow/cli@latest', ...args], {
  stdio: 'inherit',
  cwd: process.cwd(),
  env: process.env,
  shell: process.platform === 'win32',
});

if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}

if ((result.status ?? 1) === 0 && shouldSyncAfter(args)) {
  syncState({ verbose: false });
}

process.exit(result.status ?? 1);
