import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";

import { listAgents } from "@/lib/agents/repository";
import { jsonError, jsonValidationError } from "@/lib/api/response";
import type { DeploymentProvider } from "@/lib/providers/profiles";
import { serializeWebServicesAccountList } from "@/lib/providers/web-services-serializers";
import { resolveBaseUrl } from "@/lib/url";
import { listAgentsQuerySchema } from "@/lib/validation/agent.schema";

export async function handleWebServicesAccountListRequest(
  request: NextRequest,
  deploymentProvider: DeploymentProvider,
) {
  try {
    const query = listAgentsQuerySchema.parse(
      Object.fromEntries(request.nextUrl.searchParams.entries()),
    );

    const { rows, total } = await listAgents({
      ...query,
      deployment_provider: deploymentProvider,
      status: query.status ?? "active",
    });

    const baseUrl = resolveBaseUrl(request.headers);
    const pagination = {
      page: query.page,
      limit: query.limit,
      total,
      has_more: query.page * query.limit < total,
    };

    return NextResponse.json(
      serializeWebServicesAccountList(rows, pagination, baseUrl),
    );
  } catch (error) {
    if (error instanceof ZodError) {
      return jsonValidationError(error);
    }

    console.error(`GET web-services ${deploymentProvider} failed:`, error);
    return jsonError("Failed to list accounts", 500);
  }
}
