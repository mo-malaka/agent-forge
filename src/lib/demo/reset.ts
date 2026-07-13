import {
  getInboundAccess,
  getOutboundAccess,
} from "@/lib/agents/access";
import {
  getDemoSeedInboundForAgent,
  getDemoSeedOutboundForAgent,
  getDemoGovernRequiredForAgent,
} from "@/lib/demo/govern-profiles";
import {
  DEMO_RESET_AGENT_ID,
  getSeedAgentRow,
  SEED_AGENT_IDS,
} from "@/lib/db/seed";
import {
  findAgentById,
  removeNonSeedAgents,
  resetStoreToSeed,
  upsertAgent,
} from "@/lib/db/store";

export type DemoResetScope = "demo-agent" | "full-store";

export interface DemoResetOptions {
  scope?: DemoResetScope;
  agentId?: string;
  removeBulkAgents?: boolean;
}

export interface DemoResetResult {
  reset_at: string;
  scope: DemoResetScope;
  agent: {
    id: string;
    name: string;
    status: string;
    entitlements: string[];
    inbound_access: string[];
  } | null;
  removed_agent_ids: string[];
  seed_agent_count: number;
}

export function resetDemoData(options: DemoResetOptions = {}): DemoResetResult {
  const scope = options.scope ?? "demo-agent";
  const agentId = options.agentId ?? DEMO_RESET_AGENT_ID;
  const removeBulkAgents = options.removeBulkAgents ?? false;

  let removedAgentIds: string[] = [];

  if (removeBulkAgents) {
    removedAgentIds = removeNonSeedAgents();
  }

  if (scope === "full-store") {
    const agents = resetStoreToSeed();
    const demoAgent = agents.find((agent) => agent.id === agentId) ?? null;
    return {
      reset_at: new Date().toISOString(),
      scope,
      agent: demoAgent
        ? {
            id: demoAgent.id,
            name: demoAgent.name,
            status: demoAgent.status,
            entitlements: getOutboundAccess(demoAgent),
            inbound_access: getInboundAccess(demoAgent),
          }
        : null,
      removed_agent_ids: removedAgentIds,
      seed_agent_count: agents.length,
    };
  }

  const seedRow = getSeedAgentRow(agentId);
  if (!seedRow) {
    throw new Error(`No seed definition found for agent ${agentId}`);
  }

  const restored = upsertAgent({
    ...seedRow,
    status: "active",
    updatedAt: new Date().toISOString(),
    lastActiveAt: new Date().toISOString(),
  });

  if (removeBulkAgents) {
    removedAgentIds = removeNonSeedAgents();
  }

  return {
    reset_at: new Date().toISOString(),
    scope,
    agent: {
      id: restored.id,
      name: restored.name,
      status: restored.status,
      entitlements: getOutboundAccess(restored),
      inbound_access: getInboundAccess(restored),
    },
    removed_agent_ids: removedAgentIds,
    seed_agent_count: SEED_AGENT_IDS.length,
  };
}

export function getDemoGovernExpectedEntitlements(agentId?: string): string[] {
  return getDemoSeedOutboundForAgent(agentId ?? DEMO_RESET_AGENT_ID);
}

export function getDemoGovernRequiredEntitlements(
  agentId?: string,
  allowPermission?: string,
  revokeEntitlement?: string,
): string[] {
  return getDemoGovernRequiredForAgent(
    agentId ?? DEMO_RESET_AGENT_ID,
    allowPermission,
    revokeEntitlement,
  );
}

export function getDemoGovernExpectedInbound(agentId?: string): string[] {
  return getDemoSeedInboundForAgent(agentId ?? DEMO_RESET_AGENT_ID);
}

export function findDemoAgent(agentId: string = DEMO_RESET_AGENT_ID) {
  return findAgentById(agentId);
}
