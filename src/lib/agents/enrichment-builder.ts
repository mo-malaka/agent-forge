import {
  buildAccessEntitlementId,
  scoreInboundAccess,
  scoreOutboundAccess,
} from "@/lib/agents/access";
import type {
  AgentDetails,
  ExtendedEntitlement,
  LinkedAccount,
  PrivilegeLevel,
} from "@/lib/agents/enrichment";
import type { AgentRow } from "@/lib/db/schema";
import type { Archetype } from "@/lib/constants";
import { buildDeployment, mergeDeploymentConfig } from "@/lib/providers/deployment";
import {
  DEPLOYMENT_PROVIDERS,
  type DeploymentProvider,
} from "@/lib/providers/profiles";

const TENANT = "spciem";

const PLATFORM_SOURCE: Record<DeploymentProvider, string> = {
  aws_bedrock: `AWS Bedrock - ${TENANT}`,
  gcp_vertex: `GCP Vertex - ${TENANT}`,
  azure_ai_foundry: `Azure AI Foundry - ${TENANT}`,
};

const PLATFORM_OUTBOUND: Record<DeploymentProvider, string[]> = {
  aws_bedrock: [
    "AIDevOpsAgentReadOnlyAccess",
    "AmazonBedrockAgentInferenceProfilesCrossRegionPolicy",
    "AmazonBedrockAgentRetrieveKnowledgeBasePolicy",
    "DevOps_Agent_Secrets",
    "SecurityAudit",
    "Security Auditor (on) spciem.com [Organization]",
    "Viewer (on) spciem.com [Organization]",
    "Read agent identities [on] Microsoft Graph",
    "DevOps-Operations",
    "S3:Read",
    "EC2:Describe",
    "Jira:Admin",
    "Bedrock:InvokeModel",
  ],
  gcp_vertex: [
    "Vertex AI User (on) spciem.com [Organization]",
    "Vertex AI User (on) infra-agents [Project]",
    "Cloud Tasks Admin (on) infra-agents [Project]",
    "Editor (on) Development [Project]",
    "Support User (on) infra-agents [Project]",
    "BigQuery User (on) infra-agents [Project]",
    "Create agent identities linked to itself [on] Microsoft Graph",
    "Read directory data [on] Microsoft Graph",
    "VertexAI:User",
    "Engineering-Developers",
    "AIDevOpsAgentReadOnlyAccess",
  ],
  azure_ai_foundry: [
    "CallCenter-Customer Data",
    "CallCenter-PasswordReset",
    "HR_All",
    "CallCenter-Customer claims",
    "Read all users' full profiles [on] Microsoft Graph",
    "Send mail as any user [on] Microsoft Graph",
    "Create agent identities linked to itself [on] Microsoft Graph",
    "BigQuery User (on) infra-agents [Project]",
    "Tech Support Viewer (on) infra-agents [Project]",
    "Read items in all site collections [on] Office 365 SharePoint Online",
    "Workday:Read",
    "Slack:Read",
    "CognitiveServices:OpenAI:User",
    "SharePoint:Read",
  ],
};

const PLATFORM_INBOUND: Record<DeploymentProvider, string[]> = {
  aws_bedrock: ["invoke:engineering-team", "invoke:service-now-workflow"],
  gcp_vertex: ["invoke:slack-bot", "invoke:api-gateway"],
  azure_ai_foundry: ["invoke:copilot-studio", "invoke:engineering-team"],
};

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function privilegeFromRisk(riskScore: number): PrivilegeLevel {
  if (riskScore >= 7) {
    return "high";
  }
  if (riskScore >= 5) {
    return "medium";
  }
  return "low";
}

