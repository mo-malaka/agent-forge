import fs from "fs";
import path from "path";

import type { AgentRow, NewAgentRow } from "@/lib/db/schema";
import { buildSeedAgents } from "@/lib/db/seed";
import { normalizeAgentRow } from "@/lib/providers/deployment";

const DATA_DIR = path.join(process.cwd(), "data");
const STORE_PATH = path.join(DATA_DIR, "agents.json");

interface AgentStoreFile {
  agents: AgentRow[];
}

function seedIfEmpty(store: AgentStoreFile): AgentStoreFile {
  if (store.agents.length > 0) {
    return store;
  }

  const seeded: AgentStoreFile = {
    agents: buildSeedAgents().map((agent) => normalizeAgentRow(agent)),
  };

  writeStore(seeded);
  return seeded;
}

function readStore(): AgentStoreFile {
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
          } as AgentRow),
        )
      : [],
  };

  return seedIfEmpty(store);
}

function writeStore(store: AgentStoreFile) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(STORE_PATH, JSON.stringify(store, null, 2));
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
