import { nanoid } from "nanoid";

import { ARCHETYPE_VALUES, type Archetype } from "@/lib/constants";
import { pickInboundCallers } from "@/lib/agents/access";
import type { DeploymentProvider } from "@/lib/providers/profiles";
import type { CreateAgentInput } from "@/types/agent";

const DEPARTMENTS = [
  "Engineering",
  "Security",
  "Customer Success",
  "Finance",
  "Human Resources",
  "Platform Operations",
] as const;

const RISK_LEVELS = ["Low", "Medium", "High"] as const;

const OWNERS = [
  "platform-ops@sailpoint.com",
  "security-team@sailpoint.com",
  "cx-team@sailpoint.com",
  "finance-ops@sailpoint.com",
  "people-ops@sailpoint.com",
  "demo-admin@sailpoint.com",
] as const;

const AWS_REGIONS = ["us-east-1", "us-west-2", "eu-west-1"] as const;
const GCP_LOCATIONS = ["us-central1", "us-east1", "europe-west1"] as const;
const AZURE_LOCATIONS = ["eastus", "westus2", "westeurope"] as const;

const NAME_PREFIXES: Record<DeploymentProvider, string[]> = {
  aws_bedrock: ["Bedrock", "Nova", "AWS-Agent", "Q-Agent"],
  gcp_vertex: ["Vertex", "GCP-Agent", "Gemini", "Cloud-Agent"],
  azure_ai_foundry: ["Foundry", "Azure-Agent", "Copilot", "Fabric-Agent"],
};

const ARCHETYPE_ENTITLEMENTS: Record<Archetype, string[]> = {
  code_assistant: ["GitHub:Write", "Jira:Read", "Confluence:Read"],
  devops_bot: ["S3:Read", "EC2:Describe", "Jira:Admin", "Bedrock:InvokeModel"],
  customer_support: ["Salesforce:Read", "Slack:Write", "Zendesk:Read"],
  financial_analyst: ["Salesforce:Read", "S3:Read", "Workday:Read"],
  security_analyst: ["IAM:Read", "CloudTrail:Read", "GuardDuty:Read"],
  hr: ["Workday:Read", "Slack:Read", "AD:Read"],
};

const PROVIDER_ENTITLEMENTS: Record<DeploymentProvider, string[]> = {
  aws_bedrock: ["S3:Read", "IAM:Read", "Bedrock:InvokeModel"],
  gcp_vertex: ["VertexAI:User", "Storage:ObjectViewer", "BigQuery:Read"],
  azure_ai_foundry: [
    "CognitiveServices:OpenAI:User",
    "Storage:Blob:Read",
    "KeyVault:Read",
  ],
};

function pick<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)]!;
}

function uniqueEntitlements(archetype: Archetype, provider: DeploymentProvider): string[] {
  const merged = [...ARCHETYPE_ENTITLEMENTS[archetype], ...PROVIDER_ENTITLEMENTS[provider]];
  return [...new Set(merged)].slice(0, 4 + Math.floor(Math.random() * 3));
}

function buildDeploymentConfig(provider: DeploymentProvider): Record<string, string> {
  if (provider === "aws_bedrock") {
    return {
      region: pick(AWS_REGIONS),
      account_id: "123456789012",
    };
  }

  if (provider === "gcp_vertex") {
    return {
      project_id: "demo-ai-governance",
      location: pick(GCP_LOCATIONS),
    };
  }

  return {
    subscription_id: "00000000-0000-0000-0000-000000000001",
    resource_group: "rg-ai-agents",
    workspace: "foundry-demo",
    location: pick(AZURE_LOCATIONS),
  };
}

function buildAgentName(provider: DeploymentProvider, index: number): string {
  const prefix = pick(NAME_PREFIXES[provider]);
  const suffix = nanoid(4);
  return `${prefix}-Agent-${String(index + 1).padStart(2, "0")}-${suffix}`;
}

export function generateRandomAgentInput(
  provider: DeploymentProvider,
  index: number,
): CreateAgentInput {
  const archetype = pick(ARCHETYPE_VALUES);
  const department = pick(DEPARTMENTS);
  const riskLevel = pick(RISK_LEVELS);

  return {
    name: buildAgentName(provider, index),
    archetype,
    deployment_provider: provider,
    deployment_config: buildDeploymentConfig(provider),
    metadata: {
      owner: pick(OWNERS),
      version: `${1 + Math.floor(Math.random() * 3)}.${Math.floor(Math.random() * 10)}.${Math.floor(Math.random() * 10)}`,
      department,
      risk_level: riskLevel,
      environment: "demo",
    },
    entitlements: uniqueEntitlements(archetype, provider),
    inbound_access: pickInboundCallers(2),
  };
}

export function generateRandomAgentBatch(
  provider: DeploymentProvider,
  count: number,
): CreateAgentInput[] {
  return Array.from({ length: count }, (_, index) =>
    generateRandomAgentInput(provider, index),
  );
}
