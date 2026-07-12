import fs from "fs";
import path from "path";

import type { AgentRow, NewAgentRow } from "@/lib/db/schema";
import { agentNeedsEnrichment, enrichAgentRow } from "@/lib/agents/enrichment-builder";
import { buildHeroSeedAgents, HERO_AGENT_IDS } from "@/lib/db/hero-seed-data";
import { normalizeAgentRow } from "@/lib/providers/deployment";

function resolveDataDir(): string {
  if (process.env.AGENT_STORE_DIR?.trim()) {
    return process.env.AGENT_STORE_DIR.trim();
  }

  if (process.env.AWS_EXECUTION_ENV || process.env.AWS_REGION) {
    return path.join("/tmp", "agent-forge-data");
  }

  return path.join(process.cwd(), "data");
}

const DATA_DIR = resolveDataDir();
const STORE_PATH = path.join(DATA_DIR, "agents.json");

interface AgentStoreFile {
  agents: AgentRow[];
}

let cachedStore: AgentStoreFile | null = null;

function heroNeedsRefresh(agent: AgentRow | undefined): boolean {
  if (!agent) {
    return true;
  }

  return (
    !agent.agentDetails ||
    agent.agentDetails === "{}" ||
    !agent.extendedEntitlements ||
    agent.extendedEntitlements === "[]" ||
    !agent.linkedAccounts ||
    agent.linkedAccounts === "[]"
  );
}

function ensureHeroAgents(store: AgentStoreFile): AgentStoreFile {
  const heroes = buildHeroSeedAgents().map((row) => normalizeAgentRow(row));
  const agentsById = new Map(store.agents.map((agent) => [agent.id, agent]));
  let changed = false;

  for (const hero of heroes) {
    const existing = agentsById.get(hero.id);
    if (!existing || heroNeedsRefresh(existing)) {
      agentsById.set(hero.id, hero);
      changed = true;
    }
  }

  if (!changed) {
    return store;
  }

  const nonHero = store.agents.filter((agent) => !HERO_AGENT_IDS.includes(agent.id));
  const refreshed = { agents: [...heroes, ...nonHero] };
  writeStore(refreshed);
  return refreshed;
}

function seedIfEmpty(store: AgentStoreFile): AgentStoreFile {
  if (store.agents.length > 0) {
    return store;
  }

  const seeded: AgentStoreFile = {
    agents: buildHeroSeedAgents().map((agent) => normalizeAgentRow(agent)),
  };

  writeStore(seeded);
  return seeded;
}

function ensureBulkAgentsEnriched(store: AgentStoreFile): AgentStoreFile {
  let changed = false;
  const agents = store.agents.map((agent) => {
    if (HERO_AGENT_IDS.includes(agent.id) || !agentNeedsEnrichment(agent)) {
      return agent;
    }

    changed = true;
    return normalizeAgentRow(enrichAgentRow(agent));
  });

  if (!changed) {
    return store;
  }

  const refreshed = { agents };
  writeStore(refreshed);
  return refreshed;
}

function writeStore(store: AgentStoreFile) {
  cachedStore = store;

  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(STORE_PATH, JSON.stringify(store, null, 2));
  } catch (error) {
    console.warn(
      `Failed to persist agent store at ${STORE_PATH}; using in-memory cache for this instance.`,
      error,
    );
  }
}

function loadStoreFromDisk(): AgentStoreFile {
  fs.mkdirSync(DATA_DIR, { recursive: true });

  if (!fs.existsSync(STORE_PATH)) {
    return seedIfEmpty({ agents: [] });
  }

  const raw = fs.readFileSync(STORE_PATH, "utf8");
  const parsed = JSON.parse(raw) as AgentStoreFile;

  const store: AgentStoreFile = {
    agents: Array.isArray(parsed.agents)
      ? parsed.agents.map((agent) =>
          normalizeAgentRow({
            ...agent,
            deploymentProvider: agent.deploymentProvider ?? "aws_bedrock",
            deploymentConfig: agent.deploymentConfig ?? "{}",
            inboundAccess: agent.inboundAccess ?? "[]",
            agentDetails: agent.agentDetails ?? "{}",
            linkedAccounts: agent.linkedAccounts ?? "[]",
            extendedEntitlements: agent.extendedEntitlements ?? "[]",
          } as AgentRow),
        )
      : [],
  };

  return ensureBulkAgentsEnriched(ensureHeroAgents(seedIfEmpty(store)));
}

