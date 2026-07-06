import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { jsonError, jsonValidationError } from "@/lib/api/response";
import { verifyIscPlatformSource } from "@/lib/isc/verify-source";
import { iscSourceVerifySchema } from "@/lib/validation/isc.schema";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = iscSourceVerifySchema.parse(await request.json());
    const result = await verifyIscPlatformSource(body.provider, body.source_id);

    return NextResponse.json(result, { status: result.ok ? 200 : 400 });
  } catch (error) {
    if (error instanceof ZodError) {
      return jsonValidationError(error);
    }

    console.error("POST /api/isc/sources/verify failed:", error);
    return jsonError("Failed to verify ISC source", 500);
  }
}
