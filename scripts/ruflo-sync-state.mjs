import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const cwd = process.cwd();
const DEFAULT_SWARM = {
  topology: 'hierarchical',
  maxAgents: 8,
  strategy: 'specialized',
};

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function writeJson(filePath, value) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function listJsonFiles(dirPath) {
  if (!fs.existsSync(dirPath)) {
    return [];
  }

  return fs.readdirSync(dirPath).filter((file) => file.endsWith('.json'));
}

function cleanupJsonDir(dirPath, keepIds) {
  ensureDir(dirPath);

  for (const file of listJsonFiles(dirPath)) {
    const id = file.replace(/\.json$/, '');
    if (!keepIds.has(id)) {
      fs.rmSync(path.join(dirPath, file), { force: true });
    }
  }
}

function normalizeTaskStatus(status) {
  switch (status) {
    case 'done':
    case 'completed':
      return 'completed';
    case 'running':
    case 'active':
    case 'in_progress':
      return 'in_progress';
    case 'cancelled':
    case 'failed':
    case 'not_found':
      return null;
    default:
      return 'pending';
  }
}

function loadRuntimeState() {
  const config =
    readJson(path.join(cwd, '.claude-flow', 'config.json')) ??
    readJson(path.join(cwd, 'claude-flow.config.json'));
  const legacyState = readJson(path.join(cwd, '.swarm', 'state.json'));
  const runtimeState = readJson(path.join(cwd, '.claude-flow', 'swarm', 'swarm-state.json'));
  const swarmId =
    legacyState?.id ??
    Object.keys(runtimeState?.swarms ?? {})[0] ??
    `swarm-${Date.now()}`;

  return { config, legacyState, runtimeState, swarmId };
}

