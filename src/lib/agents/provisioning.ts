import type { AccessDirection } from "@/lib/agents/access";
import {
  getInboundAccess,
  getOutboundAccess,
} from "@/lib/agents/access";
import type { AgentRow } from "@/lib/db/schema";
import { buildDeployment } from "@/lib/providers/deployment";
import type { DeploymentProvider } from "@/lib/providers/profiles";

export type EntitlementAttributeName = "outboundPermissions" | "inboundCallers";

const ATTRIBUTE_TO_DIRECTION: Record<EntitlementAttributeName, AccessDirection> =
  {
    outboundPermissions: "outbound",
    inboundCallers: "inbound",
  };

export interface ProvisioningAccountRef {
  accountId?: string;
  nativeIdentity?: string;
}

export function directionForAttribute(
  attribute: EntitlementAttributeName,
): AccessDirection {
  return ATTRIBUTE_TO_DIRECTION[attribute];
}

export function attributeForDirection(
  direction: AccessDirection,
): EntitlementAttributeName {
  return direction === "outbound" ? "outboundPermissions" : "inboundCallers";
}

export function findAgentForProvisioning(
  agents: AgentRow[],
  ref: ProvisioningAccountRef,
  baseUrl: string,
): AgentRow | null {
  if (ref.accountId) {
    const byId = agents.find((agent) => agent.id === ref.accountId);
    if (byId) {
      return byId;
    }
  }

  if (ref.nativeIdentity) {
    const byNative = agents.find((agent) => {
      const deployment = buildDeployment(agent, baseUrl);
      return deployment.resource_id === ref.nativeIdentity;
    });
    if (byNative) {
      return byNative;
    }
  }

  return null;
}

export function getEntitlementsForAttribute(
  agent: AgentRow,
  attribute: EntitlementAttributeName,
): string[] {
  return attribute === "outboundPermissions"
    ? getOutboundAccess(agent)
    : getInboundAccess(agent);
}

export function setEntitlementsForAttribute(
  agent: AgentRow,
  attribute: EntitlementAttributeName,
  values: string[],
): Pick<AgentRow, "entitlements" | "inboundAccess"> {
  const serialized = JSON.stringify(values);
  if (attribute === "outboundPermissions") {
    return { entitlements: serialized, inboundAccess: agent.inboundAccess };
  }
  return { entitlements: agent.entitlements, inboundAccess: serialized };
}

export function assertProviderMatch(
  agent: AgentRow,
  expectedProvider: DeploymentProvider,
): void {
  if (agent.deploymentProvider !== expectedProvider) {
    throw new ProvisioningError(
      `Agent ${agent.id} belongs to ${agent.deploymentProvider}, not ${expectedProvider}`,
      404,
    );
  }
}

export class ProvisioningError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ProvisioningError";
  }
}