function scoreEntitlement(
  name: string,
  direction: "outbound" | "inbound",
): number {
  const lowered = name.toLowerCase();
  if (
    lowered.includes("admin") ||
    lowered.includes("secrets") ||
    lowered.includes("security auditor") ||
    lowered.includes("send mail")
  ) {
    return 8;
  }
  if (
    lowered.includes("audit") ||
    lowered.includes("inference") ||
    lowered.includes("workflow") ||
    lowered.includes("operations")
  ) {
    return 6;
  }
  return direction === "inbound"
    ? scoreInboundAccess(name)
    : scoreOutboundAccess(name);
}

function buildExtended(
  name: string,
  direction: "outbound" | "inbound",
  sourceName: string,
  accountName: string,
  options?: {
    id?: string;
    riskScore?: number;
    privilegeLevel?: PrivilegeLevel;
  },
): ExtendedEntitlement {
  const attributeName =
    direction === "inbound" ? "inboundCallers" : "outboundPermissions";
  const riskScore = options?.riskScore ?? scoreEntitlement(name, direction);

  return {
    id: options?.id ?? buildAccessEntitlementId(name),
    entitlementName: name,
    displayName: name,
    attributeName,
    attributeValue: name,
    sourceName,
    accountName,
    accessDirection: direction,
    riskScore,
    privilegeLevel: options?.privilegeLevel ?? privilegeFromRisk(riskScore),
  };
}

export interface EntitlementTuning {
  id?: string;
  name: string;
  direction: "outbound" | "inbound";
  riskScore: number;
  privilegeLevel: PrivilegeLevel;
}

export interface AgentEnrichmentOverrides {
  linkedAccounts?: LinkedAccount[];
  agentDetails?: AgentDetails;
}

export interface AgentEnrichmentInput {
  id: string;
  name: string;
  archetype: Archetype;
  deploymentProvider: DeploymentProvider;
  deploymentConfig: Record<string, string>;
  metadata: Record<string, string>;
  entitlements: string[];
  inboundAccess: string[];
  status?: "active" | "inactive";
  entitlementTuning?: EntitlementTuning[];
  overrides?: AgentEnrichmentOverrides;
}

function buildAgentDetails(
  provider: DeploymentProvider,
  name: string,
  metadata: Record<string, string>,
  deploymentConfig: Record<string, string>,
): AgentDetails {
  const description =
    metadata.description ??
    `${DEPLOYMENT_PROVIDERS[provider].label} demo agent for ${name}`;

  if (provider === "aws_bedrock") {
    return {
      agentName: name,
      description,
      foundationModel: deploymentConfig.foundation_model,
      region: deploymentConfig.region,
      version: metadata.version,
      agentAliasStatus: "PREPARED",
    };
  }

  if (provider === "gcp_vertex") {
    return {
      description,
      projectId: deploymentConfig.project_id,
      locationId: deploymentConfig.location,
      name,
    };
  }

  return {
    description,
    model: "gpt-4.1-mini",
    workspace: deploymentConfig.workspace,
    location: deploymentConfig.location,
  };
}

export interface AgentEnrichment {
  entitlements: string[];
  inboundAccess: string[];
  linkedAccounts: LinkedAccount[];
  extendedEntitlements: ExtendedEntitlement[];
  agentDetails: AgentDetails;
}

