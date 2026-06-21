import { NextRequest } from "next/server";

import { handleWebServicesEntitlementListRequest } from "@/lib/api/web-services-entitlements-route";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  return handleWebServicesEntitlementListRequest(request, "aws_bedrock");
}
