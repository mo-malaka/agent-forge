import type { AccessDirection } from "@/lib/agents/access";

export type AuthorizationDecision = "allow" | "deny";

export interface AuthorizationRequest {
  principal: string;
  direction: AccessDirection;
  action?: string;
  caller?: string;
  resource?: string;
  permission?: string;
}

export interface AuthorizationResult {
  agent_id: string;
  decision: AuthorizationDecision;
  reason: string;
  policy: string;
  direction: AccessDirection;
  principal: string;
  requested: Record<string, string>;
  effective_access: {
    outbound: string[];
    inbound: string[];
  };
  matched_entitlement: string | null;
}

export interface AuthorizationResponse extends AuthorizationResult {
  schema_version: string;
  platform: string;
  generated_at: string;
}
