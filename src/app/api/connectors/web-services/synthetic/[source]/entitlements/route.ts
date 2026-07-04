import { NextRequest } from "next/server";

import { handleSyntheticEntitlementsRequest } from "@/lib/api/synthetic-web-services-route";
import type { SyntheticSourceSlug } from "@/lib/providers/synthetic-sources";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ source: string }>;
}

function asSlug(value: string): SyntheticSourceSlug | null {
  const allowed = new Set([
    "aws-iam",
    "google-workspace",
    "entra-id",
    "active-directory",
  ]);
  return allowed.has(value) ? (value as SyntheticSourceSlug) : null;
}

export async function GET(request: NextRequest, context: RouteContext) {
  const { source } = await context.params;
  const slug = asSlug(source);
  if (!slug) {
    return Response.json({ error: "Unknown synthetic source" }, { status: 404 });
  }

  return handleSyntheticEntitlementsRequest(request, slug);
}
