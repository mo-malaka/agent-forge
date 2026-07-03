import { NextResponse } from "next/server";

import { runDemoPreflight } from "@/lib/demo/preflight";
import { demoPreflightQuerySchema } from "@/lib/validation/demo.schema";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = demoPreflightQuerySchema.parse({
      mode: searchParams.get("mode"),
      agent_id: searchParams.get("agent_id") ?? undefined,
      allow_permission: searchParams.get("allow_permission") ?? undefined,
      principal: searchParams.get("principal") ?? undefined,
    });

    const result = await runDemoPreflight(query.mode, {
      agentId: query.agent_id,
      allowPermission: query.allow_permission,
      principal: query.principal,
    });

    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Preflight check failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
