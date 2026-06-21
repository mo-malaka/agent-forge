import type { Archetype } from "@/lib/constants";
import type { DeploymentProvider } from "@/lib/providers/profiles";
import type { ResolvedDeployment } from "@/lib/providers/deployment";

export type AgentStatus = "active" | "inactive";

export type CloudProvider = "aws" | "gcp" | "azure";

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

export interface SerializedAccessEntitlement {
  id: string;
  name: string;
  direction: "inbound" | "outbound";
  type: "permission" | "role" | "caller";
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
  provider: CloudProvider;
  infrastructure: string;
  deployment: ResolvedDeployment;
  created_at: string;
  updated_at: string;
  last_active_at: string;
  metadata: AgentMetadata;
  iam: {
    outbound_access: SerializedAccessEntitlement[];
    inbound_access: SerializedAccessEntitlement[];
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
    web_services: string;
    reference_api: string;
  };
  _links: {
    self: { href: string };
    web_services: { href: string };
    reference_api: { href: string };
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

export interface DeploymentConfigInput {
  region?: string;
  account_id?: string;
  foundation_model?: string;
  agent_alias?: string;
  project_id?: string;
  location?: string;
  subscription_id?: string;
  resource_group?: string;
  workspace?: string;
}

export interface CreateAgentInput {
  name: string;
  archetype: Archetype;
  deployment_provider: DeploymentProvider;
  deployment_config?: DeploymentConfigInput;
  metadata: AgentMetadata;
  entitlements: string[];
  inbound_access?: string[];
}

export interface ListAgentsQuery {
  page: number;
  limit: number;
  status?: AgentStatus;
  archetype?: Archetype;
  deployment_provider?: DeploymentProvider;
}
