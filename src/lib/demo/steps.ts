export const DEMO_STEP_IDS = [
  "bulk-create",
  "entitlement-aggregation",
  "entitlement-aggregation-outbound",
  "entitlement-aggregation-inbound",
  "machine-identity-aggregation",
  "account-aggregation",
  "machine-account-mappings",
  "verify",
  "authorize-allow",
  "revoke-entitlement",
  "account-aggregation-refresh",
  "authorize-deny",
] as const;

export type DemoStepId = (typeof DEMO_STEP_IDS)[number];

export type DemoModeId = "full-sync" | "govern-enforce";

export interface DemoStepDefinition {
  id: DemoStepId;
  label: string;
  description: string;
  system: "agentforge" | "isc";
}

export const DEMO_STEPS: Record<DemoStepId, DemoStepDefinition> = {
  "bulk-create": {
    id: "bulk-create",
    label: "Bulk create agents",
    description: "Seed synthetic agents in AgentForge",
    system: "agentforge",
  },
  "entitlement-aggregation": {
    id: "entitlement-aggregation",
    label: "Entitlement aggregation (outbound)",
    description:
      "Sync outbound entitlement catalog via ISC API (requires Group Aggregation HTTP op)",
    system: "isc",
  },
  "entitlement-aggregation-outbound": {
    id: "entitlement-aggregation-outbound",
    label: "Entitlement aggregation (outbound)",
    description:
      "Sync outboundPermissions catalog via ISC API (requires Group Aggregation HTTP op)",
    system: "isc",
  },
  "entitlement-aggregation-inbound": {
    id: "entitlement-aggregation-inbound",
    label: "Entitlement aggregation (inbound)",
    description:
      "Sync inboundCallers catalog — run manually in ISC (Specific Types → inboundCallers)",
    system: "isc",
  },
  "machine-identity-aggregation": {
    id: "machine-identity-aggregation",
    label: "Machine identity aggregation",
    description: "Create AI agents in ISC from AgentForge accounts",
    system: "isc",
  },
  "account-aggregation": {
    id: "account-aggregation",
    label: "Account aggregation",
    description: "Import accounts and link entitlements in ISC",
    system: "isc",
  },
  "machine-account-mappings": {
    id: "machine-account-mappings",
    label: "Machine account mappings",
    description: "Link source accounts to AI agents in ISC",
    system: "isc",
  },
  verify: {
    id: "verify",
    label: "Verify sync",
    description: "List accounts and machine accounts in ISC",
    system: "isc",
  },
  "authorize-allow": {
    id: "authorize-allow",
    label: "Authorize (allow)",
    description: "Assert outbound access is allowed",
    system: "agentforge",
  },
  "revoke-entitlement": {
    id: "revoke-entitlement",
    label: "Revoke entitlement",
    description: "Remove an outbound permission from the agent",
    system: "agentforge",
  },
  "account-aggregation-refresh": {
    id: "account-aggregation-refresh",
    label: "Re-aggregate accounts",
    description: "Unoptimized account aggregation after revoke",
    system: "isc",
  },
  "authorize-deny": {
    id: "authorize-deny",
    label: "Authorize (deny)",
    description: "Assert revoked permission is denied",
    system: "agentforge",
  },
};

export const DEMO_MODES: Record<
  DemoModeId,
  { id: DemoModeId; label: string; description: string; steps: DemoStepId[] }
> = {
  "full-sync": {
    id: "full-sync",
    label: "Full sync",
    description: "Discover agents, entitlements, and machine identity links in ISC",
    steps: [
      "bulk-create",
      "entitlement-aggregation-outbound",
      "entitlement-aggregation-inbound",
      "machine-identity-aggregation",
      "account-aggregation",
      "machine-account-mappings",
      "verify",
    ],
  },
  "govern-enforce": {
    id: "govern-enforce",
    label: "Govern + enforce",
    description: "Allow, revoke, re-sync, and deny via AgentForge authorize API",
    steps: [
      "authorize-allow",
      "revoke-entitlement",
      "account-aggregation-refresh",
      "authorize-deny",
    ],
  },
};

export function getNextStep(
  mode: DemoModeId,
  currentStep: DemoStepId,
): DemoStepId | null {
  const steps = DEMO_MODES[mode].steps;
  const index = steps.indexOf(currentStep);
  if (index === -1 || index >= steps.length - 1) {
    return null;
  }
  return steps[index + 1] ?? null;
}

export function getDemoCatalog() {
  return {
    modes: Object.values(DEMO_MODES),
    steps: DEMO_STEPS,
  };
}
