import { NextResponse } from "next/server";
import { getIscPublicStatus } from "@/lib/isc/config";
import { withRequestIscRuntime } from "@/lib/isc/apply-runtime";

export const runtime = "nodejs";

export async function GET(request: Request) {
  return withRequestIscRuntime(request, undefined, async () =>
    NextResponse.json(getIscPublicStatus()),
  );
}
