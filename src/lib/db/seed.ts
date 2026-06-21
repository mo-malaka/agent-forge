import type { NewAgentRow } from "@/lib/db/schema";
import { mergeDeploymentConfig } from "@/lib/providers/deployment";
import type { DeploymentProvider } from "@/lib/providers/profiles";

const SEED_TIMESTAMP = "2026-01-15T10:00:00.000Z";

interface SeedAgent {
  id: string;
  name: string;
  archetype: string;
  deploymentProvider: DeploymentProvider;
  deploymentConfig?: Record<string, string>;
  metadata: Record<string, string>;
  entitlements: string[];
  inbound_access: string[];
}

const SEED_AGENTS: SeedAgent[] = [
  {
    id: "agt_demo_aws_bedrock",
    name: "DevOps-Bot-Prod",
    archetype: "devops_bot",
    deploymentProvider: "aws_bedrock",
    deploymentConfig: {
      region: "us-east-1",
      account_id: "123456789012",
    },
    metadata: {
      owner: "platform-ops@sailpoint.com",
      version: "2.1.0",
      department: "Engineering",
      risk_level: "High",
      environment: "demo",
    },
    entitlements: ["S3:Read", "EC2:Describe", "Jira:Admin", "Bedrock:InvokeModel"],
    inbound_access: ["invoke:engineering-team", "invoke:service-now-workflow"],
  },
  {
    id: "agt_demo_gcp_vertex",
    name: "Support-Agent-GCP",
    archetype: "customer_support",
    deploymentProvider: "gcp_vertex",
    deploymentConfig: {
      project_id: "demo-ai-governance",
      location: "us-central1",
    },
    metadata: {
      owner: "cx-team@sailpoint.com",
      version: "1.4.2",
      department: "Customer Success",
      risk_level: "Medium",
      environment: "demo",
    },
    entitlements: ["Salesforce:Read", "Slack:Write", "VertexAI:User"],
    inbound_access: ["invoke:slack-bot", "invoke:api-gateway"],
  },
  {
    id: "agt_demo_azure_foundry",
    name: "HR-Assistant-Azure",
    archetype: "hr",
    deploymentProvider: "azure_ai_foundry",
    deploymentConfig: {
      subscription_id: "00000000-0000-0000-0000-000000000001",
      resource_group: "rg-ai-agents",
      workspace: "foundry-demo",
      location: "eastus",
    },
    metadata: {
      owner: "people-ops@sailpoint.com",
      version: "1.0.0",
      department: "Human Resources",
      risk_level: "Medium",
      environment: "demo",
    },
    entitlements: ["Workday:Read", "Slack:Read", "CognitiveServices:OpenAI:User"],
    inbound_access: ["invoke:copilot-studio", "invoke:engineering-team"],
  },
];

export function buildSeedAgents(): NewAgentRow[] {
  return SEED_AGENTS.map((seed) => ({
    id: seed.id,
    name: seed.name,
    archetype: seed.archetype,
    deploymentProvider: seed.deploymentProvider,
    deploymentConfig: JSON.stringify(
      mergeDeploymentConfig(seed.deploymentProvider, seed.deploymentConfig ?? {}),
    ),
    status: "active",
    metadata: JSON.stringify(seed.metadata),
    entitlements: JSON.stringify(seed.entitlements),
    inboundAccess: JSON.stringify(seed.inbound_access),
    createdAt: SEED_TIMESTAMP,
    updatedAt: SEED_TIMESTAMP,
    lastActiveAt: SEED_TIMESTAMP,
  }));
}

export const SEED_AGENT_IDS = SEED_AGENTS.map((agent) => agent.id);
