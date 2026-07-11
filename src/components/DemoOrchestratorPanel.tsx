"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import {
  DemoPreflightPanel,
  isPreflightBlocking,
} from "@/components/DemoPreflightPanel";
import { IscSourceSettingsPanel } from "@/components/IscSourceSettingsPanel";
import type { PreflightResult } from "@/lib/demo/preflight";
import {
  clearDemoProgress,
  loadDemoProgress,
  saveDemoProgress,
} from "@/lib/demo/progress-storage";

import {
  DEMO_MODES,
  DEMO_STEPS,
  isManualIscUiStep,
  MANUAL_ISC_UI_INSTRUCTIONS,
  type DemoModeId,
  type DemoStepId,
} from "@/lib/demo/steps";
import {
  DEPLOYMENT_PROVIDERS,
  DEPLOYMENT_PROVIDER_VALUES,
  type DeploymentProvider,
} from "@/lib/providers/profiles";

type LogStatus = "pending" | "running" | "waiting" | "success" | "error" | "manual";

interface DemoStepResponse {
  step: DemoStepId;
  status: "completed" | "started" | "manual";
  message: string;
  system: "agentforge" | "isc";
  taskId: string | null;
  result?: unknown;
  nextStep?: DemoStepId | null;
  error?: string;
}

interface IscConfigStatus {
  credentialsConfigured: boolean;
  configured: boolean;
  tenant: string | null;
  domain?: string | null;
  apiBaseUrl?: string | null;
  credentialSource?: "ui" | "env" | null;
  sourceId: string | null;
  sources: Record<DeploymentProvider, string | null>;
  apiVersion: string;
}

const BULK_COUNTS = [5, 10, 20] as const;
type BulkCount = (typeof BULK_COUNTS)[number];

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildStepPayload(
  step: DemoStepId,
  options: {
    deploymentProvider: DeploymentProvider;
    count: BulkCount;
    agentId: string;
    principal: string;
    allowPermission: string;
    revokeEntitlement: string;
  },
): Record<string, unknown> {
  const base = { step };

  switch (step) {
    case "bulk-create":
      return {
        ...base,
        deployment_provider: options.deploymentProvider,
        count: options.count,
      };
    case "machine-identity-aggregation":
      return {
        ...base,
        deployment_provider: options.deploymentProvider,
      };
    case "authorize-allow":
      return {
        ...base,
        agent_id: options.agentId,
        principal: options.principal,
        permission: options.allowPermission,
      };
    case "revoke-entitlement":
      return {
        ...base,
        agent_id: options.agentId,
        entitlement: options.revokeEntitlement,
        deployment_provider: options.deploymentProvider,
        revoke_via: "agentforge",
      };
    case "authorize-deny":
      return {
        ...base,
        agent_id: options.agentId,
        principal: options.principal,
        entitlement: options.revokeEntitlement,
      };
    default:
      return { ...base, deployment_provider: options.deploymentProvider };
  }
}

const TASK_POLL_INTERVAL_MS = 5000;
const TASK_POLL_MAX_ATTEMPTS = 240; // 20 minutes

type StepStatusMap = Partial<
  Record<DemoStepId, { status: LogStatus; message: string }>
>;

function stepStatusStyles(status: LogStatus | undefined) {
  switch (status) {
    case "success":
      return "border-emerald-300 bg-emerald-50/60 dark:border-emerald-900 dark:bg-emerald-950/30";
    case "error":
      return "border-red-300 bg-red-50/60 dark:border-red-900 dark:bg-red-950/30";
    case "manual":
      return "border-amber-300 bg-amber-50/60 dark:border-amber-900 dark:bg-amber-950/30";
    case "running":
    case "waiting":
      return "border-amber-300 bg-amber-50/60 dark:border-amber-900 dark:bg-amber-950/30";
    default:
      return "border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-950";
  }
}

