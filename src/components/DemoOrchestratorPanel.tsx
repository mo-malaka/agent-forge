"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import {
  DEMO_MODES,
  DEMO_STEPS,
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
  configured: boolean;
  tenant: string | null;
  sourceId: string | null;
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
      return { ...base, schemas: ["bedrock-agent"] };
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
      return base;
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

function stepStatusLabel(status: LogStatus | undefined) {
  switch (status) {
    case "success":
      return "Done";
    case "error":
      return "Failed";
    case "manual":
      return "Manual";
    case "running":
      return "Running";
    case "waiting":
      return "Waiting";
    default:
      return null;
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
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetch("/api/demo/config")
      .then((response) => response.json())
      .then((body: IscConfigStatus) => setIscStatus(body))
      .catch(() =>
        setIscStatus({
          configured: false,
          tenant: null,
          sourceId: null,
          apiVersion: "v2026",
        }),
      );
  }, []);

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
      onProgress("manual", body.message);
      return;
    }

    onProgress("success", body.message);

    if (step === "bulk-create") {
      router.refresh();
    }
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

  const iscReady = iscStatus?.configured ?? false;

  function renderStepRow(
    mode: DemoModeId,
    step: DemoStepId,
    index: number,
    iscReady: boolean,
    options?: { requiresIsc?: boolean },
  ) {
    const result = stepStatus[step];
    const status = result?.status;
    const label = stepStatusLabel(status);
    const requiresIsc = options?.requiresIsc ?? true;

    return (
      <li
        key={step}
        className={`flex items-start gap-3 rounded-md border px-3 py-2 text-sm ${stepStatusStyles(status)}`}
      >
        <span
          className={`mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
            status === "success"
              ? "bg-emerald-200 text-emerald-900 dark:bg-emerald-900 dark:text-emerald-200"
              : status === "error"
                ? "bg-red-200 text-red-800 dark:bg-red-900 dark:text-red-200"
                : status === "manual"
                  ? "bg-amber-200 text-amber-800 dark:bg-amber-900 dark:text-amber-200"
                  : status === "running" || status === "waiting"
                    ? "bg-amber-200 text-amber-800 dark:bg-amber-900 dark:text-amber-200"
                    : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
          }`}
        >
          {status === "success" ? "✓" : status === "error" ? "!" : index + 1}
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-medium text-zinc-900 dark:text-zinc-100">
            {DEMO_STEPS[step].label}
          </p>
          <p className="text-xs text-zinc-500">{DEMO_STEPS[step].description}</p>
          {result?.message ? (
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
          <button
            type="button"
            onClick={() => void runSingleStep(mode, step)}
            disabled={
              (requiresIsc && step !== "bulk-create" && !iscReady) ||
              runningStep !== null
            }
            className="rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {runningStep === step
              ? "Running..."
              : status === "success" || status === "manual"
                ? "Run again"
                : "Run"}
          </button>
        </div>
      </li>
    );
  }

  return (
    <section className="space-y-4 rounded-lg border border-indigo-200 bg-indigo-50/40 p-5 dark:border-indigo-900 dark:bg-indigo-950/20">
      <div className="space-y-1">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          ISC demo orchestrator
        </h2>
        <p className="text-xs text-zinc-600 dark:text-zinc-400">
          Run the full AgentForge + ISC demo from one place. No Postman required.
          Bootstrap the Web Services source once in ISC, then use these modes.
        </p>
      </div>

      <div className="rounded-md border border-zinc-200 bg-white px-3 py-2 text-xs dark:border-zinc-700 dark:bg-zinc-950">
        {iscStatus ? (
          iscReady ? (
            <p className="text-emerald-700 dark:text-emerald-300">
              ISC connected — tenant{" "}
              <span className="font-mono">{iscStatus.tenant}</span>, source{" "}
              <span className="font-mono">{iscStatus.sourceId}</span>, API{" "}
              <span className="font-mono">{iscStatus.apiVersion}</span>
            </p>
          ) : (
            <p className="text-amber-700 dark:text-amber-300">
              ISC not configured. Set ISC_TENANT, ISC_CLIENT_ID,
              ISC_CLIENT_SECRET, and ISC_SOURCE_ID in your environment.
            </p>
          )
        ) : (
          <p className="text-zinc-500">Checking ISC configuration...</p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
        </label>

        <label className="space-y-1 text-sm">
          <span className="text-xs uppercase tracking-wide text-zinc-500">
            Bulk count
          </span>
          <select
            value={count}
            onChange={(event) => setCount(Number(event.target.value) as BulkCount)}
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
      </div>

      <div className="space-y-4">
        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Full sync — run one step at a time
          </h3>
          <ol className="space-y-2">
            {DEMO_MODES["full-sync"].steps.map((step, index) =>
              renderStepRow("full-sync", step, index, iscReady, {
                requiresIsc: true,
              }),
            )}
          </ol>
        </div>

        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Govern + enforce — run one step at a time
          </h3>
          <ol className="space-y-2">
            {DEMO_MODES["govern-enforce"].steps.map((step, index) =>
              renderStepRow("govern-enforce", step, index, iscReady),
            )}
          </ol>
        </div>
      </div>

      {error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      ) : null}

      <p className="text-xs text-zinc-500">
        Entitlement aggregations (outbound + inbound) run in ISC under Specific
        Types. API steps poll ISC until each task completes.
      </p>
    </section>
  );
}
