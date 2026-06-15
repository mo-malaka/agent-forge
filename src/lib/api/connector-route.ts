import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";

import { listAgents } from "@/lib/agents/repository";
import { jsonError, jsonValidationError } from "@/lib/api/response";
import type { DeploymentProvider } from "@/lib/providers/profiles";
import { resolveBaseUrl } from "@/lib/url";
import { listAgentsQuerySchema } from "@/lib/validation/agent.schema";

type ConnectorSerializer = (
  rows: Awaited<ReturnType<typeof listAgents>>["rows"],
  pagination: {
    page: number;
    limit: number;
    total: number;
    has_more: boolean;
  },
  baseUrl: string,
) => unknown;

export async function handleConnectorListRequest(
  request: NextRequest,
  deploymentProvider: DeploymentProvider,
  serialize: ConnectorSerializer,
) {
  try {
    const query = listAgentsQuerySchema.parse(
      Object.fromEntries(request.nextUrl.searchParams.entries()),
    );

    const { rows, total } = await listAgents({
      ...query,
      deployment_provider: deploymentProvider,
    });

    const baseUrl = resolveBaseUrl(request.headers);
    const pagination = {
      page: query.page,
      limit: query.limit,
      total,
      has_more: query.page * query.limit < total,
    };

    return NextResponse.json(serialize(rows, pagination, baseUrl));
  } catch (error) {
    if (error instanceof ZodError) {
      return jsonValidationError(error);
    }

    console.error(`GET connector ${deploymentProvider} failed:`, error);
    return jsonError("Failed to list provider agents", 500);
  }
}
