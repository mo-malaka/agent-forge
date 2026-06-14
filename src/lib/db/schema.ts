export interface AgentRow {
  id: string;
  name: string;
  archetype: string;
  status: string;
  metadata: string;
  entitlements: string;
  createdAt: string;
  updatedAt: string;
  lastActiveAt: string;
}

export type NewAgentRow = AgentRow;
