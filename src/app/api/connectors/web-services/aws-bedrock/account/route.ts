import { NextRequest } from "next/server";

import { handleGetProvisionAccountRequest } from "@/lib/api/web-services-provision-route";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  return handleGetProvisionAccountRequest(request, "aws_bedrock");
}
