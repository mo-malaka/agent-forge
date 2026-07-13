import type { NewAgentRow } from "@/lib/db/schema";
import {
  buildHeroSeedAgents,
  HERO_AGENT_IDS,
} from "@/lib/db/hero-seed-data";

export function buildSeedAgents(): NewAgentRow[] {
  return buildHeroSeedAgents();
}

export const SEED_AGENT_IDS = HERO_AGENT_IDS;

export const DEMO_RESET_AGENT_ID = "agt_demo_aws_bedrock";

export const DEMO_GOVERN_ALLOW_PERMISSION = "S3:Read";
export const DEMO_GOVERN_REVOKE_ENTITLEMENT = "Jira:Admin";

export function getSeedAgentRow(id: string): NewAgentRow | null {
  return buildSeedAgents().find((agent) => agent.id === id) ?? null;
}

export function getDemoSeedOutboundEntitlements(
  agentId: string = DEMO_RESET_AGENT_ID,
): string[] {
  const seed = getSeedAgentRow(agentId);
  if (!seed) {
    return [];
  }
  return JSON.parse(seed.entitlements) as string[];
}

export function getDemoSeedInboundAccess(
  agentId: string = DEMO_RESET_AGENT_ID,
): string[] {
  const seed = getSeedAgentRow(agentId);
  if (!seed) {
    return [];
  }
  return JSON.parse(seed.inboundAccess) as string[];
}
