import {
  ARCHETYPES,
  PLATFORM_ID,
  SCHEMA_VERSION,
  type Archetype,
} from "@/lib/constants";
import type { AgentRow } from "@/lib/db/schema";
import type {
  AgentDetailResponse,
  AgentListResponse,
  AgentMetadata,
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

function parseJsonStringArray(value: string): string[] {
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter((item): item is string => typeof item === "string");
  } catch {
    return [];
  }
}

function getBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, "") ??
    "http://localhost:3000"
  );
}

export function serializeAgent(row: AgentRow): SerializedAgent {
  const archetype = row.archetype as Archetype;
  const metadata = parseJsonRecord(row.metadata);
  const entitlementNames = parseJsonStringArray(row.entitlements);
  const entitlements = entitlementNames.map(parseEntitlement);
  const baseUrl = getBaseUrl();

  return {
    id: row.id,
    external_id: row.id,
    name: row.name,
    display_name: row.name,
    archetype,
    archetype_label: ARCHETYPES[archetype] ?? row.archetype,
    status: row.status as "active" | "inactive",
    agent_type: "autonomous",
    provider: "synthetic",
    infrastructure: "agentforge",
    created_at: row.createdAt,
    updated_at: row.updatedAt,
    last_active_at: row.lastActiveAt,
    metadata,
    iam: {
      entitlements,
      roles: entitlements.filter((item) => item.type === "role").map((item) => item.action),
      permissions_count: entitlements.length,
    },
    governance: {
      classification: "internal",
      data_access: entitlementNames.map((item) => item.split(":")[0]).filter(Boolean),
      compliance_tags: ["demo-only"],
    },
    endpoints: {
      self: `${baseUrl}/api/agents/${row.id}`,
      entitlements: `${baseUrl}/api/agents/${row.id}/entitlements`,
    },
    _links: {
      self: { href: `/api/agents/${row.id}` },
    },
  };
}

export function serializeAgentList(
  rows: AgentRow[],
  pagination: AgentListResponse["pagination"],
): AgentListResponse {
  return {
    schema_version: SCHEMA_VERSION,
    platform: PLATFORM_ID,
    generated_at: new Date().toISOString(),
    pagination,
    agents: rows.map(serializeAgent),
  };
}

export function serializeAgentDetail(row: AgentRow): AgentDetailResponse {
  return {
    schema_version: SCHEMA_VERSION,
    platform: PLATFORM_ID,
    generated_at: new Date().toISOString(),
    agent: serializeAgent(row),
  };
}
