import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";

import { listAgents } from "@/lib/agents/repository";
import { jsonError, jsonValidationError } from "@/lib/api/response";
import type { DeploymentProvider } from "@/lib/providers/profiles";
import { serializeWebServicesEntitlementList } from "@/lib/providers/web-services-entitlements";
import { webServicesEntitlementsQuerySchema } from "@/lib/validation/agent.schema";

export async function handleWebServicesEntitlementListRequest(
  request: NextRequest,
  deploymentProvider: DeploymentProvider,
) {
  try {
    const query = webServicesEntitlementsQuerySchema.parse(
      Object.fromEntries(request.nextUrl.searchParams.entries()),
    );

    const { rows } = await listAgents({
      page: 1,
      limit: 100,
      deployment_provider: deploymentProvider,
      status: "active",
    });

    return NextResponse.json(
      serializeWebServicesEntitlementList(
        rows,
        {
          page: query.page,
          limit: query.limit,
          total: rows.length,
          has_more: false,
        },
        deploymentProvider,
        query.type,
      ),
    );
  } catch (error) {
    if (error instanceof ZodError) {
      return jsonValidationError(error);
    }

    console.error(`GET web-services entitlements ${deploymentProvider} failed:`, error);
    return jsonError("Failed to list entitlements", 500);
  }
}
