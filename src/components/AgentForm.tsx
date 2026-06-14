"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { EntitlementsEditor } from "@/components/EntitlementsEditor";
import {
  DEFAULT_METADATA_ROWS,
  MetadataEditor,
  metadataRowsToRecord,
} from "@/components/MetadataEditor";
import { ARCHETYPES, type Archetype } from "@/lib/constants";

const ARCHETYPE_DEFAULT_ENTITLEMENTS: Partial<Record<Archetype, string[]>> = {
  code_assistant: ["GitHub:Write", "Jira:Read"],
  devops_bot: ["S3:Read", "EC2:Describe", "Jira:Admin"],
  customer_support: ["Salesforce:Read", "Slack:Write"],
  financial_analyst: ["Salesforce:Read", "S3:Read"],
  security_analyst: ["IAM:Read", "CloudTrail:Read"],
  hr: ["Workday:Read", "Slack:Read"],
};

export function AgentForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [archetype, setArchetype] = useState<Archetype>("devops_bot");
  const [metadataRows, setMetadataRows] = useState(DEFAULT_METADATA_ROWS);
  const [entitlements, setEntitlements] = useState(
    ARCHETYPE_DEFAULT_ENTITLEMENTS.devops_bot ?? [],
  );
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function handleArchetypeChange(nextArchetype: Archetype) {
    setArchetype(nextArchetype);
    if (entitlements.length === 0) {
      setEntitlements(ARCHETYPE_DEFAULT_ENTITLEMENTS[nextArchetype] ?? []);
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const response = await fetch("/api/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          archetype,
          metadata: metadataRowsToRecord(metadataRows),
          entitlements,
        }),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to create agent");
      }

      router.push(`/agents/${payload.agent.id}`);
      router.refresh();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Failed to create agent",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <label
          htmlFor="name"
          className="text-sm font-medium text-zinc-900 dark:text-zinc-100"
        >
          Agent Name
        </label>
        <input
          id="name"
          type="text"
          required
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="e.g. DevOps-Bot-Prod"
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
        />
      </div>

      <div className="space-y-2">
        <label
          htmlFor="archetype"
          className="text-sm font-medium text-zinc-900 dark:text-zinc-100"
        >
          Agent Archetype
        </label>
        <select
          id="archetype"
          value={archetype}
          onChange={(event) =>
            handleArchetypeChange(event.target.value as Archetype)
          }
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
        >
          {Object.entries(ARCHETYPES).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <MetadataEditor rows={metadataRows} onChange={setMetadataRows} />

      <EntitlementsEditor
        entitlements={entitlements}
        onChange={setEntitlements}
      />

      {error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      ) : null}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={submitting || entitlements.length === 0}
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
        >
          {submitting ? "Creating..." : "Create Synthetic Agent"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/")}
          className="text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
