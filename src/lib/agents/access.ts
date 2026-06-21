import type { AgentRow } from "@/lib/db/schema";

export type AccessDirection = "inbound" | "outbound";

export const DEFAULT_INBOUND_CALLERS = [
  "invoke:engineering-team",
  "invoke:service-now-workflow",
  "invoke:slack-bot",
  "invoke:api-gateway",
  "invoke:copilot-studio",
] as const;

export function parseAccessList(value: string | undefined): string[] {
  if (!value) {
    return [];
  }

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

export function getOutboundAccess(row: AgentRow): string[] {
  return parseAccessList(row.entitlements);
}

export function getInboundAccess(row: AgentRow): string[] {
  return parseAccessList(row.inboundAccess);
}

export function slugifyAccessName(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function buildAccessEntitlementId(name: string): string {
  return `ent_${slugifyAccessName(name)}`;
}

export function scoreOutboundAccess(name: string): number {
  const action = name.split(":")[1]?.toLowerCase() ?? "";
  if (action.includes("admin") || action.includes("owner")) {
    return 8;
  }
  if (action.includes("write") || action.includes("delete")) {
    return 6;
  }
  return 3;
}

export function scoreInboundAccess(name: string): number {
  const principal = name.split(":")[1]?.toLowerCase() ?? "";
  if (principal.includes("admin") || principal.includes("all")) {
    return 8;
  }
  if (principal.includes("workflow") || principal.includes("gateway")) {
    return 6;
  }
  return 4;
}

export interface WebServicesAccessEntitlement {
  id: string;
  entitlementId: string;
  name: string;
  displayName: string;
  type: AccessDirection;
  accessDirection: AccessDirection;
  riskScore: number;
  platform: string;
}

function buildCatalogEntry(
  name: string,
  direction: AccessDirection,
  platform: string,
): WebServicesAccessEntitlement {
  const riskScore =
    direction === "outbound"
      ? scoreOutboundAccess(name)
      : scoreInboundAccess(name);
  const id = buildAccessEntitlementId(name);

  return {
    id,
    entitlementId: id,
    name,
    displayName: name,
    type: direction,
    accessDirection: direction,
    riskScore,
    platform,
  };
}

export function collectAccessEntitlements(
  rows: AgentRow[],
  options?: { direction?: AccessDirection; platform?: string },
): WebServicesAccessEntitlement[] {
  const catalog = new Map<string, WebServicesAccessEntitlement>();

  for (const row of rows) {
    const platformLabel = options?.platform;

    const outbound = getOutboundAccess(row);
    const inbound = getInboundAccess(row);

    if (!options?.direction || options.direction === "outbound") {
      for (const name of outbound) {
        const key = `outbound:${name}`;
        if (!catalog.has(key)) {
          catalog.set(
            key,
            buildCatalogEntry(name, "outbound", platformLabel ?? "AgentForge"),
          );
        }
      }
    }

    if (!options?.direction || options.direction === "inbound") {
      for (const name of inbound) {
        const key = `inbound:${name}`;
        if (!catalog.has(key)) {
          catalog.set(
            key,
            buildCatalogEntry(name, "inbound", platformLabel ?? "AgentForge"),
          );
        }
      }
    }
  }

  return [...catalog.values()].sort((left, right) =>
    left.name.localeCompare(right.name),
  );
}

export function pickInboundCallers(count = 2): string[] {
  const shuffled = [...DEFAULT_INBOUND_CALLERS].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}
