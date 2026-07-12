import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { jsonError, jsonValidationError } from "@/lib/api/response";
import {
  applyPrivilegeCriteriaGolden,
  loadPrivilegeCriteriaGolden,
} from "@/lib/isc/privilege-criteria";
import { iscPrivilegeClassificationApplySchema } from "@/lib/validation/setup.schema";

const PLATFORM_BY_SLUG = {
  "aws-bedrock": "aws_bedrock",
  "gcp-vertex": "gcp_vertex",
  "azure-ai-foundry": "azure_ai_foundry",
} as const;

export async function POST(request: Request) {
  try {
    const payload = iscPrivilegeClassificationApplySchema.parse(
      await request.json(),
    );
    const platform = PLATFORM_BY_SLUG[payload.connector_slug];
    const golden = await loadPrivilegeCriteriaGolden(platform);

    if (!golden) {
      return jsonError(
        `Golden privilege classification for "${payload.connector_slug}" is not published. Maintainer must run scripts/export-privilege-criteria.mjs and commit config/isc/golden/privilege-classification.*.json`,
        404,
      );
    }

    const result = await applyPrivilegeCriteriaGolden({
      target: {
        tenant: payload.tenant,
        domain: payload.domain,
        personalAccessToken: payload.personal_access_token,
      },
      sourceId: payload.source_id,
      golden,
    });

    return NextResponse.json({
      ok: true,
      connector_slug: payload.connector_slug,
      source_id: payload.source_id,
      ...result,
      message:
        "Privilege classification applied. Re-run outboundPermissions and inboundCallers entitlement aggregation in ISC.",
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return jsonValidationError(error);
    }

    const message =
      error instanceof Error
        ? error.message
        : "Failed to apply privilege classification";
    console.error("Privilege classification apply failed:", message);
    return jsonError(message, 502);
  }
}
