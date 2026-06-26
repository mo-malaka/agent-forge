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

type LogStatus = "pending" | "running" | "waiting" | "success" | "error";

interface LogEntry {
  id: string;
  step: DemoStepId;
  label: string;
  status: LogStatus;
  message: string;
}

interface DemoStepResponse {
  step: DemoStepId;
  status: "completed" | "started";
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

async function pollTask(taskId: string, onTick: (message: string) => void) {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const response = await fetch(`/api/demo/task/${taskId}`);
    const body = (await response.json()) as {
      complete?: boolean;
      successful?: boolean;
      error?: string;
      status?: { completionStatus?: string; progress?: string };
    };

    if (!response.ok) {
      throw new Error(body.error ?? "Failed to poll ISC task");
    }

    const progress = body.status?.progress ?? body.status?.completionStatus;
    onTick(progress ? `Task ${progress}` : `Polling task (${attempt + 1})`);

    if (body.complete) {
      if (!body.successful) {
        throw new Error(
          `ISC task failed: ${body.status?.completionStatus ?? "unknown"}`,
        );
      }
      return;
    }

    await sleep(3000);
  }

  throw new Error("ISC task timed out after 5 minutes");
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
  const [runningMode, setRunningMode] = useState<DemoModeId | null>(null);
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

    updateLog(logId, {
      status: "success",
      message: body.message,
    });

    if (step === "bulk-create") {
      router.refresh();
    }
  }

  async function runMode(mode: DemoModeId) {
    setError(null);
    setRunningMode(mode);

    const steps = [...DEMO_MODES[mode].steps];
    if (mode === "full-sync") {
      const entitlementIndex = steps.indexOf("entitlement-aggregation");
      if (entitlementIndex !== -1) {
        steps.splice(entitlementIndex + 1, 0, "entitlement-aggregation");
      }
    }

    const initialLogs: LogEntry[] = steps.map((step, index) => ({
      id: `${step}-${index}`,
      step,
      label: DEMO_STEPS[step].label,
      status: "pending",
      message: "Waiting",
    }));
    setLogs(initialLogs);

    try {
      for (const entry of initialLogs) {
        await runStep(mode, entry.step, entry.id);
      }
    } catch (runError) {
      const message =
        runError instanceof Error ? runError.message : "Demo run failed";
      setError(message);
      setLogs((current) =>
        current.map((entry) =>
          entry.status === "running" || entry.status === "waiting"
            ? { ...entry, status: "error", message }
            : entry,
        ),
      );
    } finally {
      setRunningMode(null);
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
            disabled={runningMode !== null}
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
            disabled={runningMode !== null}
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
            disabled={runningMode !== null}
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
            disabled={runningMode !== null}
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
            disabled={runningMode !== null}
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
            disabled={runningMode !== null}
            className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
          />
        </label>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => void runMode("full-sync")}
          disabled={!iscReady || runningMode !== null}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {runningMode === "full-sync" ? "Running full sync..." : "Run full sync"}
        </button>
        <button
          type="button"
          onClick={() => void runMode("govern-enforce")}
          disabled={!iscReady || runningMode !== null}
          className="rounded-md border border-indigo-300 bg-white px-4 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-indigo-800 dark:bg-indigo-950 dark:text-indigo-200 dark:hover:bg-indigo-900"
        >
          {runningMode === "govern-enforce"
            ? "Running govern + enforce..."
            : "Run govern + enforce"}
        </button>
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
        Full sync runs entitlement aggregation twice (outbound + inbound). Govern
        + enforce revokes via AgentForge directly, then re-aggregates accounts in
        ISC.
      </p>
    </section>
  );
}
