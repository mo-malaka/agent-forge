import { nanoid } from "nanoid";

import type { AgentRow } from "@/lib/db/schema";
import {
  findAgentById,
  findAgents,
  insertAgent,
  insertAgents,
  removeAgent,
  updateAgent as updateAgentRow,
} from "@/lib/db/store";
import {
  assertProviderMatch,
  attributeForDirection,
  findAgentForProvisioning,
  getEntitlementsForAttribute,
  ProvisioningError,
  setEntitlementsForAttribute,
  type EntitlementAttributeName,
  type ProvisioningAccountRef,
} from "@/lib/agents/provisioning";
import { generateRandomAgentBatch } from "@/lib/agents/bulk-generator";
import { pickInboundCallers } from "@/lib/agents/access";
import type { BulkCreateAgentsPayload } from "@/lib/validation/agent.schema";
import { mergeDeploymentConfig } from "@/lib/providers/deployment";
import type { DeploymentProvider } from "@/lib/providers/profiles";
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

async function listAllAgentsForProvider(
  deploymentProvider: DeploymentProvider,
): Promise<AgentRow[]> {
  const { rows } = await findAgents({
    page: 1,
    limit: 1000,
    deploymentProvider,
  });
  return rows;
}

async function resolveProvisioningAgent(
  ref: ProvisioningAccountRef,
  deploymentProvider: DeploymentProvider,
  baseUrl: string,
): Promise<AgentRow> {
  const agents = await listAllAgentsForProvider(deploymentProvider);
  const agent = findAgentForProvisioning(agents, ref, baseUrl);

  if (!agent) {
    throw new ProvisioningError("Agent account not found", 404);
  }

  assertProviderMatch(agent, deploymentProvider);
  return agent;
}

export async function addAgentEntitlement(input: {
  ref: ProvisioningAccountRef;
  deploymentProvider: DeploymentProvider;
  attribute: EntitlementAttributeName;
  entitlement: string;
  baseUrl: string;
}): Promise<AgentRow> {
  const agent = await resolveProvisioningAgent(
    input.ref,
    input.deploymentProvider,
    input.baseUrl,
  );
  const current = getEntitlementsForAttribute(agent, input.attribute);

  if (current.includes(input.entitlement)) {
    return agent;
  }

  const timestamp = nowIso();
  const patch = setEntitlementsForAttribute(agent, input.attribute, [
    ...current,
    input.entitlement,
  ]);

  const updated = updateAgentRow(agent.id, {
    ...patch,
    updatedAt: timestamp,
    lastActiveAt: timestamp,
  });

  if (!updated) {
    throw new ProvisioningError("Failed to update agent", 500);
  }

  return updated;
}

export async function removeAgentEntitlement(input: {
  ref: ProvisioningAccountRef;
  deploymentProvider: DeploymentProvider;
  attribute: EntitlementAttributeName;
  entitlement: string;
  baseUrl: string;
}): Promise<AgentRow> {
  const agent = await resolveProvisioningAgent(
    input.ref,
    input.deploymentProvider,
    input.baseUrl,
  );
  const current = getEntitlementsForAttribute(agent, input.attribute);
  const next = current.filter((value) => value !== input.entitlement);

  if (next.length === current.length) {
    throw new ProvisioningError("Entitlement not found on agent", 404);
  }

  const timestamp = nowIso();
  const patch = setEntitlementsForAttribute(agent, input.attribute, next);
  const updated = updateAgentRow(agent.id, {
    ...patch,
    updatedAt: timestamp,
    lastActiveAt: timestamp,
  });

  if (!updated) {
    throw new ProvisioningError("Failed to update agent", 500);
  }

  return updated;
}

export async function setAgentStatus(input: {
  ref: ProvisioningAccountRef;
  deploymentProvider: DeploymentProvider;
  status: "active" | "inactive";
  baseUrl: string;
}): Promise<AgentRow> {
  const agent = await resolveProvisioningAgent(
    input.ref,
    input.deploymentProvider,
    input.baseUrl,
  );
  const timestamp = nowIso();
  const updated = updateAgentRow(agent.id, {
    status: input.status,
    updatedAt: timestamp,
    lastActiveAt: timestamp,
  });

  if (!updated) {
    throw new ProvisioningError("Failed to update agent", 500);
  }

  return updated;
}

export async function getAgentForProvisioning(input: {
  ref: ProvisioningAccountRef;
  deploymentProvider: DeploymentProvider;
  baseUrl: string;
}): Promise<AgentRow> {
  return resolveProvisioningAgent(
    input.ref,
    input.deploymentProvider,
    input.baseUrl,
  );
}

export { ProvisioningError, attributeForDirection };
