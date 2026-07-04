import { NextRequest, NextResponse } from "next/server";

import { jsonError } from "@/lib/api/response";
import {
  listSyntheticSourceAccounts,
  listSyntheticSourceEntitlements,
  resolveSyntheticSourceName,
  serializeSyntheticAccountList,
  serializeSyntheticEntitlementList,
  type SyntheticSourceSlug,
} from "@/lib/providers/synthetic-sources";
import { resolveBaseUrl } from "@/lib/url";

export async function handleSyntheticAccountsRequest(
  request: NextRequest,
  slug: SyntheticSourceSlug,
) {
  try {
    const sourceName = resolveSyntheticSourceName(slug);
    if (!sourceName) {
      return jsonError("Unknown synthetic source", 404);
    }

    const baseUrl = resolveBaseUrl(request.headers);
    const accounts = await listSyntheticSourceAccounts(slug, baseUrl);

    return NextResponse.json(serializeSyntheticAccountList(accounts, sourceName));
  } catch (error) {
    console.error(`GET synthetic accounts ${slug} failed:`, error);
    return jsonError("Failed to list synthetic accounts", 500);
  }
}

export async function handleSyntheticEntitlementsRequest(
  request: NextRequest,
  slug: SyntheticSourceSlug,
) {
  try {
    const sourceName = resolveSyntheticSourceName(slug);
    if (!sourceName) {
      return jsonError("Unknown synthetic source", 404);
    }

    const entitlements = await listSyntheticSourceEntitlements(slug, sourceName);

    return NextResponse.json(
      serializeSyntheticEntitlementList(entitlements, sourceName),
    );
  } catch (error) {
    console.error(`GET synthetic entitlements ${slug} failed:`, error);
    return jsonError("Failed to list synthetic entitlements", 500);
  }
}
