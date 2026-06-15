import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";

import { createAgent, listAgents } from "@/lib/agents/repository";
import {
  serializeAgentDetail,
  serializeAgentList,
} from "@/lib/agents/serializer";
import { jsonError, jsonValidationError } from "@/lib/api/response";
import { resolveBaseUrl } from "@/lib/url";
import {
  createAgentSchema,
  listAgentsQuerySchema,
} from "@/lib/validation/agent.schema";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const query = listAgentsQuerySchema.parse(
      Object.fromEntries(request.nextUrl.searchParams.entries()),
    );

    const { rows, total } = await listAgents(query);
    const baseUrl = resolveBaseUrl(request.headers);

    return NextResponse.json(
      serializeAgentList(
        rows,
        {
          page: query.page,
          limit: query.limit,
          total,
          has_more: query.page * query.limit < total,
        },
        baseUrl,
      ),
    );
  } catch (error) {
    if (error instanceof ZodError) {
      return jsonValidationError(error);
    }

    console.error("GET /api/agents failed:", error);
    return jsonError("Failed to list agents", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const payload = createAgentSchema.parse(body);
    const created = await createAgent(payload);

    return NextResponse.json(
      serializeAgentDetail(created, resolveBaseUrl(request.headers)),
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof ZodError) {
      return jsonValidationError(error);
    }

    console.error("POST /api/agents failed:", error);
    return jsonError("Failed to create agent", 500);
  }
}
