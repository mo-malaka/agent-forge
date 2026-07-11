import type { DemoModeId, DemoStepId } from "@/lib/demo/steps";
import { isManualIscUiStep } from "@/lib/demo/steps";

export interface PreflightBlockingCheck {
  id: string;
  status: "pass" | "warn" | "fail";
}

export interface PreflightBlockingResult {
  ready: boolean;
  checks: PreflightBlockingCheck[];
}

/** Whether preflight should disable orchestrator step controls (not manual ISC ack steps). */
export function isPreflightBlockingForStep(
  result: PreflightBlockingResult | null,
  options: {
    step: DemoStepId;
    mode: DemoModeId;
    iscCredentialsReady: boolean;
  },
): boolean {
  if (!result || result.ready) {
    return false;
  }

  if (isManualIscUiStep(options.step)) {
    return false;
  }

  if (options.mode === "full-sync" && options.step === "bulk-create") {
    return false;
  }

  const failures = result.checks.filter((check) => check.status === "fail");
  if (
    options.iscCredentialsReady &&
    failures.length === 1 &&
    failures[0]?.id === "isc_config"
  ) {
    return false;
  }

  return true;
}
