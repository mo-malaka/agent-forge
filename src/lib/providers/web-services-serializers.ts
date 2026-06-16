import type { AgentRow } from "@/lib/db/schema";
import { SCHEMA_VERSION } from "@/lib/constants";

import { buildDeployment } from "./deployment";

interface Pagination {
  page: number;
  limit: number;
  total: number;
  has_more: boolean;
}

export interface WebServicesAccount {
  id: string;
  name: string;
  displayName: string;
  nativeIdentity: string;
  status: string;
  agentId: string;
  archetype: string;
  platform: string;
  region?: string;
  location?: string;
  accountId?: string;
  foundationModel?: string;
  projectId?: string;
  workspace?: string;
  resourceGroup?: string;
  subscriptionId?: string;
  createdAt: string;
  updatedAt: string;
}

function buildWebServicesAccount(row: AgentRow, baseUrl: string): WebServicesAccount {
  const deployment = buildDeployment(row, baseUrl);

  const base: WebServicesAccount = {
    id: deployment.resource_id,
    name: row.name,
    displayName: row.name,
    nativeIdentity: deployment.resource_id,
    status: deployment.native_status,
    agentId: row.id,
    archetype: row.archetype,
    platform: deployment.provider_label,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };

  if (deployment.provider === "aws_bedrock") {
    return {
      ...base,
      region: deployment.region,
      accountId: deployment.config.account_id,
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

export function serializeWebServicesAccountList(
  rows: AgentRow[],
  pagination: Pagination,
  baseUrl: string,
) {
  return {
    schema_version: SCHEMA_VERSION,
    source: "agentforge_web_services",
    generated_at: new Date().toISOString(),
    pagination,
    accounts: rows.map((row) => buildWebServicesAccount(row, baseUrl)),
  };
}
