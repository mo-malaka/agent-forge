import { NextRequest, NextResponse } from "next/server";

import {
  deleteAgent,
  getAgentById,
} from "@/lib/agents/repository";
import { serializeAgentDetail } from "@/lib/agents/serializer";
import { jsonError } from "@/lib/api/response";
import { resolveBaseUrl } from "@/lib/url";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const agent = await getAgentById(id);

    if (!agent) {
      return jsonError("Agent not found", 404);
    }

    return NextResponse.json(
      serializeAgentDetail(agent, resolveBaseUrl(request.headers)),
    );
  } catch (error) {
    console.error("GET /api/agents/[id] failed:", error);
    return jsonError("Failed to fetch agent", 500);
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const deleted = await deleteAgent(id);

    if (!deleted) {
      return jsonError("Agent not found", 404);
    }

    return NextResponse.json({ deleted: true, id });
  } catch (error) {
    console.error("DELETE /api/agents/[id] failed:", error);
    return jsonError("Failed to delete agent", 500);
  }
}
