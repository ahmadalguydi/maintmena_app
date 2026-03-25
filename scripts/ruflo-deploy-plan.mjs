import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { syncState } from './ruflo-sync-state.mjs';

const DEPLOYMENT_PLAN = [
  { type: 'coordinator', count: 1, label: 'Coordinator' },
  { type: 'architect', count: 1, label: 'Architect' },
  { type: 'coder', count: 3, label: 'Coder' },
  { type: 'tester', count: 2, label: 'Tester' },
  { type: 'reviewer', count: 1, label: 'Reviewer' },
];

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
}

function currentAgents() {
  const store =
    readJson(path.join(process.cwd(), '.claude-flow', 'agents', 'store.json')) ?? { agents: {} };
  return Object.values(store.agents ?? {})
    .filter((agent) => agent && agent.status !== 'terminated')
    .sort((left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime());
}

function currentCounts() {
  const counts = new Map();

  for (const agent of currentAgents()) {
    counts.set(agent.agentType, (counts.get(agent.agentType) ?? 0) + 1);
  }

  return counts;
}

function runWrapper(args) {
  const result = spawnSync(process.execPath, [path.join('scripts', 'ruflo-wrapper.mjs'), ...args], {
    stdio: 'inherit',
    cwd: process.cwd(),
    env: process.env,
  });

  if ((result.status ?? 1) !== 0) {
    process.exit(result.status ?? 1);
  }
}

runWrapper([
  'swarm',
  'init',
  '--topology',
  'hierarchical',
  '--max-agents',
  '8',
  '--strategy',
  'specialized',
]);

const desiredTypes = new Set(DEPLOYMENT_PLAN.map((role) => role.type));

for (const agent of currentAgents()) {
  if (!desiredTypes.has(agent.agentType)) {
    runWrapper(['agent', 'stop', agent.agentId, '--force']);
  }
}

for (const role of DEPLOYMENT_PLAN) {
  const sameTypeAgents = currentAgents().filter((agent) => agent.agentType === role.type);
  if (sameTypeAgents.length > role.count) {
    for (const agent of sameTypeAgents.slice(role.count)) {
      runWrapper(['agent', 'stop', agent.agentId, '--force']);
    }
  }
}

const counts = currentCounts();

for (const role of DEPLOYMENT_PLAN) {
  const existing = counts.get(role.type) ?? 0;
  const missing = Math.max(0, role.count - existing);

  for (let index = 0; index < missing; index += 1) {
    runWrapper([
      'agent',
      'spawn',
      '--type',
      role.type,
      '--name',
      `swarm-${role.type}-${existing + index + 1}`,
    ]);
  }
}

const summary = syncState({ verbose: false });
console.log(JSON.stringify(summary, null, 2));
