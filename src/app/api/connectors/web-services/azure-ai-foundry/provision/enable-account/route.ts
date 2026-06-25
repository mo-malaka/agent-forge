import { NextRequest } from "next/server";

import { handleEnableAccountRequest } from "@/lib/api/web-services-provision-route";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  return handleEnableAccountRequest(request, "azure_ai_foundry");
}
