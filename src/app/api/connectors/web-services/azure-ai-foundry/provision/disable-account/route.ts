import { NextRequest } from "next/server";

import { handleDisableAccountRequest } from "@/lib/api/web-services-provision-route";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  return handleDisableAccountRequest(request, "azure_ai_foundry");
}
