"use client";

import { useCallback, useEffect, useState } from "react";

import type { PreflightCheck, PreflightResult } from "@/lib/demo/preflight";
import type { DemoModeId } from "@/lib/demo/steps";
import type { DeploymentProvider } from "@/lib/providers/profiles";

function statusStyles(status: PreflightCheck["status"]) {
  switch (status) {
    case "pass":
      return "text-emerald-700 dark:text-emerald-300";
    case "warn":
      return "text-amber-700 dark:text-amber-300";
    case "fail":
      return "text-red-700 dark:text-red-300";
  }
}

function statusIcon(status: PreflightCheck["status"]) {
  switch (status) {
    case "pass":
      return "✓";
    case "warn":
      return "!";
    case "fail":
      return "×";
  }
}

interface DemoPreflightPanelProps {
  mode: DemoModeId;
  agentId: string;
  allowPermission: string;
  principal: string;
  deploymentProvider?: DeploymentProvider;
  refreshKey?: number;
  onResultChange?: (result: PreflightResult | null) => void;
}

export function DemoPreflightPanel({
  mode,
  agentId,
  allowPermission,
  principal,
  deploymentProvider,
  refreshKey = 0,
  onResultChange,
}: DemoPreflightPanelProps) {
  const [result, setResult] = useState<PreflightResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadPreflight = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        mode,
        agent_id: agentId,
        allow_permission: allowPermission,
        principal,
      });
      if (deploymentProvider) {
        params.set("deployment_provider", deploymentProvider);
      }
      const response = await fetch(`/api/demo/preflight?${params.toString()}`);
      const body = (await response.json()) as PreflightResult & { error?: string };

      if (!response.ok) {
        throw new Error(body.error ?? "Preflight check failed");
      }

      setResult(body);
      onResultChange?.(body);
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : "Preflight check failed",
      );
      setResult(null);
      onResultChange?.(null);
    } finally {
      setLoading(false);
    }
  }, [mode, agentId, allowPermission, principal, deploymentProvider, onResultChange]);

  useEffect(() => {
    void loadPreflight();
  }, [loadPreflight, refreshKey]);

  return (
    <section className="rounded-md border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-950">
      <div className="flex items-center justify-between gap-3 border-b border-zinc-200 px-3 py-2 dark:border-zinc-700">
        <div>
          <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
            Pre-flight checks
          </h3>
          <p className="text-xs text-zinc-500">
            {loading
              ? "Checking prerequisites..."
              : result?.ready
                ? "Ready to run this phase"
                : "Fix failed checks before running steps"}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadPreflight()}
          disabled={loading}
          className="text-xs text-zinc-500 hover:text-zinc-800 disabled:opacity-50 dark:hover:text-zinc-300"
        >
          Re-check
        </button>
      </div>

      {error ? (
        <p className="px-3 py-2 text-xs text-red-700 dark:text-red-300">{error}</p>
      ) : null}

      {result ? (
        <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {result.checks.map((check) => (
            <li
              key={check.id}
              className="flex items-start gap-2 px-3 py-2 text-xs"
            >
              <span
                className={`mt-0.5 font-semibold ${statusStyles(check.status)}`}
              >
                {statusIcon(check.status)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="font-medium text-zinc-800 dark:text-zinc-200">
                  {check.label}
                </span>
                <span className={`mt-0.5 block ${statusStyles(check.status)}`}>
                  {check.message}
                </span>
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

export function isPreflightBlocking(result: PreflightResult | null): boolean {
  return result !== null && !result.ready;
}
