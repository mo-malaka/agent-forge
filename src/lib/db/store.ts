import fs from "fs";
import path from "path";

import type { AgentRow, NewAgentRow } from "@/lib/db/schema";

const DATA_DIR = path.join(process.cwd(), "data");
const STORE_PATH = path.join(DATA_DIR, "agents.json");

interface AgentStoreFile {
  agents: AgentRow[];
}

function readStore(): AgentStoreFile {
  fs.mkdirSync(DATA_DIR, { recursive: true });

  if (!fs.existsSync(STORE_PATH)) {
    const empty: AgentStoreFile = { agents: [] };
    fs.writeFileSync(STORE_PATH, JSON.stringify(empty, null, 2));
    return empty;
  }

  const raw = fs.readFileSync(STORE_PATH, "utf8");
  const parsed = JSON.parse(raw) as AgentStoreFile;

  return {
    agents: Array.isArray(parsed.agents) ? parsed.agents : [],
  };
}

function writeStore(store: AgentStoreFile) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(STORE_PATH, JSON.stringify(store, null, 2));
}

export function insertAgent(row: NewAgentRow): AgentRow {
  const store = readStore();
  const agent = row as AgentRow;
  store.agents.unshift(agent);
  writeStore(store);
  return agent;
}

export function findAgentById(id: string): AgentRow | null {
  const store = readStore();
  return store.agents.find((agent) => agent.id === id) ?? null;
}

export function findAgents(filters: {
  status?: string;
  archetype?: string;
  page: number;
  limit: number;
}): { rows: AgentRow[]; total: number } {
  const store = readStore();
  let rows = [...store.agents];

  if (filters.status) {
    rows = rows.filter((agent) => agent.status === filters.status);
  }

  if (filters.archetype) {
    rows = rows.filter((agent) => agent.archetype === filters.archetype);
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
