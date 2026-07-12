"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { describeAgentTotals } from "@/lib/demo/settings-storage";
import {
  DEPLOYMENT_PROVIDERS,
  DEPLOYMENT_PROVIDER_VALUES,
  type DeploymentProvider,
} from "@/lib/providers/profiles";

const ADDITIONAL_COUNTS = [0, 5, 10, 20] as const;
type AdditionalCount = (typeof ADDITIONAL_COUNTS)[number];

export function BulkCreateAgentsForm() {
  const router = useRouter();
  const [provider, setProvider] = useState<DeploymentProvider>("aws_bedrock");
  const [count, setCount] = useState<AdditionalCount>(5);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (count === 0) {
      setSuccess(null);
    }
  }, [count]);

  async function handleCreate() {
    if (count === 0) {
      return;
    }

    setError(null);
    setSuccess(null);
    setSubmitting(true);

    try {
      const response = await fetch("/api/agents/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deployment_provider: provider,
          count,
        }),
      });

      const data = (await response.json()) as {
        created_count?: number;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to create agents");
      }

      setSuccess(
        `Added ${data.created_count ?? count} agents on ${DEPLOYMENT_PROVIDERS[provider].label}. ${describeAgentTotals(provider, count)}`,
      );
      router.refresh();
    } catch (createError) {
      setError(
        createError instanceof Error
          ? createError.message
          : "Failed to create agents",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="space-y-4 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
      <div>
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          Additional demo agents
        </h2>
        <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
          The seeded hero is always present. Use this to add more synthetic
          agents on a platform (or use Demo step 1).
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-1.5">
          <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
            Platform
          </span>
          <select
            value={provider}
            onChange={(event) =>
              setProvider(event.target.value as DeploymentProvider)
            }
            disabled={submitting}
            className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
          >
            {DEPLOYMENT_PROVIDER_VALUES.map((value) => (
              <option key={value} value={value}>
                {DEPLOYMENT_PROVIDERS[value].label}
              </option>
            ))}
          </select>
        </label>

        <fieldset className="space-y-1.5">
          <legend className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
            Additional agents (beyond hero)
          </legend>
          <div className="flex flex-wrap gap-2">
            {ADDITIONAL_COUNTS.filter((value) => value > 0).map((value) => {
              const selected = count === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setCount(value)}
                  disabled={submitting}
                  aria-pressed={selected}
                  className={`rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
                    selected
                      ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
                      : "border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
                  }`}
                >
                  +{value}
                </button>
              );
            })}
          </div>
        </fieldset>
      </div>

      <p className="text-xs text-zinc-500">
        {describeAgentTotals(provider, count)}
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handleCreate}
          disabled={submitting || count === 0}
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
        >
          {submitting
            ? "Creating…"
            : `Add ${count} ${DEPLOYMENT_PROVIDERS[provider].label} agents`}
        </button>
        {success ? (
          <p className="text-sm text-emerald-700 dark:text-emerald-400">{success}</p>
        ) : null}
        {error ? (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        ) : null}
      </div>
    </section>
  );
}
