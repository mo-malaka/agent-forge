import { nanoid } from "nanoid";

import type { AgentRow } from "@/lib/db/schema";
import {
  findAgentById,
  findAgents,
  insertAgent,
  removeAgent,
} from "@/lib/db/store";
import type { CreateAgentInput, ListAgentsQuery } from "@/types/agent";

function nowIso(): string {
  return new Date().toISOString();
}

export async function createAgent(input: CreateAgentInput): Promise<AgentRow> {
  const timestamp = nowIso();

  return insertAgent({
    id: `agt_${nanoid(12)}`,
    name: input.name,
    archetype: input.archetype,
    status: "active",
    metadata: JSON.stringify(input.metadata),
    entitlements: JSON.stringify(input.entitlements),
    createdAt: timestamp,
    updatedAt: timestamp,
    lastActiveAt: timestamp,
  });
}

export async function getAgentById(id: string): Promise<AgentRow | null> {
  return findAgentById(id);
}

export async function listAgents(query: ListAgentsQuery): Promise<{
  rows: AgentRow[];
  total: number;
}> {
  return findAgents({
    status: query.status,
    archetype: query.archetype,
    page: query.page,
    limit: query.limit,
  });
}

export async function deleteAgent(id: string): Promise<boolean> {
  return removeAgent(id);
}
