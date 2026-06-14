import type { Archetype } from "@/lib/constants";

export type AgentStatus = "active" | "inactive";

export interface AgentMetadata {
  [key: string]: string;
}

export interface SerializedEntitlement {
  id: string;
  name: string;
  type: "permission" | "role";
  resource: string;
  action: string;
  risk_score: number;
}

export interface SerializedAgent {
  id: string;
  external_id: string;
  name: string;
  display_name: string;
  archetype: Archetype;
  archetype_label: string;
  status: AgentStatus;
  agent_type: "autonomous";
  provider: "synthetic";
  infrastructure: "agentforge";
  created_at: string;
  updated_at: string;
  last_active_at: string;
  metadata: AgentMetadata;
  iam: {
    entitlements: SerializedEntitlement[];
    roles: string[];
    permissions_count: number;
  };
  governance: {
    classification: "internal";
    data_access: string[];
    compliance_tags: string[];
  };
  endpoints: {
    self: string;
    entitlements: string;
  };
  _links: {
    self: { href: string };
  };
}

export interface AgentListResponse {
  schema_version: string;
  platform: string;
  generated_at: string;
  pagination: {
    page: number;
    limit: number;
    total: number;
    has_more: boolean;
  };
  agents: SerializedAgent[];
}

export interface AgentDetailResponse {
  schema_version: string;
  platform: string;
  generated_at: string;
  agent: SerializedAgent;
}

export interface CreateAgentInput {
  name: string;
  archetype: Archetype;
  metadata: AgentMetadata;
  entitlements: string[];
}

export interface ListAgentsQuery {
  page: number;
  limit: number;
  status?: AgentStatus;
  archetype?: Archetype;
}