function readStore(): AgentStoreFile {
  if (cachedStore) {
    return cachedStore;
  }

  const store = loadStoreFromDisk();
  cachedStore = store;
  return store;
}

export function insertAgent(row: NewAgentRow): AgentRow {
  const store = readStore();
  const agent = normalizeAgentRow(row);
  store.agents.unshift(agent);
  writeStore(store);
  return agent;
}

export function insertAgents(rows: NewAgentRow[]): AgentRow[] {
  const store = readStore();
  const agents = rows.map((row) => normalizeAgentRow(row));
  store.agents.unshift(...agents);
  writeStore(store);
  return agents;
}

export function findAgentById(id: string): AgentRow | null {
  const store = readStore();
  const agent = store.agents.find((item) => item.id === id);
  return agent ? normalizeAgentRow(agent) : null;
}

export function findAgents(filters: {
  status?: string;
  archetype?: string;
  deploymentProvider?: string;
  page: number;
  limit: number;
}): { rows: AgentRow[]; total: number } {
  const store = readStore();
  let rows = [...store.agents].map(normalizeAgentRow);

  if (filters.status) {
    rows = rows.filter((agent) => agent.status === filters.status);
  }

  if (filters.archetype) {
    rows = rows.filter((agent) => agent.archetype === filters.archetype);
  }

  if (filters.deploymentProvider) {
    rows = rows.filter(
      (agent) => agent.deploymentProvider === filters.deploymentProvider,
    );
  }

  const total = rows.length;
  const offset = (filters.page - 1) * filters.limit;

  return {
    rows: rows.slice(offset, offset + filters.limit),
    total,
  };
}

export function removeAgent(id: string): boolean {
  const store = readStore();
  const nextAgents = store.agents.filter((agent) => agent.id !== id);

  if (nextAgents.length === store.agents.length) {
    return false;
  }

  writeStore({ agents: nextAgents });
  return true;
}

export function upsertAgent(row: NewAgentRow): AgentRow {
  const store = readStore();
  const agent = normalizeAgentRow(row);
  const now = new Date().toISOString();
  const index = store.agents.findIndex((item) => item.id === row.id);

  if (index === -1) {
    const created = normalizeAgentRow({
      ...agent,
      createdAt: row.createdAt ?? now,
      updatedAt: now,
      lastActiveAt: now,
    });
    store.agents.unshift(created);
    writeStore(store);
    return created;
  }

  const updated = normalizeAgentRow({
    ...store.agents[index]!,
    ...agent,
    createdAt: store.agents[index]!.createdAt,
    updatedAt: now,
    lastActiveAt: now,
  });
  store.agents[index] = updated;
  writeStore(store);
  return updated;
}

export function resetStoreToSeed(): AgentRow[] {
  const agents = buildHeroSeedAgents().map((row) => normalizeAgentRow(row));
  writeStore({ agents });
  return agents;
}

export function removeNonSeedAgents(): string[] {
  const store = readStore();
  const removed = store.agents
    .filter((agent) => !HERO_AGENT_IDS.includes(agent.id))
    .map((agent) => agent.id);
  store.agents = store.agents.filter((agent) => HERO_AGENT_IDS.includes(agent.id));
  writeStore(store);
  return removed;
}

export function countAgents(filters?: {
  status?: string;
  deploymentProvider?: string;
}): number {
  const store = readStore();
  let rows = store.agents;

  if (filters?.status) {
    rows = rows.filter((agent) => agent.status === filters.status);
  }

  if (filters?.deploymentProvider) {
    rows = rows.filter(
      (agent) => agent.deploymentProvider === filters.deploymentProvider,
    );
  }

  return rows.length;
}

export function updateAgent(
  id: string,
  patch: Partial<
    Pick<
      AgentRow,
      | "status"
      | "entitlements"
      | "inboundAccess"
      | "metadata"
      | "updatedAt"
      | "lastActiveAt"
    >
  >,
): AgentRow | null {
  const store = readStore();
  const index = store.agents.findIndex((agent) => agent.id === id);

  if (index === -1) {
    return null;
  }

  const updated = normalizeAgentRow({
    ...store.agents[index]!,
    ...patch,
  });

  store.agents[index] = updated;
  writeStore(store);
  return updated;
}
