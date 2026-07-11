import type { DemoModeId, DemoStepId } from "@/lib/demo/steps";
import { isManualIscUiStep } from "@/lib/demo/steps";

export interface PreflightBlockingCheck {
  id: string;
  status: "pass" | "warn" | "fail";
  label?: string;
  message?: string;
}

export interface PreflightBlockingResult {
  ready: boolean;
  checks: PreflightBlockingCheck[];
}

const GOVERN_POST_REVOKE_STEPS: DemoStepId[] = [
  "account-aggregation-refresh",
  "authorize-deny",
];

const PREFLIGHT_IDS_IGNORED_AFTER_REVOKE = new Set([
  "demo_entitlements",
  "authorize_allow_probe",
]);

type StepStatusMap = Partial<
  Record<DemoStepId, { status: string; message: string }>
>;

function ignoredPreflightIdsForStep(
  step: DemoStepId,
  mode: DemoModeId,
): Set<string> {
  const ignored = new Set<string>();

  if (mode === "govern-enforce" && GOVERN_POST_REVOKE_STEPS.includes(step)) {
    for (const id of PREFLIGHT_IDS_IGNORED_AFTER_REVOKE) {
      ignored.add(id);
    }
  }

  return ignored;
}

/** Whether preflight should disable orchestrator step controls (not manual ISC ack steps). */
export function isPreflightBlockingForStep(
  result: PreflightBlockingResult | null,
  options: {
    step: DemoStepId;
    mode: DemoModeId;
    iscCredentialsReady: boolean;
    stepStatus?: StepStatusMap;
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
    failures.every((check) => check.id === "isc_config")
  ) {
    return false;
  }

  const ignoredIds = ignoredPreflightIdsForStep(options.step, options.mode);

  return failures.some((check) => !ignoredIds.has(check.id));
}

export function getStepDisableReason(options: {
  step: DemoStepId;
  mode: DemoModeId;
  iscCredentialsReady: boolean;
  platformSourceConfigured: boolean;
  requiresIsc: boolean;
  runningStep: DemoStepId | null;
  preflightResult: PreflightBlockingResult | null;
  stepStatus?: StepStatusMap;
}): string | null {
  if (options.runningStep !== null) {
    return "Another step is running.";
  }

  if (
    options.requiresIsc &&
    options.step !== "bulk-create" &&
    (!options.iscCredentialsReady || !options.platformSourceConfigured)
  ) {
    if (!options.iscCredentialsReady) {
      return "Save and verify the ISC tenant connection first.";
    }
    return "Save and verify the platform source ID first.";
  }

  if (
    !isPreflightBlockingForStep(options.preflightResult, {
      step: options.step,
      mode: options.mode,
      iscCredentialsReady: options.iscCredentialsReady,
      stepStatus: options.stepStatus,
    })
  ) {
    return null;
  }

  const failures =
    options.preflightResult?.checks.filter(
      (check) => check.status === "fail",
    ) ?? [];
  const ignoredIds = ignoredPreflightIdsForStep(options.step, options.mode);
  const blocking = failures.filter((check) => !ignoredIds.has(check.id));

  if (blocking.length === 0) {
    return null;
  }

  const first = blocking[0];
  return first?.message ?? first?.label ?? "Pre-flight check failed";
}
