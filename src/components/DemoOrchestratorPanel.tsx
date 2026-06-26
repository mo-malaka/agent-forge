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

interface LogEntry {
  id: string;
  step: DemoStepId;
  label: string;
  status: LogStatus;
  message: string;
}

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
  const [logs, setLogs] = useState<LogEntry[]>([]);
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

  function updateLog(id: string, patch: Partial<LogEntry>) {
    setLogs((current) =>
      current.map((entry) => (entry.id === id ? { ...entry, ...patch } : entry)),
    );
  }

  async function runStep(
    mode: DemoModeId,
    step: DemoStepId,
    logId: string,
  ): Promise<void> {
    updateLog(logId, { status: "running", message: "Running..." });

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
      updateLog(logId, {
        status: "waiting",
        message: `Task started (${body.taskId})`,
      });
      await pollTask(body.taskId, (message) => {
        updateLog(logId, { status: "waiting", message });
      });
    }

    if (body.status === "manual") {
      updateLog(logId, {
        status: "manual",
        message: body.message,
      });
      return;
    }

    updateLog(logId, {
      status: "success",
      message: body.message,
    });

    if (step === "bulk-create") {
      router.refresh();
    }
  }

  async function runSingleStep(mode: DemoModeId, step: DemoStepId) {
    setError(null);
    setRunningStep(step);

    const logId = `${step}-${Date.now()}`;
    const entry: LogEntry = {
      id: logId,
      step,
      label: DEMO_STEPS[step].label,
      status: "pending",
      message: "Waiting",
    };
    setLogs((current) => [...current, entry]);

    try {
      await runStep(mode, step, logId);
    } catch (runError) {
      const message =
        runError instanceof Error ? runError.message : "Demo step failed";
      setError(message);
      updateLog(logId, { status: "error", message });
    } finally {
      setRunningStep(null);
    }
  }

  const iscReady = iscStatus?.configured ?? false;

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
            {DEMO_MODES["full-sync"].steps.map((step, index) => (
              <li
                key={step}
                className="flex items-center gap-3 rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
              >
                <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-xs font-semibold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-zinc-900 dark:text-zinc-100">
                    {DEMO_STEPS[step].label}
                  </p>
                  <p className="text-xs text-zinc-500">{DEMO_STEPS[step].description}</p>
                </div>
                <button
                  type="button"
                  onClick={() => void runSingleStep("full-sync", step)}
                  disabled={
                    (step !== "bulk-create" && !iscReady) || runningStep !== null
                  }
                  className="shrink-0 rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {runningStep === step ? "Running..." : "Run"}
                </button>
              </li>
            ))}
          </ol>
        </div>

        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Govern + enforce — run one step at a time
          </h3>
          <ol className="space-y-2">
            {DEMO_MODES["govern-enforce"].steps.map((step, index) => (
              <li
                key={step}
                className="flex items-center gap-3 rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
              >
                <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-xs font-semibold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-zinc-900 dark:text-zinc-100">
                    {DEMO_STEPS[step].label}
                  </p>
                  <p className="text-xs text-zinc-500">{DEMO_STEPS[step].description}</p>
                </div>
                <button
                  type="button"
                  onClick={() => void runSingleStep("govern-enforce", step)}
                  disabled={!iscReady || runningStep !== null}
                  className="shrink-0 rounded-md border border-indigo-300 px-3 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-indigo-800 dark:text-indigo-200 dark:hover:bg-indigo-900"
                >
                  {runningStep === step ? "Running..." : "Run"}
                </button>
              </li>
            ))}
          </ol>
        </div>
      </div>

      {error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      ) : null}

      {logs.length > 0 ? (
        <ol className="space-y-2">
          {logs.map((entry, index) => (
            <li
              key={entry.id}
              className="flex items-start gap-3 rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
            >
              <span
                className={`mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                  entry.status === "success"
                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"
                    : entry.status === "manual"
                      ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200"
                    : entry.status === "error"
                      ? "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200"
                      : entry.status === "running" || entry.status === "waiting"
                        ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200"
                        : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
                }`}
              >
                {index + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-zinc-900 dark:text-zinc-100">
                  {entry.label}
                </p>
                <p className="text-xs text-zinc-500">{entry.message}</p>
              </div>
              <span className="shrink-0 text-xs uppercase tracking-wide text-zinc-400">
                {entry.status}
              </span>
            </li>
          ))}
        </ol>
      ) : null}

      <p className="text-xs text-zinc-500">
        Entitlement aggregations (outbound + inbound) run in ISC under Specific
        Types. API steps poll ISC until each task completes.
      </p>
    </section>
  );
}
