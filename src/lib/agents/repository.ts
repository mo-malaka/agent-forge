import { nanoid } from "nanoid";

import type { AgentRow } from "@/lib/db/schema";
import {
  findAgentById,
  findAgents,
  insertAgent,
  removeAgent,
} from "@/lib/db/store";
import { mergeDeploymentConfig } from "@/lib/providers/deployment";
import type { CreateAgentInput, ListAgentsQuery } from "@/types/agent";

function nowIso(): string {
  return new Date().toISOString();
}

export async function createAgent(input: CreateAgentInput): Promise<AgentRow> {
  const timestamp = nowIso();
  const deploymentConfig = mergeDeploymentConfig(
    input.deployment_provider,
    (input.deployment_config ?? {}) as Record<string, string>,
  );

  return insertAgent({
    id: `agt_${nanoid(12)}`,
    name: input.name,
    archetype: input.archetype,
    deploymentProvider: input.deployment_provider,
    deploymentConfig: JSON.stringify(deploymentConfig),
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
    deploymentProvider: query.deployment_provider,
    page: query.page,
    limit: query.limit,
  });
}

export async function deleteAgent(id: string): Promise<boolean> {
  return removeAgent(id);
}
