import { NextResponse } from "next/server";
import { getIscPublicStatus } from "@/lib/isc/config";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json(getIscPublicStatus());
}
