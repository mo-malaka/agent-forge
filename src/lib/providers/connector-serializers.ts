import type { AgentRow } from "@/lib/db/schema";
import { SCHEMA_VERSION } from "@/lib/constants";

import { buildDeployment } from "./deployment";

interface Pagination {
  page: number;
  limit: number;
  total: number;
  has_more: boolean;
}

export function serializeAwsBedrockAgentList(
  rows: AgentRow[],
  pagination: Pagination,
  baseUrl: string,
) {
  return {
    schema_version: SCHEMA_VERSION,
    source: "aws_bedrock",
    generated_at: new Date().toISOString(),
    pagination,
    agentSummaries: rows.map((row) => {
      const deployment = buildDeployment(row, baseUrl);

      return {
        agentId: row.id,
        agentName: row.name,
        agentStatus: deployment.native_status,
        description: `${row.archetype} synthetic agent`,
        updatedAt: new Date(row.updatedAt),
        agentArn: deployment.resource_arn,
        foundationModel: deployment.config.foundation_model,
        agentAlias: deployment.config.agent_alias,
        region: deployment.region,
        accountId: deployment.config.account_id,
        connector_endpoint: deployment.connector_endpoint,
        detail_url: `${baseUrl}/api/agents/${row.id}`,
      };
    }),
  };
}

export function serializeGcpVertexAgentList(
  rows: AgentRow[],
  pagination: Pagination,
  baseUrl: string,
) {
  return {
    schema_version: SCHEMA_VERSION,
    source: "gcp_vertex",
    generated_at: new Date().toISOString(),
    pagination,
    agents: rows.map((row) => {
      const deployment = buildDeployment(row, baseUrl);

      return {
        name: deployment.resource_name,
        displayName: row.name,
        state: deployment.native_status,
        createTime: row.createdAt,
        updateTime: row.updatedAt,
        labels: {
          archetype: row.archetype,
          agentforge_id: row.id,
        },
        project_id: deployment.config.project_id,
        location: deployment.location,
        connector_endpoint: deployment.connector_endpoint,
        detail_url: `${baseUrl}/api/agents/${row.id}`,
      };
    }),
  };
}

export function serializeAzureAiFoundryAgentList(
  rows: AgentRow[],
  pagination: Pagination,
  baseUrl: string,
) {
  return {
    schema_version: SCHEMA_VERSION,
    source: "azure_ai_foundry",
    generated_at: new Date().toISOString(),
    pagination,
    value: rows.map((row) => {
      const deployment = buildDeployment(row, baseUrl);

      return {
        id: deployment.resource_id,
        name: row.name,
        type: "Microsoft.CognitiveServices/accounts/agents",
        location: deployment.location,
        properties: {
          provisioningState: deployment.native_status,
          displayName: row.name,
          archetype: row.archetype,
          workspace: deployment.config.workspace,
          resourceGroup: deployment.config.resource_group,
          subscriptionId: deployment.config.subscription_id,
          lastModifiedAt: row.updatedAt,
        },
        connector_endpoint: deployment.connector_endpoint,
        detail_url: `${baseUrl}/api/agents/${row.id}`,
      };
    }),
    count: pagination.total,
  };
}
