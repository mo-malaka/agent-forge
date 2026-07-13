import { buildHeroSeedAgents } from "@/lib/db/hero-seed-data";
import type { NewAgentRow } from "@/lib/db/schema";
import type { DeploymentProvider } from "@/lib/providers/profiles";
import { DEPLOYMENT_PROVIDERS } from "@/lib/providers/profiles";

function getSeedAgentRow(id: string): NewAgentRow | null {
  return buildHeroSeedAgents().find((agent) => agent.id === id) ?? null;
}

export interface GovernDemoProfile {
  agentId: string;
  label: string;
  provider: DeploymentProvider;
  allowPermission: string;
  revokeEntitlement: string;
}

export const GOVERN_DEMO_PROFILES: GovernDemoProfile[] = [
  {
    agentId: "agt_demo_aws_bedrock",
    label: `${DEPLOYMENT_PROVIDERS.aws_bedrock.label} — Infra-DevOps-Agent`,
    provider: "aws_bedrock",
    allowPermission: "S3:Read",
    revokeEntitlement: "Jira:Admin",
  },
  {
    agentId: "agt_demo_gcp_vertex",
    label: `${DEPLOYMENT_PROVIDERS.gcp_vertex.label} — sw-bug-assistant`,
    provider: "gcp_vertex",
    allowPermission: "VertexAI:User",
    revokeEntitlement: "BigQuery User (on) infra-agents [Project]",
  },
  {
    agentId: "agt_demo_azure_foundry",
    label: `${DEPLOYMENT_PROVIDERS.azure_ai_foundry.label} — Frontline-Support-Bot`,
    provider: "azure_ai_foundry",
    allowPermission: "Workday:Read",
    revokeEntitlement: "Slack:Read",
  },
];

export function getGovernDemoProfile(agentId: string): GovernDemoProfile {
  return (
    GOVERN_DEMO_PROFILES.find((profile) => profile.agentId === agentId) ??
    GOVERN_DEMO_PROFILES[0]
  );
}

export function getDemoSeedOutboundForAgent(agentId: string): string[] {
  const seed = getSeedAgentRow(agentId);
  if (!seed) {
    return [];
  }
  return JSON.parse(seed.entitlements) as string[];
}

export function getDemoSeedInboundForAgent(agentId: string): string[] {
  const seed = getSeedAgentRow(agentId);
  if (!seed) {
    return [];
  }
  return JSON.parse(seed.inboundAccess) as string[];
}

export function getDemoGovernRequiredForAgent(
  agentId: string,
  allowPermission?: string,
  revokeEntitlement?: string,
): [string, string] {
  const profile = getGovernDemoProfile(agentId);
  return [
    allowPermission?.trim() || profile.allowPermission,
    revokeEntitlement?.trim() || profile.revokeEntitlement,
  ];
}
