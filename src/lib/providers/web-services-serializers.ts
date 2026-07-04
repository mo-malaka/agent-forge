import type { AgentRow } from "@/lib/db/schema";
import { SCHEMA_VERSION } from "@/lib/constants";
import {
  buildLinkedAccountPayload,
  getAgentDetails,
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
  const outboundPermissions = getOutboundAccess(row);
  const inboundCallers = getInboundAccess(row);

  const base: WebServicesAccount = {
    id: row.id,
    accountId: row.id,
    name: row.name,
    displayName: row.name,
    identityName: row.name,
    nativeIdentity:
      (details.agentArn as string) ??
      (details.name as string) ??
      deployment.resource_id,
    identity:
      (details.agentArn as string) ??
      (details.name as string) ??
      deployment.resource_id,
    backendId:
      (details.agentArn as string) ??
      (details.name as string) ??
      deployment.resource_id,
    status: deployment.native_status,
    agentId: row.id,
    machineIdentity: row.name,
    sourceName: `${deployment.provider_label} - spciem`,
    archetype: row.archetype,
    platform: deployment.provider_label,
    owner: metadata.owner,
    department: metadata.department,
    riskLevel: metadata.risk_level,
    description: (details.description as string) ?? metadata.description,
    foundationModel: details.foundationModel as string | undefined,
    agentAliasStatus: details.agentAliasStatus as string | undefined,
    connectedAgents: details.connectedAgents,
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
  const linked = getLinkedAccounts(row).map((account) =>
    buildLinkedAccountPayload(row, account, baseUrl),
  );

  if (linked.length > 0) {
    return linked;
  }

  return [buildWebServicesAccount(row, baseUrl)];
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
