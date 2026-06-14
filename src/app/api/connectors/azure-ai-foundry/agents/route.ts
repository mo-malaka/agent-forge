import { NextRequest } from "next/server";

import { handleConnectorListRequest } from "@/lib/api/connector-route";
import { serializeAzureAiFoundryAgentList } from "@/lib/providers/connector-serializers";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  return handleConnectorListRequest(
    request,
    "azure_ai_foundry",
    serializeAzureAiFoundryAgentList,
  );
}