function stepStatusLabel(status: LogStatus | undefined, step: DemoStepId) {
  switch (status) {
    case "success":
      return isManualIscUiStep(step) ? "Confirmed" : "Done";
    case "error":
      return "Failed";
    case "manual":
      return "Pending";
    case "running":
      return "Running";
    case "waiting":
      return "Waiting";
    default:
      return isManualIscUiStep(step) ? "Manual" : null;
  }
}

async function pollTask(taskId: string, onTick: (message: string) => void) {
  for (let attempt = 0; attempt < TASK_POLL_MAX_ATTEMPTS; attempt += 1) {
    const response = await fetch(`/api/demo/task/${taskId}`);
    const body = (await response.json()) as {
      complete?: boolean;
      successful?: boolean;
      label?: string;
      errorDetail?: string | null;
      error?: string;
      status?: {
        completionStatus?: string;
        progress?: string;
        name?: string;
        errors?: unknown[];
      };
    };

    if (!response.ok) {
      throw new Error(body.error ?? "Failed to poll ISC task");
    }

    const elapsedMinutes = Math.floor(((attempt + 1) * TASK_POLL_INTERVAL_MS) / 60000);
    const statusLabel =
      body.label ??
      body.status?.progress ??
      body.status?.completionStatus ??
      "in progress";
    onTick(`Task ${statusLabel} (${elapsedMinutes}m elapsed, id: ${taskId})`);

    if (body.complete) {
      if (!body.successful) {
        const detail =
          body.errorDetail ??
          (Array.isArray(body.status?.errors) && body.status.errors.length > 0
            ? JSON.stringify(body.status.errors[0])
            : null);
        throw new Error(
          detail
            ? `ISC task failed: ${body.status?.completionStatus ?? statusLabel} — ${detail}`
            : `ISC task failed: ${body.status?.completionStatus ?? statusLabel}`,
        );
      }
      return;
    }

    await sleep(TASK_POLL_INTERVAL_MS);
  }

  throw new Error(
    `ISC task timed out after 20 minutes (task ${taskId}). Check Admin → Monitoring → Tasks in ISC — the job may still be running. Re-run full sync when it finishes, or run remaining steps manually.`,
  );
}

