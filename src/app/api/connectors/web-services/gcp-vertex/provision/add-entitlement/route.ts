import { NextRequest } from "next/server";

import { handleAddEntitlementRequest } from "@/lib/api/web-services-provision-route";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  return handleAddEntitlementRequest(request, "gcp_vertex");
}
