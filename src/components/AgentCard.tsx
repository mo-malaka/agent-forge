import Link from "next/link";

import { CopyButton } from "@/components/CopyButton";
import type { SerializedAgent } from "@/types/agent";

interface AgentCardProps {
  agent: SerializedAgent;
  pollUrl: string;
}

export function AgentCard({ agent, pollUrl }: AgentCardProps) {
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
        <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300">
          {agent.status}
        </span>
      </div>

      <dl className="mt-4 grid gap-2 text-sm text-zinc-600 dark:text-zinc-400 sm:grid-cols-2">
        <div>
          <dt className="text-xs uppercase tracking-wide text-zinc-500">
            Entitlements
          </dt>
          <dd className="mt-1 font-medium text-zinc-900 dark:text-zinc-100">
            {agent.iam.permissions_count}
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
            {pollUrl}
          </code>
          <CopyButton value={pollUrl} label="Copy poll URL" />
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