export function DemoOrchestratorPanel() {
  const router = useRouter();
  const [iscStatus, setIscStatus] = useState<IscConfigStatus | null>(null);
  const [provider, setProvider] = useState<DeploymentProvider>("aws_bedrock");
  const [count, setCount] = useState<BulkCount>(5);
  const [agentId, setAgentId] = useState("agt_demo_aws_bedrock");
  const [principal, setPrincipal] = useState("demo-user");
  const [allowPermission, setAllowPermission] = useState("S3:Read");
  const [revokeEntitlement, setRevokeEntitlement] = useState("Jira:Admin");
  const [runningStep, setRunningStep] = useState<DemoStepId | null>(null);
  const [stepStatus, setStepStatus] = useState<StepStatusMap>({});
  const [manualAckChecked, setManualAckChecked] = useState<
    Partial<Record<DemoStepId, boolean>>
  >({});
  const [error, setError] = useState<string | null>(null);
  const [activeMode, setActiveMode] = useState<DemoModeId>("full-sync");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [expandedSteps, setExpandedSteps] = useState<
    Partial<Record<DemoStepId, boolean>>
  >({});
  const [progressHydrated, setProgressHydrated] = useState(false);
  const searchParams = useSearchParams();
  const stepRefs = useRef<Partial<Record<DemoStepId, HTMLLIElement | null>>>({});
  const prevStepStatusRef = useRef<StepStatusMap>({});
  const [preflightResult, setPreflightResult] = useState<PreflightResult | null>(
    null,
  );
  const [preflightRefreshKey, setPreflightRefreshKey] = useState(0);
  const [resettingDemo, setResettingDemo] = useState(false);

  const refreshIscStatus = useCallback(() => {
    void fetch("/api/demo/config")
      .then((response) => response.json())
      .then((body: IscConfigStatus) => setIscStatus(body))
      .catch(() =>
        setIscStatus({
          credentialsConfigured: false,
          configured: false,
          tenant: null,
          sourceId: null,
          sources: {
            aws_bedrock: null,
            gcp_vertex: null,
            azure_ai_foundry: null,
          },
          apiVersion: "v2026",
        }),
      );
  }, []);

  useEffect(() => {
    refreshIscStatus();
  }, [refreshIscStatus]);

  useEffect(() => {
    setExpandedSteps({});
  }, [activeMode]);

  useEffect(() => {
    const saved = loadDemoProgress();
    const tabParam = searchParams.get("tab");

    if (saved?.stepStatus && Object.keys(saved.stepStatus).length > 0) {
      setStepStatus(saved.stepStatus as StepStatusMap);
      if (tabParam !== "full-sync" && tabParam !== "govern-enforce") {
        setActiveMode(saved.activeMode);
      }
    }

    if (tabParam === "full-sync" || tabParam === "govern-enforce") {
      setActiveMode(tabParam);
    }

    setProgressHydrated(true);
  }, [searchParams]);

  useEffect(() => {
    if (!progressHydrated) {
      return;
    }
    if (Object.keys(stepStatus).length === 0) {
      return;
    }
    saveDemoProgress({ activeMode, stepStatus });
  }, [stepStatus, activeMode, progressHydrated]);

  function clearProgress() {
    clearDemoProgress();
    setStepStatus({});
    setExpandedSteps({});
    setManualAckChecked({});
    setError(null);
    prevStepStatusRef.current = {};
    scrollReadyRef.current = false;
  }

  async function resetDemoData(scope: "demo-agent" | "full-store" = "demo-agent") {
    setResettingDemo(true);
    setError(null);

    try {
      const response = await fetch("/api/demo/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scope,
          agent_id: agentId,
          remove_bulk_agents: scope === "full-store",
        }),
      });

      const body = (await response.json()) as {
        error?: string;
        agent?: { name: string };
      };

      if (!response.ok) {
        throw new Error(body.error ?? "Demo reset failed");
      }

      clearProgress();
      setPreflightRefreshKey((current) => current + 1);
      router.refresh();

      if (body.agent?.name) {
        setError(null);
      }
    } catch (resetError) {
      setError(
        resetError instanceof Error ? resetError.message : "Demo reset failed",
      );
    } finally {
      setResettingDemo(false);
    }
  }

  const preflightBlocked = isPreflightBlocking(preflightResult);

  function updateStepStatus(
    step: DemoStepId,
    status: LogStatus,
    message: string,
  ) {
    setStepStatus((current) => ({
      ...current,
      [step]: { status, message },
    }));
  }

  async function runStep(
    mode: DemoModeId,
    step: DemoStepId,
    onProgress: (status: LogStatus, message: string) => void,
  ): Promise<void> {
    onProgress("running", "Running...");

    const payload = buildStepPayload(step, {
      deploymentProvider: provider,
      count,
      agentId,
      principal,
      allowPermission,
      revokeEntitlement,
    });

    const response = await fetch(`/api/demo/run?mode=${mode}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const body = (await response.json()) as DemoStepResponse & { error?: string };

    if (!response.ok) {
      throw new Error(body.error ?? `Step ${step} failed`);
    }

    if (body.taskId) {
      onProgress("waiting", `Task started (${body.taskId})`);
      await pollTask(body.taskId, (message) => {
        onProgress("waiting", message);
      });
    }

    if (body.status === "manual") {
      if (isManualIscUiStep(step)) {
        onProgress("success", body.message);
        return;
      }
      onProgress("manual", body.message);
      return;
    }

    onProgress("success", body.message);

    if (step === "bulk-create") {
      router.refresh();
    }

    setPreflightRefreshKey((current) => current + 1);
  }

  async function confirmManualStep(mode: DemoModeId, step: DemoStepId) {
    if (!manualAckChecked[step]) {
      return;
    }
    setManualAckChecked((current) => ({ ...current, [step]: false }));
    await runSingleStep(mode, step);
  }

  async function runSingleStep(mode: DemoModeId, step: DemoStepId) {
    setError(null);
    setRunningStep(step);
    updateStepStatus(step, "running", "Running...");

    try {
      await runStep(mode, step, (status, message) => {
        updateStepStatus(step, status, message);
      });
    } catch (runError) {
      const message =
        runError instanceof Error ? runError.message : "Demo step failed";
      setError(message);
      updateStepStatus(step, "error", message);
    } finally {
      setRunningStep(null);
    }
  }

  const iscCredentialsReady = iscStatus?.credentialsConfigured ?? false;
  const iscReady = iscStatus?.configured ?? false;
  const platformSourceConfigured =
    iscStatus?.sources?.[provider] != null && iscStatus.sources[provider] !== "";

  function getNextIncompleteStep(mode: DemoModeId): DemoStepId | null {
    return (
      DEMO_MODES[mode].steps.find((step) => stepStatus[step]?.status !== "success") ??
      null
    );
  }

  function toggleStepExpanded(step: DemoStepId) {
    setExpandedSteps((current) => ({
      ...current,
      [step]: !(current[step] ?? isStepCollapsedByDefault(step, activeMode)),
    }));
  }

  function isStepCollapsedByDefault(step: DemoStepId, mode: DemoModeId): boolean {
    const status = stepStatus[step]?.status;
    if (runningStep === step) return false;
    if (status === "error" || status === "running" || status === "waiting") {
      return false;
    }
    if (status === "success") return true;
    return getNextIncompleteStep(mode) !== step;
  }

  function isStepExpanded(step: DemoStepId, mode: DemoModeId): boolean {
    if (expandedSteps[step] !== undefined) {
      return expandedSteps[step]!;
    }
    return !isStepCollapsedByDefault(step, mode);
  }

  const scrollReadyRef = useRef(false);

  useEffect(() => {
    if (!progressHydrated) {
      return;
    }
    if (!scrollReadyRef.current) {
      scrollReadyRef.current = true;
      prevStepStatusRef.current = stepStatus;
      return;
    }

    for (const step of DEMO_MODES[activeMode].steps) {
      const was = prevStepStatusRef.current[step]?.status;
      const now = stepStatus[step]?.status;
      if (was !== "success" && now === "success") {
        const next = getNextIncompleteStep(activeMode);
        if (next) {
          requestAnimationFrame(() => {
            stepRefs.current[next]?.scrollIntoView({
              behavior: "smooth",
              block: "nearest",
            });
          });
        }
        break;
      }
    }
    prevStepStatusRef.current = stepStatus;
  }, [stepStatus, activeMode, progressHydrated]);

  function setStepRef(step: DemoStepId, element: HTMLLIElement | null) {
    stepRefs.current[step] = element;
  }

  function renderStepRow(
    mode: DemoModeId,
    step: DemoStepId,
    index: number,
    iscReady: boolean,
    options?: { requiresIsc?: boolean },
  ) {
    const result = stepStatus[step];
    const status = result?.status;
    const isManualIsc = isManualIscUiStep(step);
    const isConfirmed = isManualIsc && status === "success";
    const label = stepStatusLabel(status, step);
    const requiresIsc = options?.requiresIsc ?? true;
    const iscInstruction = MANUAL_ISC_UI_INSTRUCTIONS[step];
    const blockedByPreflight =
      preflightBlocked && !(mode === "full-sync" && step === "bulk-create");
    const stepDisabled =
      (requiresIsc &&
        step !== "bulk-create" &&
        (!iscCredentialsReady || !platformSourceConfigured)) ||
      runningStep !== null ||
      blockedByPreflight;
    const expanded = isStepExpanded(step, mode);
    const isNext = getNextIncompleteStep(mode) === step;

    if (!expanded && status === "success") {
      return (
        <li
          key={step}
          ref={(element) => setStepRef(step, element)}
          className="flex items-center gap-3 rounded-md border border-emerald-200 bg-emerald-50/40 px-3 py-2 text-sm dark:border-emerald-900 dark:bg-emerald-950/20"
        >
          <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-200 text-xs font-semibold text-emerald-900 dark:bg-emerald-900 dark:text-emerald-200">
            ✓
          </span>
          <button
            type="button"
            onClick={() => toggleStepExpanded(step)}
            className="min-w-0 flex-1 text-left"
          >
            <span className="font-medium text-zinc-900 dark:text-zinc-100">
              {DEMO_STEPS[step].label}
            </span>
            {result?.message ? (
              <span className="ml-2 truncate text-xs text-emerald-700 dark:text-emerald-300">
                {result.message}
              </span>
            ) : null}
          </button>
          <button
            type="button"
            onClick={() => void runSingleStep(mode, step)}
            disabled={stepDisabled}
            className="shrink-0 text-xs text-zinc-500 hover:text-zinc-800 disabled:opacity-50 dark:hover:text-zinc-200"
          >
            Run again
          </button>
        </li>
      );
    }

    if (!expanded && isConfirmed) {
      return (
        <li
          key={step}
          ref={(element) => setStepRef(step, element)}
          className="flex items-center gap-3 rounded-md border border-emerald-200 bg-emerald-50/40 px-3 py-2 text-sm dark:border-emerald-900 dark:bg-emerald-950/20"
        >
          <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-200 text-xs font-semibold text-emerald-900 dark:bg-emerald-900 dark:text-emerald-200">
            ✓
          </span>
          <button
            type="button"
            onClick={() => toggleStepExpanded(step)}
            className="min-w-0 flex-1 text-left font-medium text-zinc-900 dark:text-zinc-100"
          >
            {DEMO_STEPS[step].label}
            <span className="ml-2 text-xs font-normal text-emerald-700 dark:text-emerald-300">
              Confirmed
            </span>
          </button>
        </li>
      );
    }

    if (!expanded) {
      return (
        <li
          key={step}
          ref={(element) => setStepRef(step, element)}
          className={`flex items-center gap-3 rounded-md border px-3 py-2 text-sm ${
            isNext
              ? "border-indigo-300 bg-indigo-50/50 ring-2 ring-indigo-200 dark:border-indigo-800 dark:bg-indigo-950/30 dark:ring-indigo-900"
              : "border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-950"
          }`}
        >
          <span
            className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
              isNext
                ? "bg-indigo-200 text-indigo-900 dark:bg-indigo-900 dark:text-indigo-200"
                : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
            }`}
          >
            {index + 1}
          </span>
          <button
            type="button"
            onClick={() => toggleStepExpanded(step)}
            className="min-w-0 flex-1 text-left"
          >
            <span className="font-medium text-zinc-900 dark:text-zinc-100">
              {DEMO_STEPS[step].label}
            </span>
            {isNext ? (
              <span className="ml-2 text-xs font-medium text-indigo-700 dark:text-indigo-300">
                Up next
              </span>
            ) : null}
          </button>
        </li>
      );
    }

    return (
      <li
        key={step}
        ref={(element) => setStepRef(step, element)}
        className={`flex items-start gap-3 rounded-md border px-3 py-2 text-sm ${stepStatusStyles(status)} ${
          isNext ? "ring-2 ring-indigo-300 dark:ring-indigo-800" : ""
        }`}
      >
        <span
          className={`mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
            status === "success"
              ? "bg-emerald-200 text-emerald-900 dark:bg-emerald-900 dark:text-emerald-200"
              : status === "error"
                ? "bg-red-200 text-red-800 dark:bg-red-900 dark:text-red-200"
                : isManualIsc
                  ? "bg-amber-200 text-amber-800 dark:bg-amber-900 dark:text-amber-200"
                  : status === "running" || status === "waiting"
                    ? "bg-amber-200 text-amber-800 dark:bg-amber-900 dark:text-amber-200"
                    : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
          }`}
        >
          {status === "success" ? "✓" : status === "error" ? "!" : index + 1}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="font-medium text-zinc-900 dark:text-zinc-100">
              {DEMO_STEPS[step].label}
            </p>
            {status === "success" || isConfirmed ? (
              <button
                type="button"
                onClick={() => toggleStepExpanded(step)}
                className="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
              >
                Collapse
              </button>
            ) : null}
          </div>
          <p className="text-xs text-zinc-500">{DEMO_STEPS[step].description}</p>
          {isManualIsc && iscInstruction ? (
            <div className="mt-2 rounded border border-amber-200 bg-amber-50 px-2.5 py-2 text-xs text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
              <p className="font-medium">Run this in ISC first</p>
              <p className="mt-0.5">{iscInstruction}</p>
            </div>
          ) : null}
          {result?.message && !isManualIsc ? (
            <p
              className={`mt-1 text-xs ${
                status === "success"
                  ? "text-emerald-700 dark:text-emerald-300"
                  : status === "error"
                    ? "text-red-700 dark:text-red-300"
                    : status === "manual"
                      ? "text-amber-700 dark:text-amber-300"
                      : "text-zinc-600 dark:text-zinc-400"
              }`}
            >
              {result.message}
            </p>
          ) : null}
          {isConfirmed && result?.message ? (
            <p className="mt-1 text-xs text-emerald-700 dark:text-emerald-300">
              {result.message}
            </p>
          ) : null}
          {isManualIsc && !isConfirmed ? (
            <label className="mt-2 flex cursor-pointer items-start gap-2 text-xs text-zinc-700 dark:text-zinc-300">
              <input
                type="checkbox"
                checked={manualAckChecked[step] ?? false}
                disabled={stepDisabled}
                onChange={(event) =>
                  setManualAckChecked((current) => ({
                    ...current,
                    [step]: event.target.checked,
                  }))
                }
                className="mt-0.5 h-3.5 w-3.5 rounded border-zinc-300"
              />
              <span>
                I ran this aggregation in ISC and it completed successfully
              </span>
            </label>
          ) : null}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          {label ? (
            <span
              className={`text-xs font-medium uppercase tracking-wide ${
                status === "success"
                  ? "text-emerald-700 dark:text-emerald-300"
                  : status === "error"
                    ? "text-red-700 dark:text-red-300"
                    : "text-amber-700 dark:text-amber-300"
              }`}
            >
              {label}
            </span>
          ) : null}
          {isManualIsc ? (
            isConfirmed ? (
              <button
                type="button"
                onClick={() => {
                  setManualAckChecked((current) => ({ ...current, [step]: false }));
                  updateStepStatus(step, "pending", "");
                }}
                disabled={stepDisabled}
                className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
              >
                Reset confirmation
              </button>
            ) : (
              <button
                type="button"
                onClick={() => void confirmManualStep(mode, step)}
                disabled={stepDisabled || !(manualAckChecked[step] ?? false)}
                className="rounded-md border border-amber-400 bg-amber-100 px-3 py-1.5 text-xs font-medium text-amber-900 hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-50 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200 dark:hover:bg-amber-900"
              >
                {runningStep === step ? "Confirming..." : "Confirm completed in ISC"}
              </button>
            )
          ) : (
            <button
              type="button"
              onClick={() => void runSingleStep(mode, step)}
              disabled={stepDisabled}
              className="rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {runningStep === step
                ? "Running..."
                : status === "success"
                  ? "Run again"
                  : "Run"}
            </button>
          )}
        </div>
      </li>
    );
  }

  const activeSteps = DEMO_MODES[activeMode].steps;
  const completedCount = activeSteps.filter(
    (step) => stepStatus[step]?.status === "success",
  ).length;

  return (
    <section className="space-y-4">
      <IscSourceSettingsPanel
        credentialsConfigured={iscCredentialsReady}
        tenant={iscStatus?.tenant ?? null}
        apiBaseUrl={iscStatus?.apiBaseUrl ?? null}
        credentialSource={iscStatus?.credentialSource ?? null}
        onCredentialsChange={refreshIscStatus}
        onSourcesChange={() => {
          refreshIscStatus();
          setPreflightRefreshKey((current) => current + 1);
        }}
      />

      <section className="space-y-4 rounded-lg border border-indigo-200 bg-indigo-50/40 p-5 dark:border-indigo-900 dark:bg-indigo-950/20">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="rounded-md border border-zinc-200 bg-white px-3 py-2 text-xs dark:border-zinc-700 dark:bg-zinc-950">
          {iscStatus ? (
            iscCredentialsReady ? (
              <div className="space-y-1 text-emerald-700 dark:text-emerald-300">
                <p>
                  ISC connected ·{" "}
                  <span className="font-mono">{iscStatus.tenant}</span>
                  {iscStatus.credentialSource ? (
                    <span className="text-zinc-500">
                      {" "}
                      ({iscStatus.credentialSource === "ui" ? "UI" : "env"})
                    </span>
                  ) : null}
                </p>
                {iscStatus.apiBaseUrl ? (
                  <p className="font-mono text-[10px] text-zinc-500">
                    {iscStatus.apiBaseUrl}
                  </p>
                ) : null}
                <p className="text-[11px] text-zinc-600 dark:text-zinc-400">
                  {DEPLOYMENT_PROVIDER_VALUES.map((key) => {
                    const id = iscStatus.sources?.[key];
                    return (
                      <span key={key} className="mr-2">
                        {DEPLOYMENT_PROVIDERS[key].label.split(" ").at(0)}:{" "}
                        {id ? "✓" : "—"}
                      </span>
                    );
                  })}
                </p>
              </div>
            ) : (
              <p className="text-amber-700 dark:text-amber-300">
                ISC not connected — save tenant connection in the panel above
              </p>
            )
          ) : (
            <p className="text-zinc-500">Checking ISC configuration...</p>
          )}
        </div>
        <div className="flex flex-col items-end gap-1">
          <p className="text-xs text-zinc-500">
            {completedCount}/{activeSteps.length} steps complete
          </p>
          <div className="flex flex-wrap justify-end gap-2">
            <button
              type="button"
              onClick={() => void resetDemoData("demo-agent")}
              disabled={runningStep !== null || resettingDemo}
              className="text-xs font-medium text-indigo-700 hover:text-indigo-900 disabled:opacity-50 dark:text-indigo-300 dark:hover:text-indigo-200"
            >
              {resettingDemo ? "Resetting..." : "Reset demo agent"}
            </button>
            {Object.keys(stepStatus).length > 0 ? (
              <button
                type="button"
                onClick={clearProgress}
                disabled={runningStep !== null}
                className="text-xs text-zinc-500 hover:text-zinc-800 disabled:opacity-50 dark:hover:text-zinc-300"
              >
                Clear step progress
              </button>
            ) : null}
          </div>
        </div>
      </div>

      <DemoPreflightPanel
        mode={activeMode}
        agentId={agentId}
        allowPermission={allowPermission}
        principal={principal}
        deploymentProvider={activeMode === "full-sync" ? provider : undefined}
        refreshKey={preflightRefreshKey}
        onResultChange={setPreflightResult}
      />

      <div className="flex gap-1 rounded-lg border border-zinc-200 bg-white p-1 dark:border-zinc-700 dark:bg-zinc-950">
        {(["full-sync", "govern-enforce"] as const).map((mode) => (
          <button
            key={mode}
            type="button"
            onClick={() => {
              setActiveMode(mode);
              router.replace(`/demo?tab=${mode}`, { scroll: false });
            }}
            disabled={runningStep !== null}
            className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition ${
              activeMode === mode
                ? "bg-indigo-600 text-white"
                : "text-zinc-600 hover:bg-zinc-50 dark:text-zinc-400 dark:hover:bg-zinc-900"
            }`}
          >
            {mode === "full-sync" ? "Full sync" : "Govern + enforce"}
          </button>
        ))}
      </div>

      <details
        open={settingsOpen}
        onToggle={(event) =>
          setSettingsOpen((event.target as HTMLDetailsElement).open)
        }
        className="rounded-md border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-950"
      >
        <summary className="cursor-pointer px-3 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Demo settings
        </summary>
        <div className="grid gap-4 border-t border-zinc-200 p-3 sm:grid-cols-2 dark:border-zinc-700">
          {activeMode === "full-sync" ? (
            <>
              <label className="space-y-1 text-sm">
                <span className="text-xs uppercase tracking-wide text-zinc-500">
                  Platform
                </span>
                <select
                  value={provider}
                  onChange={(event) =>
                    setProvider(event.target.value as DeploymentProvider)
                  }
                  disabled={runningStep !== null}
                  className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
                >
                  {DEPLOYMENT_PROVIDER_VALUES.map((value) => (
                    <option key={value} value={value}>
                      {DEPLOYMENT_PROVIDERS[value].label}
                    </option>
                  ))}
                </select>
                {!platformSourceConfigured ? (
                  <p className="text-xs text-amber-700 dark:text-amber-300">
                    Save the {DEPLOYMENT_PROVIDERS[provider].label} source ID
                    under ISC sources above, then click Verify.
                  </p>
                ) : null}
              </label>
              <label className="space-y-1 text-sm">
                <span className="text-xs uppercase tracking-wide text-zinc-500">
                  Bulk count
                </span>
                <select
                  value={count}
                  onChange={(event) =>
                    setCount(Number(event.target.value) as BulkCount)
                  }
                  disabled={runningStep !== null}
                  className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
                >
                  {BULK_COUNTS.map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </label>
            </>
          ) : (
            <>
              <label className="space-y-1 text-sm">
                <span className="text-xs uppercase tracking-wide text-zinc-500">
                  Demo agent ID
                </span>
                <input
                  value={agentId}
                  onChange={(event) => setAgentId(event.target.value)}
                  disabled={runningStep !== null}
                  className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
                />
              </label>
              <label className="space-y-1 text-sm">
                <span className="text-xs uppercase tracking-wide text-zinc-500">
                  Principal
                </span>
                <input
                  value={principal}
                  onChange={(event) => setPrincipal(event.target.value)}
                  disabled={runningStep !== null}
                  className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
                />
              </label>
              <label className="space-y-1 text-sm">
                <span className="text-xs uppercase tracking-wide text-zinc-500">
                  Allow permission
                </span>
                <input
                  value={allowPermission}
                  onChange={(event) => setAllowPermission(event.target.value)}
                  disabled={runningStep !== null}
                  className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
                />
              </label>
              <label className="space-y-1 text-sm">
                <span className="text-xs uppercase tracking-wide text-zinc-500">
                  Revoke entitlement
                </span>
                <input
                  value={revokeEntitlement}
                  onChange={(event) => setRevokeEntitlement(event.target.value)}
                  disabled={runningStep !== null}
                  className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
                />
              </label>
            </>
          )}
        </div>
        {activeMode === "full-sync" ? (
          <p className="border-t border-zinc-200 px-3 py-2 text-xs text-zinc-500 dark:border-zinc-700">
            Full store reset restores all three seed agents and removes bulk-created
            agents.{" "}
            <button
              type="button"
              onClick={() => void resetDemoData("full-store")}
              disabled={runningStep !== null || resettingDemo}
              className="font-medium text-indigo-700 hover:underline disabled:opacity-50 dark:text-indigo-300"
            >
              Reset full store to seed
            </button>
          </p>
        ) : null}
      </details>

      <ol className="space-y-2">
        {activeSteps.map((step, index) =>
          renderStepRow(
            activeMode,
            step,
            index,
            activeMode === "full-sync"
              ? platformSourceConfigured && iscCredentialsReady
              : iscReady,
            {
            requiresIsc: true,
          }),
        )}
      </ol>

      {error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      ) : null}

      {activeMode === "full-sync" ? (
        <p className="text-xs text-zinc-500">
          Steps 2–3 run in the ISC UI — confirm when each aggregation succeeds.
          Other steps call ISC APIs and poll until complete.
        </p>
      ) : null}
      </section>
    </section>
  );
}