export function syncState({ verbose = true } = {}) {
  const { config, legacyState, runtimeState, swarmId } = loadRuntimeState();
  const swarmConfig = {
    topology:
      config?.swarm?.topology ??
      legacyState?.topology ??
      runtimeState?.swarms?.[swarmId]?.topology ??
      DEFAULT_SWARM.topology,
    maxAgents:
      config?.swarm?.maxAgents ??
      legacyState?.maxAgents ??
      runtimeState?.swarms?.[swarmId]?.maxAgents ??
      DEFAULT_SWARM.maxAgents,
    strategy:
      config?.swarm?.coordinationStrategy ??
      legacyState?.strategy ??
      runtimeState?.swarms?.[swarmId]?.config?.strategy ??
      DEFAULT_SWARM.strategy,
    autoScale:
      config?.swarm?.autoScale ??
      runtimeState?.swarms?.[swarmId]?.config?.autoScaling ??
      false,
  };

  const agentsStore =
    readJson(path.join(cwd, '.claude-flow', 'agents', 'store.json')) ?? { agents: {} };
  const tasksStore =
    readJson(path.join(cwd, '.claude-flow', 'tasks', 'store.json')) ?? { tasks: {} };

  const rawAgents = Object.values(agentsStore.agents ?? {}).filter(
    (agent) => agent && agent.status !== 'terminated',
  );

  const rawTasks = Object.values(tasksStore.tasks ?? {});
  const currentTaskByAgent = new Map();
  const mirroredTasks = [];

  for (const task of rawTasks) {
    const normalizedStatus = normalizeTaskStatus(task.status);
    if (!normalizedStatus) {
      continue;
    }

    const mirroredTask = {
      id: task.taskId,
      taskId: task.taskId,
      type: task.type,
      description: task.description,
      status: normalizedStatus,
      progress: task.progress ?? 0,
      assignedTo: task.assignedTo ?? [],
      priority: task.priority ?? 'normal',
      createdAt: task.createdAt,
      startedAt: task.startedAt,
      completedAt: task.completedAt,
    };

    mirroredTasks.push(mirroredTask);

    if (normalizedStatus !== 'completed') {
      for (const agentId of mirroredTask.assignedTo) {
        currentTaskByAgent.set(agentId, mirroredTask.id);
      }
    }
  }

  const mirroredAgents = rawAgents.map((agent) => {
    const currentTask = currentTaskByAgent.get(agent.agentId) ?? null;
    const status =
      currentTask || agent.status === 'active' || agent.status === 'running'
        ? 'active'
        : 'idle';

    return {
      id: agent.agentId,
      agentId: agent.agentId,
      type: agent.agentType,
      agentType: agent.agentType,
      status,
      health: agent.health ?? 1,
      taskCount: agent.taskCount ?? 0,
      tasksCompleted: agent.taskCount ?? 0,
      currentTask,
      createdAt: agent.createdAt,
      model: agent.model ?? null,
    };
  });

  const agentsDir = path.join(cwd, '.swarm', 'agents');
  const tasksDir = path.join(cwd, '.swarm', 'tasks');
  const keepAgentIds = new Set(mirroredAgents.map((agent) => agent.id));
  const keepTaskIds = new Set(mirroredTasks.map((task) => task.id));

  cleanupJsonDir(agentsDir, keepAgentIds);
  cleanupJsonDir(tasksDir, keepTaskIds);

  for (const agent of mirroredAgents) {
    writeJson(path.join(agentsDir, `${agent.id}.json`), agent);
  }

  for (const task of mirroredTasks) {
    writeJson(path.join(tasksDir, `${task.id}.json`), task);
  }

  const activeAgents = mirroredAgents.filter((agent) => agent.status === 'active').length;
  const pendingTasks = mirroredTasks.filter((task) => task.status === 'pending').length;
  const inProgressTasks = mirroredTasks.filter((task) => task.status === 'in_progress').length;
  const completedTasks = mirroredTasks.filter((task) => task.status === 'completed').length;
  const swarmStatus =
    activeAgents > 0 || inProgressTasks > 0 || pendingTasks > 0 ? 'running' : 'ready';
  const now = new Date().toISOString();
  const initializedAt =
    legacyState?.initializedAt ??
    runtimeState?.swarms?.[swarmId]?.createdAt ??
    now;

  writeJson(path.join(cwd, '.claude-flow', 'agents.json'), {
    agents: Object.fromEntries(mirroredAgents.map((agent) => [agent.id, agent])),
    version: '3.0.0',
  });

  writeJson(path.join(cwd, '.claude-flow', 'swarm', 'swarm-state.json'), {
    swarms: {
      [swarmId]: {
        swarmId,
        topology: swarmConfig.topology,
        maxAgents: swarmConfig.maxAgents,
        status: swarmStatus,
        agents: mirroredAgents,
        tasks: mirroredTasks,
        config: {
          topology: swarmConfig.topology,
          maxAgents: swarmConfig.maxAgents,
          strategy: swarmConfig.strategy,
          communicationProtocol: 'message-bus',
          autoScaling: swarmConfig.autoScale,
          consensusMechanism: 'raft',
        },
        createdAt: runtimeState?.swarms?.[swarmId]?.createdAt ?? initializedAt,
        updatedAt: now,
      },
    },
    version: runtimeState?.version ?? '3.0.0',
  });

  writeJson(path.join(cwd, '.swarm', 'state.json'), {
    id: swarmId,
    topology: swarmConfig.topology,
    maxAgents: swarmConfig.maxAgents,
    strategy: swarmConfig.strategy,
    initializedAt,
    status: swarmStatus,
  });

  writeJson(path.join(cwd, '.swarm', 'swarm-activity.json'), {
    timestamp: now,
    totalAgents: mirroredAgents.length,
    activeAgents,
    coordinationActive: swarmStatus === 'running',
  });

  const summary = {
    swarmId,
    topology: swarmConfig.topology,
    maxAgents: swarmConfig.maxAgents,
    status: swarmStatus,
    agents: {
      total: mirroredAgents.length,
      active: activeAgents,
      idle: Math.max(0, mirroredAgents.length - activeAgents),
    },
    tasks: {
      total: mirroredTasks.length,
      completed: completedTasks,
      inProgress: inProgressTasks,
      pending: pendingTasks,
    },
  };

  if (verbose) {
    console.log(JSON.stringify(summary, null, 2));
  }

  return summary;
}

function main() {
  const args = new Set(process.argv.slice(2));
  syncState({ verbose: !args.has('--quiet') });
}

const directRun =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (directRun) {
  main();
}
