import type { PreflightResult } from "@/lib/demo/preflight";
import type { DemoStepId } from "@/lib/demo/steps";

type StepStatusMap = Partial<
  Record<DemoStepId, { status: string; message: string }>
>;

/** Align server preflight with client ISC status and govern step progress. */
export function reconcilePreflightResult(
  result: PreflightResult | null,
  options: {
    iscCredentialsReady: boolean;
    tenant: string | null;
    credentialSource?: "ui" | "env" | "session" | null;
    stepStatus?: StepStatusMap;
  },
): PreflightResult | null {
  if (!result) {
    return null;
  }

  const revokeCompleted =
    options.stepStatus?.["revoke-entitlement"]?.status === "success";

  const checks = result.checks.map((check) => {
    if (
      check.id === "isc_config" &&
      check.status === "fail" &&
      options.iscCredentialsReady
    ) {
      return {
        ...check,
        status: "pass" as const,
        message: `Connected to tenant ${options.tenant ?? "configured"}${
          options.credentialSource === "ui"
            ? " (UI)"
            : options.credentialSource === "session"
              ? " (browser session)"
              : ""
        }`,
      };
    }

    if (
      check.id === "demo_entitlements" &&
      check.status === "fail" &&
      revokeCompleted
    ) {
      return {
        ...check,
        status: "warn" as const,
        message:
          "Entitlements changed after revoke — expected before re-aggregate",
      };
    }

    return check;
  });

  const ready = !checks.some((check) => check.status === "fail");

  return { ...result, checks, ready };
}
