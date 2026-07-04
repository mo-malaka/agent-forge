import type { AgentRow } from "@/lib/db/schema";
import { SCHEMA_VERSION } from "@/lib/constants";
import {
  collectAccessEntitlements,
  type AccessDirection,
} from "@/lib/agents/access";
import {
  collectExtendedEntitlements,
  serializeExtendedEntitlementForWebServices,
} from "@/lib/agents/enrichment";
import { DEPLOYMENT_PROVIDERS } from "@/lib/providers/profiles";

interface Pagination {
  page: number;
  limit: number;
  total: number;
  has_more: boolean;
}

export function serializeWebServicesEntitlementList(
  rows: AgentRow[],
  pagination: Pagination,
  deploymentProvider: keyof typeof DEPLOYMENT_PROVIDERS,
  direction?: AccessDirection,
) {
  const platform = DEPLOYMENT_PROVIDERS[deploymentProvider].label;
  const extendedEntitlements = collectExtendedEntitlements(rows)
    .filter((entitlement) => !direction || entitlement.accessDirection === direction)
    .map((entitlement) =>
      serializeExtendedEntitlementForWebServices(entitlement, platform),
    );

  const simpleEntitlements = collectAccessEntitlements(rows, {
    direction,
    platform,
  });

  const catalog = new Map<string, ReturnType<typeof serializeExtendedEntitlementForWebServices>>();
  for (const entitlement of extendedEntitlements) {
    catalog.set(entitlement.id, entitlement);
  }
  for (const entitlement of simpleEntitlements) {
    if (!catalog.has(entitlement.id)) {
      catalog.set(entitlement.id, {
        ...entitlement,
        attributeName:
          entitlement.accessDirection === "inbound"
            ? "inboundCallers"
            : "outboundPermissions",
        attributeValue: entitlement.value,
        sourceName: `${platform} - spciem`,
        accountName: rows[0]?.name ?? "agent",
      });
    }
  }

  const entitlements = [...catalog.values()].sort((left, right) =>
    left.name.localeCompare(right.name),
  );

  const offset = (pagination.page - 1) * pagination.limit;
  const pageItems = entitlements.slice(offset, offset + pagination.limit);
  const total = entitlements.length;

  return {
    schema_version: SCHEMA_VERSION,
    source: "agentforge_web_services",
    generated_at: new Date().toISOString(),
    platform,
    access_direction: direction ?? "all",
    pagination: {
      page: pagination.page,
      limit: pagination.limit,
      total,
      has_more: pagination.page * pagination.limit < total,
    },
    entitlements: pageItems,
  };
}
