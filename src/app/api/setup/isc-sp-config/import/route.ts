import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { jsonError, jsonValidationError } from "@/lib/api/response";
import { importSpConfigPackage } from "@/lib/isc/sp-config-import";
import { loadPreparedSpConfig } from "@/lib/isc/sp-config-package";
import { resolveBaseUrl } from "@/lib/url";
import {
  iscSpConfigImportAllSchema,
  iscSpConfigImportSchema,
} from "@/lib/validation/setup.schema";

export async function POST(request: Request) {
  try {
    const raw = await request.json();
    const baseUrl = resolveBaseUrl(request.headers);

    if (raw?.import_all === true) {
      const payload = iscSpConfigImportAllSchema.parse(raw);
      const slugs = ["aws-bedrock", "gcp-vertex", "azure-ai-foundry"] as const;
      const results = [];

      for (const connectorSlug of slugs) {
        const prepared = await loadPreparedSpConfig(connectorSlug, baseUrl);
        if (!prepared) {
          return jsonError(
            `Golden SP-Config for "${connectorSlug}" is not published.`,
            404,
          );
        }

        const result = await importSpConfigPackage({
          target: {
            tenant: payload.tenant,
            domain: payload.domain,
            personalAccessToken: payload.personal_access_token,
          },
          connectorSlug,
          fileName: prepared.fileName,
          configJson: prepared.body,
          preview: payload.preview ?? true,
        });

        results.push(result);
      }

      return NextResponse.json({
        preview: payload.preview ?? true,
        tenant: payload.tenant,
        results,
      });
    }

    const payload = iscSpConfigImportSchema.parse(raw);
    const prepared = await loadPreparedSpConfig(payload.connector_slug, baseUrl);

    if (!prepared) {
      return jsonError(
        `Golden SP-Config for "${payload.connector_slug}" is not published.`,
        404,
      );
    }

    const result = await importSpConfigPackage({
      target: {
        tenant: payload.tenant,
        domain: payload.domain,
        personalAccessToken: payload.personal_access_token,
      },
      connectorSlug: payload.connector_slug,
      fileName: prepared.fileName,
      configJson: prepared.body,
      preview: payload.preview ?? true,
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ZodError) {
      return jsonValidationError(error);
    }

    const message =
      error instanceof Error ? error.message : "ISC SP-Config import failed";
    console.error("ISC SP-Config import failed:", message);
    return jsonError(message, 502);
  }
}
