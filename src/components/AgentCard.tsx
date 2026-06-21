import Link from "next/link";

import { CopyButton } from "@/components/CopyButton";
import type { SerializedAgent } from "@/types/agent";

const PROVIDER_BADGE_STYLES: Record<string, string> = {
  aws: "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200",
  gcp: "border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-200",
  azure: "border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-900 dark:bg-sky-950 dark:text-sky-200",
};

interface AgentCardProps {
  agent: SerializedAgent;
}

export function AgentCard({ agent }: AgentCardProps) {
  const badgeStyle =
    PROVIDER_BADGE_STYLES[agent.provider] ?? PROVIDER_BADGE_STYLES.aws;

  return (
    <article className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <Link
            href={`/agents/${agent.id}`}
            className="text-lg font-semibold text-zinc-900 hover:underline dark:text-zinc-100"
          >
            {agent.name}
          </Link>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            {agent.archetype_label} ·{" "}
            <span className="font-mono text-xs">{agent.id}</span>
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <span
            className={`rounded-full border px-2.5 py-1 text-xs font-medium ${badgeStyle}`}
          >
            {agent.deployment.provider_label}
          </span>
          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300">
            {agent.status}
          </span>
        </div>
      </div>

      <dl className="mt-4 grid gap-2 text-sm text-zinc-600 dark:text-zinc-400 sm:grid-cols-3">
        <div>
          <dt className="text-xs uppercase tracking-wide text-zinc-500">
            Cloud resource
          </dt>
          <dd className="mt-1 truncate font-mono text-xs text-zinc-900 dark:text-zinc-100">
            {agent.deployment.resource_id}
          </dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-zinc-500">
            Access
          </dt>
          <dd className="mt-1 font-medium text-zinc-900 dark:text-zinc-100">
            {agent.iam.outbound_access.length} out ·{" "}
            {agent.iam.inbound_access.length} in
          </dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-zinc-500">
            Created
          </dt>
          <dd className="mt-1 font-medium text-zinc-900 dark:text-zinc-100">
            {new Date(agent.created_at).toLocaleString()}
          </dd>
        </div>
      </dl>

      <div className="mt-4 space-y-2 rounded-md bg-zinc-50 p-3 dark:bg-zinc-900">
        <div className="flex items-center justify-between gap-3">
          <code className="truncate text-xs text-zinc-700 dark:text-zinc-300">
            {agent.endpoints.web_services}
          </code>
          <CopyButton
            value={agent.endpoints.web_services}
            label="Copy Web Services URL"
          />
        </div>
        <div className="flex items-center justify-between gap-3">
          <code className="truncate text-xs text-zinc-700 dark:text-zinc-300">
            {agent.endpoints.self}
          </code>
          <CopyButton value={agent.endpoints.self} label="Copy agent URL" />
        </div>
      </div>
    </article>
  );
}
