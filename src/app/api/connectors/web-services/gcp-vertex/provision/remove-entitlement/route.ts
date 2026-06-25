import { NextRequest } from "next/server";

import { handleRemoveEntitlementRequest } from "@/lib/api/web-services-provision-route";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  return handleRemoveEntitlementRequest(request, "gcp_vertex");
}
