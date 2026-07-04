import {
  ARCHETYPES,
  PLATFORM_ID,
  SCHEMA_VERSION,
  type Archetype,
} from "@/lib/constants";
import type { AgentRow } from "@/lib/db/schema";
import { buildDeployment } from "@/lib/providers/deployment";
import {
  buildAccessEntitlementId,
  getInboundAccess,
  getOutboundAccess,
  scoreInboundAccess,
  slugifyAccessName,
} from "@/lib/agents/access";
import {
  getAgentDetails,
  getExtendedEntitlements,
  getLinkedAccounts,
} from "@/lib/agents/enrichment";
import type {
  AgentDetailResponse,
  AgentListResponse,
  AgentMetadata,
  SerializedAccessEntitlement,
  SerializedAgent,
  SerializedEntitlement,
} from "@/types/agent";

const KNOWN_RESOURCES: Record<string, string> = {
  S3: "aws:s3",
  EC2: "aws:ec2",
  IAM: "aws:iam",
  Jira: "atlassian:jira",
  Confluence: "atlassian:confluence",
  GitHub: "github:repo",
  Slack: "slack:workspace",
  Salesforce: "salesforce:crm",
  Workday: "workday:hr",
};

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function parseEntitlement(name: string): SerializedEntitlement {
  const [resourceKey, actionKey] = name.split(":");
  const resource = KNOWN_RESOURCES[resourceKey] ?? `custom:${slugify(resourceKey)}`;
  const action = actionKey ? slugify(actionKey) : "access";
  const isRole = action.includes("admin") || action.includes("owner");

  return {
    id: `ent_${slugify(name)}`,
    name,
    type: isRole ? "role" : "permission",
    resource,
    action,
    risk_score: isRole ? 8 : action.includes("write") || action.includes("delete") ? 6 : 3,
  };
}

function parseJsonRecord(value: string): AgentMetadata {
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

function parseOutboundAccess(name: string): SerializedAccessEntitlement {
  const parsed = parseEntitlement(name);

  return {
    id: parsed.id,
    name,
    direction: "outbound",
    type: parsed.type,
    resource: parsed.resource,
    action: parsed.action,
    risk_score: parsed.risk_score,
  };
}

function parseInboundAccess(name: string): SerializedAccessEntitlement {
  const [prefix, principal = "unknown"] = name.split(":");
  const action = slugifyAccessName(principal);

  return {
    id: buildAccessEntitlementId(name),
    name,
    direction: "inbound",
    type: "caller",
    resource: `invoke:${slugifyAccessName(prefix || "agent")}`,
    action,
    risk_score: scoreInboundAccess(name),
  };
}

export function serializeAgent(row: AgentRow, baseUrl: string): SerializedAgent {
  const archetype = row.archetype as Archetype;
  const metadata = parseJsonRecord(row.metadata);
  const outboundNames = getOutboundAccess(row);
  const inboundNames = getInboundAccess(row);
  const outboundAccess = outboundNames.map(parseOutboundAccess);
  const inboundAccess = inboundNames.map(parseInboundAccess);
  const entitlements = outboundNames.map(parseEntitlement);
  const deployment = buildDeployment(row, baseUrl);
  const details = getAgentDetails(row);
  const linkedAccounts = getLinkedAccounts(row);
  const extendedEntitlements = getExtendedEntitlements(row);

  return {
    id: row.id,
    external_id: deployment.resource_id,
    name: row.name,
    display_name: row.name,
    archetype,
    archetype_label: ARCHETYPES[archetype] ?? row.archetype,
    status: row.status as "active" | "inactive",
    agent_type: "autonomous",
    provider: deployment.cloud,
    infrastructure: deployment.infrastructure,
    deployment,
    created_at: row.createdAt,
    updated_at: row.updatedAt,
    last_active_at: row.lastActiveAt,
    metadata,
    details,
    linked_accounts: linkedAccounts,
    extended_entitlements: extendedEntitlements,
    iam: {
      outbound_access: outboundAccess,
      inbound_access: inboundAccess,
      entitlements,
      roles: entitlements.filter((item) => item.type === "role").map((item) => item.action),
      permissions_count: outboundAccess.length + inboundAccess.length,
    },
    governance: {
      classification: "internal",
      data_access: outboundNames.map((item) => item.split(":")[0]).filter(Boolean),
      compliance_tags: ["demo-only", deployment.provider],
    },
    endpoints: {
      self: `${baseUrl}/api/agents/${row.id}`,
      entitlements: `${baseUrl}/api/agents/${row.id}/entitlements`,
      authorize: `${baseUrl}/api/agents/${row.id}/authorize`,
      web_services: deployment.web_services_endpoint,
      reference_api: deployment.reference_api,
    },
    _links: {
      self: { href: `/api/agents/${row.id}` },
      web_services: { href: deployment.web_services_endpoint },
      reference_api: { href: deployment.reference_api },
    },
  };
}

export function serializeAgentList(
  rows: AgentRow[],
  pagination: AgentListResponse["pagination"],
  baseUrl: string,
): AgentListResponse {
  return {
    schema_version: SCHEMA_VERSION,
    platform: PLATFORM_ID,
    generated_at: new Date().toISOString(),
    pagination,
    agents: rows.map((row) => serializeAgent(row, baseUrl)),
  };
}

export function serializeAgentDetail(
  row: AgentRow,
  baseUrl: string,
): AgentDetailResponse {
  return {
    schema_version: SCHEMA_VERSION,
    platform: PLATFORM_ID,
    generated_at: new Date().toISOString(),
    agent: serializeAgent(row, baseUrl),
  };
}
