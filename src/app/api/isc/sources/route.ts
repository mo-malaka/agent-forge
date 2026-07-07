import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { jsonError, jsonValidationError } from "@/lib/api/response";
import { getIscCredentials, getIscPublicStatus } from "@/lib/isc/config";
import {
  readIscSettings,
  updateIscSettings,
} from "@/lib/isc/settings-store";
import { DEPLOYMENT_PROVIDERS } from "@/lib/providers/profiles";
import { iscSourcesUpdateSchema } from "@/lib/validation/isc.schema";

export const runtime = "nodejs";

export async function GET() {
  const settings = readIscSettings();
  const status = getIscPublicStatus();

  return NextResponse.json({
    credentialsConfigured: status.credentialsConfigured,
    tenant: status.tenant,
    sources: settings.sources,
    misSchemas: settings.misSchemas,
    updatedAt: settings.updatedAt,
    platforms: Object.entries(DEPLOYMENT_PROVIDERS).map(([id, profile]) => ({
      provider: id,
      label: profile.label,
      defaultMisSchemaId: profile.misSchemaId,
      sourceId: settings.sources[id as keyof typeof settings.sources] ?? "",
      misSchemaId: settings.misSchemas[id as keyof typeof settings.misSchemas] ?? "",
    })),
  });
}

export async function PUT(request: Request) {
  try {
    if (!getIscCredentials()) {
      return jsonError(
        "ISC credentials are not configured. Set ISC_TENANT, ISC_CLIENT_ID, and ISC_CLIENT_SECRET.",
        503,
      );
    }

    const body = iscSourcesUpdateSchema.parse(await request.json());
    if (!body.sources && !body.mis_schemas) {
      return jsonError("sources or mis_schemas object is required", 400);
    }

    const settings = updateIscSettings({
      sources: body.sources,
      misSchemas: body.mis_schemas,
    });

    return NextResponse.json({
      ok: true,
      sources: settings.sources,
      misSchemas: settings.misSchemas,
      updatedAt: settings.updatedAt,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return jsonValidationError(error);
    }

    console.error("PUT /api/isc/sources failed:", error);
    return jsonError("Failed to save ISC source settings", 500);
  }
}
