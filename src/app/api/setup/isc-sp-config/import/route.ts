import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { jsonError, jsonValidationError } from "@/lib/api/response";
import { importSpConfigPackage } from "@/lib/isc/sp-config-import";
import {
  applyPrivilegeCriteriaGolden,
  loadPrivilegeCriteriaGolden,
} from "@/lib/isc/privilege-criteria";
import { loadPreparedSpConfig } from "@/lib/isc/sp-config-package";
import { resolveBaseUrl } from "@/lib/url";
import {
  iscSpConfigImportAllSchema,
  iscSpConfigImportSchema,
} from "@/lib/validation/setup.schema";

const PLATFORM_BY_SLUG = {
  "aws-bedrock": "aws_bedrock",
  "gcp-vertex": "gcp_vertex",
  "azure-ai-foundry": "azure_ai_foundry",
} as const;

async function maybeApplyPrivilegeClassification(params: {
  payload: {
    apply_privilege_classification?: boolean;
    source_id?: string;
    tenant: string;
    domain?: string;
    personal_access_token: string;
    connector_slug: "aws-bedrock" | "gcp-vertex" | "azure-ai-foundry";
    preview?: boolean;
  };
  importPreview: boolean;
}) {
  if (
    params.importPreview ||
    !params.payload.apply_privilege_classification ||
    !params.payload.source_id
  ) {
    return null;
  }

  const platform = PLATFORM_BY_SLUG[params.payload.connector_slug];
  const golden = await loadPrivilegeCriteriaGolden(platform);
  if (!golden) {
    return {
      skipped: true,
      reason: "Golden privilege classification file not published",
    };
  }

  const applied = await applyPrivilegeCriteriaGolden({
    target: {
      tenant: params.payload.tenant,
      domain: params.payload.domain,
      personalAccessToken: params.payload.personal_access_token,
    },
    sourceId: params.payload.source_id,
    golden,
  });

  return { skipped: false, applied };
}

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

      const privilegeClassification: Record<
        string,
        Awaited<ReturnType<typeof maybeApplyPrivilegeClassification>>
      > = {};

      if (!(payload.preview ?? true) && payload.privilege_source_ids) {
        for (const connectorSlug of slugs) {
          const sourceId = payload.privilege_source_ids[connectorSlug];
          if (!sourceId) {
            continue;
          }

          privilegeClassification[connectorSlug] =
            await maybeApplyPrivilegeClassification({
              payload: {
                tenant: payload.tenant,
                domain: payload.domain,
                personal_access_token: payload.personal_access_token,
                connector_slug: connectorSlug,
                apply_privilege_classification: true,
                source_id: sourceId,
              },
              importPreview: false,
            });
        }
      }

      return NextResponse.json({
        preview: payload.preview ?? true,
        tenant: payload.tenant,
        results,
        privilegeClassification:
          Object.keys(privilegeClassification).length > 0
            ? privilegeClassification
            : undefined,
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

    const privilegeClassification = await maybeApplyPrivilegeClassification({
      payload,
      importPreview: payload.preview ?? true,
    });

    return NextResponse.json({ ...result, privilegeClassification });
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
