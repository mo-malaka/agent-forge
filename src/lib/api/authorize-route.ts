import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";

import { evaluateAuthorization } from "@/lib/agents/authorization";
import { getAgentById } from "@/lib/agents/repository";
import { jsonError, jsonValidationError } from "@/lib/api/response";
import { PLATFORM_ID, SCHEMA_VERSION } from "@/lib/constants";
import type { AuthorizationResponse } from "@/types/authorization";
import { authorizeRequestSchema } from "@/lib/validation/authorize.schema";

export async function handleAuthorizeRequest(
  request: NextRequest,
  agentId: string,
) {
  try {
    const agent = await getAgentById(agentId);

    if (!agent) {
      return jsonError("Agent not found", 404);
    }

    const body = authorizeRequestSchema.parse(await request.json());
    const result = evaluateAuthorization(agent, body);

    const response: AuthorizationResponse = {
      schema_version: SCHEMA_VERSION,
      platform: PLATFORM_ID,
      generated_at: new Date().toISOString(),
      ...result,
    };

    return NextResponse.json(response, {
      status: result.decision === "allow" ? 200 : 403,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return jsonValidationError(error);
    }

    console.error(`POST /api/agents/${agentId}/authorize failed:`, error);
    return jsonError("Authorization request failed", 500);
  }
}
