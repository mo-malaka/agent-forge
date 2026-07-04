export interface AgentRow {
  id: string;
  name: string;
  archetype: string;
  deploymentProvider: string;
  deploymentConfig: string;
  status: string;
  metadata: string;
  entitlements: string;
  inboundAccess: string;
  agentDetails: string;
  linkedAccounts: string;
  extendedEntitlements: string;
  createdAt: string;
  updatedAt: string;
  lastActiveAt: string;
}

export type NewAgentRow = AgentRow;
