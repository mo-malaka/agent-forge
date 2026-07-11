import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { jsonError, jsonValidationError } from "@/lib/api/response";
import { clearIscTokenCache, getIscAccessToken } from "@/lib/isc/auth";
import { getIscBaseUrl, type IscCredentials } from "@/lib/isc/config";
import {
  getIscCredentialsPublicView,
  updateIscCredentials,
} from "@/lib/isc/settings-store";
import { iscCredentialsUpdateSchema } from "@/lib/validation/isc.schema";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json(getIscCredentialsPublicView());
}

async function verifyCredentials(credentials: IscCredentials) {
  clearIscTokenCache();
  await getIscAccessToken(credentials);
}

export async function PUT(request: Request) {
  try {
    const body = iscCredentialsUpdateSchema.parse(await request.json());
    const current = getIscCredentialsPublicView();

    if (!body.client_secret?.trim() && !current.clientSecretSet) {
      return jsonError("Client secret is required", 400);
    }

    const settings = updateIscCredentials({
      tenant: body.tenant,
      clientId: body.client_id,
      clientSecret: body.client_secret,
      apiVersion: body.api_version,
      domain: body.domain,
    });

    const credentials: IscCredentials = {
      tenant: settings.credentials!.tenant,
      clientId: settings.credentials!.clientId,
      clientSecret: settings.credentials!.clientSecret,
      apiVersion: settings.credentials!.apiVersion,
      domain: settings.credentials!.domain,
    };

    await verifyCredentials(credentials);

    return NextResponse.json({
      ok: true,
      ...getIscCredentialsPublicView(),
      message: `Connected to ${getIscBaseUrl(credentials)}`,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return jsonValidationError(error);
    }

    const message =
      error instanceof Error ? error.message : "Failed to save ISC credentials";
    console.error("PUT /api/isc/credentials failed:", message);
    return jsonError(message, 502);
  }
}