export function buildAgentEnrichment(input: AgentEnrichmentInput): AgentEnrichment {
  const sourceName = PLATFORM_SOURCE[input.deploymentProvider];
  const mergedConfig = mergeDeploymentConfig(
    input.deploymentProvider,
    input.deploymentConfig,
  );

  const outbound = input.entitlementTuning
    ? input.entitlementTuning
        .filter((item) => item.direction === "outbound")
        .map((item) => item.name)
    : uniqueStrings([
        ...PLATFORM_OUTBOUND[input.deploymentProvider],
        ...input.entitlements,
      ]);

  const inbound = input.entitlementTuning
    ? input.entitlementTuning
        .filter((item) => item.direction === "inbound")
        .map((item) => item.name)
    : uniqueStrings([
        ...PLATFORM_INBOUND[input.deploymentProvider],
        ...input.inboundAccess,
      ]);

  const linkedAccounts =
    input.overrides?.linkedAccounts ??
    (() => {
      const tempRow: AgentRow = {
        id: input.id,
        name: input.name,
        archetype: input.archetype,
        deploymentProvider: input.deploymentProvider,
        deploymentConfig: JSON.stringify(mergedConfig),
        status: input.status ?? "active",
        metadata: JSON.stringify(input.metadata),
        entitlements: JSON.stringify(outbound),
        inboundAccess: JSON.stringify(inbound),
        agentDetails: "{}",
        linkedAccounts: "[]",
        extendedEntitlements: "[]",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastActiveAt: new Date().toISOString(),
      };
      const deployment = buildDeployment(tempRow, "https://agentforge.local");

      return [
        {
          id: `acct_${input.id}_primary`,
          name: input.name,
          displayName: input.name,
          nativeIdentity: deployment.resource_id,
          sourceName,
          status: "Enabled" as const,
          accountOwner: input.metadata.owner,
        },
      ];
    })();

  const accountName =
    input.overrides?.linkedAccounts?.[0]?.displayName ?? input.name;

  const extendedEntitlements = input.entitlementTuning
    ? input.entitlementTuning.map((item) =>
        buildExtended(
          item.name,
          item.direction,
          sourceName,
          accountName,
          {
            id: item.id,
            riskScore: item.riskScore,
            privilegeLevel: item.privilegeLevel,
          },
        ),
      )
    : [
        ...outbound.map((name) =>
          buildExtended(name, "outbound", sourceName, accountName),
        ),
        ...inbound.map((name) =>
          buildExtended(name, "inbound", sourceName, accountName),
        ),
      ];

  return {
    entitlements: outbound,
    inboundAccess: inbound,
    linkedAccounts,
    extendedEntitlements,
    agentDetails:
      input.overrides?.agentDetails ??
      buildAgentDetails(
        input.deploymentProvider,
        input.name,
        input.metadata,
        mergedConfig,
      ),
  };
}

export function agentNeedsEnrichment(row: AgentRow): boolean {
  return (
    !row.extendedEntitlements ||
    row.extendedEntitlements === "[]" ||
    !row.linkedAccounts ||
    row.linkedAccounts === "[]"
  );
}

export function enrichAgentRow(row: AgentRow): AgentRow {
  if (!agentNeedsEnrichment(row)) {
    return row;
  }

  let metadata: Record<string, string> = {};
  let entitlements: string[] = [];
  let inboundAccess: string[] = [];

  try {
    metadata = JSON.parse(row.metadata) as Record<string, string>;
  } catch {
    metadata = {};
  }

  try {
    const parsed = JSON.parse(row.entitlements) as unknown;
    entitlements = Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string")
      : [];
  } catch {
    entitlements = [];
  }

  try {
    const parsed = JSON.parse(row.inboundAccess) as unknown;
    inboundAccess = Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string")
      : [];
  } catch {
    inboundAccess = [];
  }

  let deploymentConfig: Record<string, string> = {};
  try {
    deploymentConfig = JSON.parse(row.deploymentConfig) as Record<string, string>;
  } catch {
    deploymentConfig = {};
  }

  const enrichment = buildAgentEnrichment({
    id: row.id,
    name: row.name,
    archetype: row.archetype as Archetype,
    deploymentProvider: row.deploymentProvider as DeploymentProvider,
    deploymentConfig,
    metadata,
    entitlements,
    inboundAccess,
    status: row.status as "active" | "inactive",
  });

  return {
    ...row,
    entitlements: JSON.stringify(enrichment.entitlements),
    inboundAccess: JSON.stringify(enrichment.inboundAccess),
    linkedAccounts: JSON.stringify(enrichment.linkedAccounts),
    extendedEntitlements: JSON.stringify(enrichment.extendedEntitlements),
    agentDetails: JSON.stringify(enrichment.agentDetails),
  };
}
