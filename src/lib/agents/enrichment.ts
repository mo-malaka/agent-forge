import type { AgentRow } from "@/lib/db/schema";
import {
  scoreInboundAccess,
  scoreOutboundAccess,
} from "@/lib/agents/access";
import { buildDeployment } from "@/lib/providers/deployment";

export type PrivilegeLevel = "high" | "medium" | "low";

export interface LinkedAccount {
  id: string;
  name: string;
  displayName: string;
  nativeIdentity: string;
  sourceName: string;
  status: "Enabled" | "Disabled";
  accountOwner?: string;
}

export interface ExtendedEntitlement {
  id: string;
  entitlementName: string;
  displayName: string;
  attributeName: string;
  attributeValue: string;
  sourceName: string;
  accountName: string;
  accessDirection: "outbound" | "inbound";
  riskScore?: number;
  privilegeLevel?: PrivilegeLevel;
}

export type AgentDetails = Record<string, unknown>;

function parseJsonArray<T>(value: string | undefined): T[] {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

function parseJsonObject(value: string | undefined): AgentDetails {
  if (!value) {
    return {};
  }

  try {
    const parsed = JSON.parse(value) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }
    return parsed as AgentDetails;
  } catch {
    return {};
  }
}

export function getLinkedAccounts(row: AgentRow): LinkedAccount[] {
  return parseJsonArray<LinkedAccount>(row.linkedAccounts);
}

export function getExtendedEntitlements(row: AgentRow): ExtendedEntitlement[] {
  return parseJsonArray<ExtendedEntitlement>(row.extendedEntitlements);
}

export function getAgentDetails(row: AgentRow): AgentDetails {
  return parseJsonObject(row.agentDetails);
}

export function collectExtendedEntitlements(
  rows: AgentRow[],
): ExtendedEntitlement[] {
  const catalog = new Map<string, ExtendedEntitlement>();

  for (const row of rows) {
    for (const entitlement of getExtendedEntitlements(row)) {
      catalog.set(entitlement.id, entitlement);
    }
  }

  return [...catalog.values()].sort((left, right) =>
    left.entitlementName.localeCompare(right.entitlementName),
  );
}

function resolveEntitlementRiskScore(entitlement: ExtendedEntitlement): number {
  if (entitlement.riskScore !== undefined) {
    return entitlement.riskScore;
  }

  return entitlement.accessDirection === "inbound"
    ? scoreInboundAccess(entitlement.entitlementName)
    : scoreOutboundAccess(entitlement.entitlementName);
}

export function serializeExtendedEntitlementForWebServices(
  entitlement: ExtendedEntitlement,
  platform: string,
) {
  return {
    id: entitlement.id,
    entitlementId: entitlement.id,
    name: entitlement.entitlementName,
    displayName: entitlement.displayName,
    value: entitlement.attributeValue,
    attributeName: entitlement.attributeName,
    attributeValue: entitlement.attributeValue,
    sourceName: entitlement.sourceName,
    accountName: entitlement.accountName,
    type: entitlement.accessDirection,
    accessDirection: entitlement.accessDirection,
    platform,
    riskScore: resolveEntitlementRiskScore(entitlement),
    ...(entitlement.privilegeLevel
      ? { privilegeLevel: entitlement.privilegeLevel }
      : {}),
  };
}

export function buildLinkedAccountPayload(
  row: AgentRow,
  linked: LinkedAccount,
  baseUrl: string,
) {
  const deployment = buildDeployment(row, baseUrl);
  const entitlementAttributes = getEntitlementsForLinkedAccount(row, linked);

  return {
    id: linked.id,
    accountId: linked.id,
    name: linked.name,
    displayName: linked.displayName,
    identityName: linked.displayName,
    nativeIdentity: linked.nativeIdentity,
    identity: linked.nativeIdentity,
    backendId: linked.nativeIdentity,
    status: linked.status,
    agentId: row.id,
    machineIdentity: row.name,
    sourceName: linked.sourceName,
    archetype: row.archetype,
    platform: deployment.provider_label,
    accountOwner: linked.accountOwner,
    outboundPermissions: entitlementAttributes.outboundPermissions ?? [],
    inboundCallers: entitlementAttributes.inboundCallers ?? [],
    ...entitlementAttributes,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function getEntitlementsForLinkedAccount(
  row: AgentRow,
  linked: LinkedAccount,
): Record<string, string[]> {
  const attributes = new Map<string, Set<string>>();

  for (const entitlement of getExtendedEntitlements(row)) {
    if (
      entitlement.accountName !== linked.name &&
      entitlement.accountName !== linked.displayName
    ) {
      continue;
    }

    const values = attributes.get(entitlement.attributeName) ?? new Set<string>();
    values.add(entitlement.attributeValue);
    attributes.set(entitlement.attributeName, values);
  }

  return Object.fromEntries(
    [...attributes.entries()].map(([key, values]) => [key, [...values]]),
  );
}
