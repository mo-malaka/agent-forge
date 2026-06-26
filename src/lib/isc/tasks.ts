import { iscRequest } from "@/lib/isc/client";
import type { IscConfig, IscTaskStatus } from "@/lib/isc/types";

export function extractTaskId(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const record = payload as Record<string, unknown>;

  if (typeof record.id === "string") {
    return record.id;
  }

  if (record.task && typeof record.task === "object") {
    const task = record.task as Record<string, unknown>;
    if (typeof task.id === "string") {
      return task.id;
    }
  }

  if (typeof record.taskId === "string") {
    return record.taskId;
  }

  return null;
}

export async function getTaskStatus(
  config: IscConfig,
  taskId: string,
): Promise<IscTaskStatus> {
  return iscRequest<IscTaskStatus>(config, `/task-status/${taskId}`, {
    apiVersion: "beta",
  });
}

export function isTaskComplete(status: IscTaskStatus): boolean {
  if (status.completed === true) {
    return true;
  }

  const completion = String(status.completionStatus ?? "").toUpperCase();
  return completion === "SUCCESS" || completion === "FAILED";
}

export function isTaskSuccessful(status: IscTaskStatus): boolean {
  const completion = String(status.completionStatus ?? "").toUpperCase();
  if (completion === "SUCCESS") {
    return true;
  }

  if (completion === "FAILED") {
    return false;
  }

  return status.completed === true && !status.errors?.length;
}
