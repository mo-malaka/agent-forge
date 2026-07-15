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

function hasCompletedTimestamp(status: IscTaskStatus): boolean {
  const { completed } = status;
  if (completed === true) {
    return true;
  }
  if (typeof completed === "string" && completed.trim().length > 0) {
    return true;
  }
  return false;
}

const TERMINAL_COMPLETION_STATUSES = new Set([
  "SUCCESS",
  "WARNING",
  "ERROR",
  "FAILED",
  "FAILURE",
  "TERMINATED",
  "TEMPERROR",
  "COMPLETED",
  "COMPLETE",
  "SUCCEEDED",
  "DONE",
  "CANCELLED",
  "CANCELED",
]);

export function isTaskComplete(status: IscTaskStatus): boolean {
  if (hasCompletedTimestamp(status)) {
    return true;
  }

  const completion = String(status.completionStatus ?? "").toUpperCase();
  return TERMINAL_COMPLETION_STATUSES.has(completion);
}

export function isTaskSuccessful(status: IscTaskStatus): boolean {
  const completion = String(status.completionStatus ?? "").toUpperCase();
  if (completion === "SUCCESS" || completion === "WARNING") {
    return true;
  }

  if (
    completion === "ERROR" ||
    completion === "FAILED" ||
    completion === "FAILURE" ||
    completion === "TERMINATED" ||
    completion === "TEMPERROR" ||
    completion === "CANCELLED" ||
    completion === "CANCELED"
  ) {
    return false;
  }

  if (hasCompletedTimestamp(status)) {
    return !status.errors?.length;
  }

  return false;
}

export function formatTaskStatus(status: IscTaskStatus): string {
  const completion = status.completionStatus;
  const progress = status.progress;
  const name = status.name;

  if (progress) {
    return String(progress);
  }

  if (completion) {
    return String(completion);
  }

  if (name) {
    return String(name);
  }

  return status.completed ? "completed" : "in progress";
}

export function formatTaskErrors(status: IscTaskStatus): string | null {
  const messages: string[] = [];

  for (const entry of status.errors ?? []) {
    if (typeof entry === "string") {
      messages.push(entry);
    } else if (entry && typeof entry === "object") {
      const record = entry as Record<string, unknown>;
      const text =
        record.message ?? record.error ?? record.detail ?? record.description;
      if (typeof text === "string") {
        messages.push(text);
      } else {
        messages.push(JSON.stringify(entry));
      }
    }
  }

  if (messages.length === 0) {
    return null;
  }

  return messages.slice(0, 3).join(" | ");
}
