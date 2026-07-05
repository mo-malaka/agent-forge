import type { AgentRow } from "@/lib/db/schema";
import { SCHEMA_VERSION } from "@/lib/constants";
import {
  getAgentDetails,
  getExtendedEntitlements,
  getLinkedAccounts,
} from "@/lib/agents/enrichment";
import {
  getInboundAccess,
  getOutboundAccess,
} from "@/lib/agents/access";

import { buildDeployment } from "./deployment";

interface Pagination {
  page: number;
  limit: number;
  total: number;
  has_more: boolean;
}

export interface WebServicesAccount {
  id: string;
  accountId: string;
  name: string;
  displayName: string;
  identityName: string;
  nativeIdentity: string;
  identity: string;
  backendId: string;
  status: string;
  agentId: string;
  archetype: string;
  platform: string;
  owner?: string;
  department?: string;
  riskLevel?: string;
  outboundPermissions: string[];
  inboundCallers: string[];
  region?: string;
  location?: string;
  awsAccountId?: string;
  foundationModel?: string;
  projectId?: string;
  workspace?: string;
  resourceGroup?: string;
  subscriptionId?: string;
  sourceName?: string;
  machineIdentity?: string;
  description?: string;
  agentAliasStatus?: string;
  agentAliasArn?: string;
  agentArn?: string;
  role?: string;
  version?: string;
  resources?: unknown;
  connectedAgents?: unknown;
  agentDetails?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

function parseMetadata(value: string): Record<string, string> {
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }

    return Object.fromEntries(
      Object.entries(parsed).filter(
        (entry): entry is [string, string] => typeof entry[1] === "string",
      ),
    );
  } catch {
    return {};
  }
}

export function buildWebServicesAccount(
  row: AgentRow,
  baseUrl: string,
): WebServicesAccount {
  const deployment = buildDeployment(row, baseUrl);
  const metadata = parseMetadata(row.metadata);
  const details = getAgentDetails(row);
  const linkedPrimary = getPrimaryPlatformLinkedAccount(row);
  const outboundPermissions = mergeUniqueStrings(
    getOutboundAccess(row),
    collectAttributeValues(row, linkedPrimary, "outboundPermissions"),
  );
  const inboundCallers = mergeUniqueStrings(
    getInboundAccess(row),
    collectAttributeValues(row, linkedPrimary, "inboundCallers"),
  );
  const nativeIdentity =
    linkedPrimary?.nativeIdentity ??
    (details.agentAliasArn as string) ??
    (details.agentArn as string) ??
    (details.name as string) ??
    deployment.resource_id;

  const base: WebServicesAccount = {
    id: row.id,
    accountId: row.id,
    name: linkedPrimary?.displayName ?? row.name,
    displayName: linkedPrimary?.displayName ?? row.name,
    identityName: row.name,
    nativeIdentity,
    identity: nativeIdentity,
    backendId: nativeIdentity,
    status: linkedPrimary?.status ?? deployment.native_status,
    agentId: row.id,
    machineIdentity: row.name,
    sourceName: `${deployment.provider_label} - spciem`,
    archetype: row.archetype,
    platform: deployment.provider_label,
    owner: metadata.owner ?? linkedPrimary?.accountOwner,
    department: metadata.department,
    riskLevel: metadata.risk_level,
    description: (details.description as string) ?? metadata.description,
    foundationModel:
      (details.foundationModel as string) ?? deployment.config.foundation_model,
    agentAliasStatus: details.agentAliasStatus as string | undefined,
    agentAliasArn: details.agentAliasArn as string | undefined,
    agentArn: details.agentArn as string | undefined,
    role: details.role as string | undefined,
    version: (details.version as string) ?? metadata.version,
    connectedAgents: details.connectedAgents,
    resources: details.resources,
    agentDetails: details,
    outboundPermissions,
    inboundCallers,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };

  if (deployment.provider === "aws_bedrock") {
    return {
      ...base,
      region: deployment.region,
      awsAccountId: deployment.config.account_id,
      foundationModel: deployment.config.foundation_model,
    };
  }

  if (deployment.provider === "gcp_vertex") {
    return {
      ...base,
      location: deployment.location,
      projectId: deployment.config.project_id,
    };
  }

  return {
    ...base,
    location: deployment.location,
    workspace: deployment.config.workspace,
    resourceGroup: deployment.config.resource_group,
    subscriptionId: deployment.config.subscription_id,
  };
}

export function buildWebServicesAccountsForAgent(
  row: AgentRow,
  baseUrl: string,
): WebServicesAccount[] {
  // One governed account + machine identity per agent on the platform Web Services source.
  return [buildWebServicesAccount(row, baseUrl)];
}

function getPrimaryPlatformLinkedAccount(
  row: AgentRow,
): ReturnType<typeof getLinkedAccounts>[number] | undefined {
  const linked = getLinkedAccounts(row);
  if (linked.length === 0) {
    return undefined;
  }

  return (
    linked.find((account) => account.id.includes("primary")) ??
    linked.find((account) => account.status === "Enabled") ??
    linked[0]
  );
}

function collectAttributeValues(
  row: AgentRow,
  linked: ReturnType<typeof getLinkedAccounts>[number] | undefined,
  attributeName: string,
): string[] {
  if (!linked) {
    return [];
  }

  const attributes = getEntitlementAttributesForLinkedAccount(row, linked);
  return attributes[attributeName] ?? [];
}

function getEntitlementAttributesForLinkedAccount(
  row: AgentRow,
  linked: ReturnType<typeof getLinkedAccounts>[number],
): Record<string, string[]> {
  const attributes = new Map<string, Set<string>>();

  for (const entitlement of getExtendedEntitlements(row)) {
    if (
      entitlement.accountName !== linked.name &&
      entitlement.accountName !== linked.displayName &&
      entitlement.accountName !== row.name
    ) {
      continue;
    }

    const values = attributes.get(entitlement.attributeName) ?? new Set<string>();
    const value =
      entitlement.attributeName === "outboundPermissions" ||
      entitlement.attributeName === "inboundCallers"
        ? entitlement.entitlementName
        : entitlement.attributeValue;
    values.add(value);
    attributes.set(entitlement.attributeName, values);
  }

  return Object.fromEntries(
    [...attributes.entries()].map(([key, values]) => [key, [...values]]),
  );
}

function mergeUniqueStrings(...groups: string[][]): string[] {
  return [...new Set(groups.flat())];
}

export function serializeWebServicesAccountList(
  rows: AgentRow[],
  pagination: Pagination,
  baseUrl: string,
) {
  const accounts = rows.flatMap((row) => buildWebServicesAccountsForAgent(row, baseUrl));

  return {
    schema_version: SCHEMA_VERSION,
    source: "agentforge_web_services",
    generated_at: new Date().toISOString(),
    pagination: {
      ...pagination,
      total: accounts.length,
      has_more: pagination.page * pagination.limit < accounts.length,
    },
    accounts,
  };
}
