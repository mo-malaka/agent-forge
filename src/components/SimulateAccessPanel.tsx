"use client";

import { useState } from "react";

import type { AuthorizationResponse } from "@/types/authorization";

interface SimulateAccessPanelProps {
  agentId: string;
  agentName: string;
  authorizeUrl: string;
  outboundPermissions: string[];
  inboundCallers: string[];
  status: "active" | "inactive";
}

export function SimulateAccessPanel({
  agentId,
  agentName,
  authorizeUrl,
  outboundPermissions,
  inboundCallers,
  status,
}: SimulateAccessPanelProps) {
  const [direction, setDirection] = useState<"inbound" | "outbound">(
    "outbound",
  );
  const [principal, setPrincipal] = useState("jane.doe@sailpoint.com");
  const [caller, setCaller] = useState(inboundCallers[0] ?? "invoke:engineering-team");
  const [permission, setPermission] = useState(
    outboundPermissions[0] ?? "S3:Read",
  );
  const [customPermission, setCustomPermission] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AuthorizationResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    const payload =
      direction === "inbound"
        ? {
            principal,
            direction,
            action: "invoke",
            caller,
          }
        : {
            principal,
            direction,
            permission: customPermission.trim() || permission,
          };

    try {
      const response = await fetch(authorizeUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const body = (await response.json()) as AuthorizationResponse & {
        error?: string;
      };

      if (!response.ok && !body.decision) {
        throw new Error(body.error ?? "Authorization request failed");
      }

      setResult(body);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Authorization request failed",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="space-y-4 rounded-lg border border-emerald-200 bg-emerald-50/40 p-5 dark:border-emerald-900 dark:bg-emerald-950/20">
      <div className="space-y-1">
        <h2 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
          Simulate authorization
        </h2>
        <p className="text-xs text-zinc-600 dark:text-zinc-400">
          Assert a principal and access request against {agentName}&apos;s
          effective inbound/outbound lists. Disabled agents always deny.
        </p>
        {status === "inactive" ? (
          <p className="text-xs font-medium text-amber-700 dark:text-amber-300">
            This agent is inactive — all requests will be denied.
          </p>
        ) : null}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-1 text-sm">
            <span className="text-xs uppercase tracking-wide text-zinc-500">
              Direction
            </span>
            <select
              value={direction}
              onChange={(event) =>
                setDirection(event.target.value as "inbound" | "outbound")
              }
              className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
            >
              <option value="outbound">Outbound (agent → resource)</option>
              <option value="inbound">Inbound (caller → agent)</option>
            </select>
          </label>

          <label className="space-y-1 text-sm">
            <span className="text-xs uppercase tracking-wide text-zinc-500">
              Principal
            </span>
            <input
              value={principal}
              onChange={(event) => setPrincipal(event.target.value)}
              className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
              placeholder="jane.doe@sailpoint.com"
            />
          </label>
        </div>

        {direction === "inbound" ? (
          <label className="block space-y-1 text-sm">
            <span className="text-xs uppercase tracking-wide text-zinc-500">
              Caller entitlement
            </span>
            <select
              value={caller}
              onChange={(event) => setCaller(event.target.value)}
              className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
            >
              {inboundCallers.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
              <option value="invoke:unknown-team">invoke:unknown-team</option>
            </select>
          </label>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-1 text-sm">
              <span className="text-xs uppercase tracking-wide text-zinc-500">
                Permission
              </span>
              <select
                value={permission}
                onChange={(event) => setPermission(event.target.value)}
                className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
              >
                {outboundPermissions.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
                <option value="S3:Write">S3:Write</option>
                <option value="Jira:Admin">Jira:Admin</option>
              </select>
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-xs uppercase tracking-wide text-zinc-500">
                Or custom permission
              </span>
              <input
                value={customPermission}
                onChange={(event) => setCustomPermission(event.target.value)}
                className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
                placeholder="DynamoDB:Read"
              />
            </label>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
        >
          {loading ? "Evaluating..." : "Authorize"}
        </button>
      </form>

      {error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      ) : null}

      {result ? (
        <div
          className={`rounded-md border px-4 py-3 text-sm ${
            result.decision === "allow"
              ? "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200"
              : "border-red-200 bg-red-50 text-red-900 dark:border-red-900 dark:bg-red-950 dark:text-red-200"
          }`}
        >
          <p className="font-semibold uppercase tracking-wide">
            {result.decision}
          </p>
          <p className="mt-1">{result.reason}</p>
          <dl className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
            <div>
              <dt className="text-zinc-500">Policy</dt>
              <dd className="font-mono">{result.policy}</dd>
            </div>
            <div>
              <dt className="text-zinc-500">Matched entitlement</dt>
              <dd className="font-mono">
                {result.matched_entitlement ?? "none"}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-zinc-500">Agent</dt>
              <dd className="font-mono">{agentId}</dd>
            </div>
          </dl>
        </div>
      ) : null}

      <code className="block truncate text-xs text-zinc-500">{authorizeUrl}</code>
    </section>
  );
}
