import { nanoid } from "nanoid";

import type { AgentRow } from "@/lib/db/schema";
import {
  findAgentById,
  findAgents,
  insertAgent,
  insertAgents,
  removeAgent,
} from "@/lib/db/store";
import { generateRandomAgentBatch } from "@/lib/agents/bulk-generator";
import { pickInboundCallers } from "@/lib/agents/access";
import type { BulkCreateAgentsPayload } from "@/lib/validation/agent.schema";
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
    inboundAccess: JSON.stringify(input.inbound_access ?? []),
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

export async function createAgentsBulk(
  input: BulkCreateAgentsPayload,
): Promise<AgentRow[]> {
  const timestamp = nowIso();
  const payloads = generateRandomAgentBatch(input.deployment_provider, input.count);

  const rows = payloads.map((payload) => {
    const deploymentConfig = mergeDeploymentConfig(
      payload.deployment_provider,
      (payload.deployment_config ?? {}) as Record<string, string>,
    );

    return {
      id: `agt_${nanoid(12)}`,
      name: payload.name,
      archetype: payload.archetype,
      deploymentProvider: payload.deployment_provider,
      deploymentConfig: JSON.stringify(deploymentConfig),
      status: "active" as const,
      metadata: JSON.stringify(payload.metadata),
      entitlements: JSON.stringify(payload.entitlements),
      inboundAccess: JSON.stringify(payload.inbound_access ?? []),
      createdAt: timestamp,
      updatedAt: timestamp,
      lastActiveAt: timestamp,
    };
  });

  return insertAgents(rows);
}

export async function deleteAgent(id: string): Promise<boolean> {
  return removeAgent(id);
}
