import { NextRequest } from "next/server";

import { handleAuthorizeRequest } from "@/lib/api/authorize-route";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  return handleAuthorizeRequest(request, id);
}
