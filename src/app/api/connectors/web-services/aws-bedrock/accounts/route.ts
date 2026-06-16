import { NextRequest } from "next/server";

import { handleWebServicesAccountListRequest } from "@/lib/api/web-services-route";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  return handleWebServicesAccountListRequest(request, "aws_bedrock");
}
