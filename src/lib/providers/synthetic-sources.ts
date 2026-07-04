import type { AgentRow } from "@/lib/db/schema";
import { SCHEMA_VERSION } from "@/lib/constants";
import {
  buildLinkedAccountPayload,
  collectExtendedEntitlements,
  getExtendedEntitlements,
  getLinkedAccounts,
  serializeExtendedEntitlementForWebServices,
} from "@/lib/agents/enrichment";
import { findAgents } from "@/lib/db/store";
import { buildDeployment } from "@/lib/providers/deployment";

export const SYNTHETIC_SOURCE_SLUGS = [
  "aws-iam",
  "google-workspace",
  "entra-id",
  "active-directory",
] as const;

export type SyntheticSourceSlug = (typeof SYNTHETIC_SOURCE_SLUGS)[number];

const SOURCE_NAME_BY_SLUG: Record<SyntheticSourceSlug, string> = {
  "aws-iam": "AWS IAM - spciem",
  "google-workspace": "Google Workspace - spciem",
  "entra-id": "Entra ID - spciem",
  "active-directory": "Active Directory",
};

export function resolveSyntheticSourceName(slug: string): string | null {
  if (!(slug in SOURCE_NAME_BY_SLUG)) {
    return null;
  }

  return SOURCE_NAME_BY_SLUG[slug as SyntheticSourceSlug];
}

function matchesSourceName(value: string, sourceName: string): boolean {
  return value.trim().toLowerCase() === sourceName.trim().toLowerCase();
}

export async function listSyntheticSourceAccounts(
  slug: SyntheticSourceSlug,
  baseUrl: string,
) {
  const sourceName = SOURCE_NAME_BY_SLUG[slug];
  const { rows } = await findAgents({ page: 1, limit: 1000 });

  return rows.flatMap((row) =>
    getLinkedAccounts(row)
      .filter((account) => matchesSourceName(account.sourceName, sourceName))
      .map((account) => buildLinkedAccountPayload(row, account, baseUrl)),
  );
}

export async function listSyntheticSourceEntitlements(
  slug: SyntheticSourceSlug,
  platform: string,
) {
  const sourceName = SOURCE_NAME_BY_SLUG[slug];
  const { rows } = await findAgents({ page: 1, limit: 1000 });

  return collectExtendedEntitlements(rows)
    .filter((entitlement) => matchesSourceName(entitlement.sourceName, sourceName))
    .map((entitlement) =>
      serializeExtendedEntitlementForWebServices(entitlement, platform),
    );
}

export function serializeSyntheticAccountList(
  accounts: Awaited<ReturnType<typeof listSyntheticSourceAccounts>>,
  sourceName: string,
) {
  return {
    schema_version: SCHEMA_VERSION,
    source: sourceName,
    generated_at: new Date().toISOString(),
    pagination: {
      page: 1,
      limit: accounts.length || 1,
      total: accounts.length,
      has_more: false,
    },
    accounts,
  };
}

export function serializeSyntheticEntitlementList(
  entitlements: Awaited<ReturnType<typeof listSyntheticSourceEntitlements>>,
  sourceName: string,
) {
  return {
    schema_version: SCHEMA_VERSION,
    source: sourceName,
    generated_at: new Date().toISOString(),
    platform: sourceName,
    access_direction: "all",
    pagination: {
      page: 1,
      limit: entitlements.length || 1,
      total: entitlements.length,
      has_more: false,
    },
    entitlements,
  };
}

export function getHeroAgentRows(rows: AgentRow[]): AgentRow[] {
  return rows.filter((row) => getLinkedAccounts(row).length > 0);
}
