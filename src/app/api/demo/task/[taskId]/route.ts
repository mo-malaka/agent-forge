import { NextResponse } from "next/server";

import { getIscConfig } from "@/lib/isc/config";
import {
  getTaskStatus,
  isTaskComplete,
  isTaskSuccessful,
  formatTaskStatus,
  formatTaskErrors,
} from "@/lib/isc/tasks";
import { jsonError } from "@/lib/api/response";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ taskId: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const config = getIscConfig();
    if (!config) {
      return jsonError(
        "ISC is not configured. Set ISC_TENANT, ISC_CLIENT_ID, ISC_CLIENT_SECRET, and ISC_SOURCE_ID.",
        503,
      );
    }

    const { taskId } = await context.params;
    const status = await getTaskStatus(config, taskId);

    return NextResponse.json({
      taskId,
      complete: isTaskComplete(status),
      successful: isTaskSuccessful(status),
      label: formatTaskStatus(status),
      errorDetail: formatTaskErrors(status),
      status,
    });
  } catch (error) {
    console.error("GET /api/demo/task/[taskId] failed:", error);
    return jsonError(
      error instanceof Error ? error.message : "Failed to fetch task status",
      500,
    );
  }
}
