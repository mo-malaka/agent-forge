import type { AgentRow } from "@/lib/db/schema";
import { SCHEMA_VERSION } from "@/lib/constants";
import { getAgentDetails } from "@/lib/agents/enrichment";

import { buildDeployment } from "./deployment";

interface Pagination {
  page: number;
  limit: number;
  total: number;
  has_more: boolean;
}

function metadataDescription(row: AgentRow): string {
  try {
    const metadata = JSON.parse(row.metadata) as Record<string, string>;
    return metadata.description ?? `${row.archetype} synthetic agent`;
  } catch {
    return `${row.archetype} synthetic agent`;
  }
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
      const details = getAgentDetails(row);

      return {
        agentId: row.id,
        agentName: row.name,
        agentStatus: deployment.native_status,
        description: (details.description as string) ?? metadataDescription(row),
        updatedAt: new Date(row.updatedAt),
        agentArn: (details.agentArn as string) ?? deployment.resource_arn,
        foundationModel:
          (details.foundationModel as string) ?? deployment.config.foundation_model,
        agentAlias: deployment.config.agent_alias,
        region: (details.region as string) ?? deployment.region,
        accountId: deployment.config.account_id,
        aliasId: details.aliasId,
        aliasName: details.aliasName,
        agentAliasStatus: details.agentAliasStatus,
        agentCollaboration: details.agentCollaboration,
        role: details.role,
        version: details.version,
        resources: details.resources,
        connectedAgents: details.connectedAgents,
        reference_api: deployment.reference_api,
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
      const details = getAgentDetails(row);

      return {
        name: (details.name as string) ?? deployment.resource_name,
        displayName: row.name,
        state: deployment.native_status,
        createTime: (details.createTime as string) ?? row.createdAt,
        updateTime: (details.updateTime as string) ?? row.updatedAt,
        description: (details.description as string) ?? metadataDescription(row),
        labels: {
          archetype: row.archetype,
          agentforge_id: row.id,
        },
        project_id: (details.projectId as string) ?? deployment.config.project_id,
        location: (details.locationId as string) ?? deployment.location,
        connectedAgents: details.connectedAgents,
        metadata: details.metadata,
        reference_api: deployment.reference_api,
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
      const details = getAgentDetails(row);

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
          model: details.model,
          temperature: details.temperature,
          top_p: details.top_p,
          response_format: details.response_format,
          description: details.description ?? metadataDescription(row),
          connectedAgents: details.connectedAgents,
          metadata: details.metadata,
          created_at: details.created_at,
        },
        reference_api: deployment.reference_api,
        detail_url: `${baseUrl}/api/agents/${row.id}`,
      };
    }),
    count: pagination.total,
  };
}
