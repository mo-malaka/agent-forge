import Link from "next/link";

import type { SerializedAgent } from "@/types/agent";

const PROVIDER_BADGE_STYLES: Record<string, string> = {
  aws: "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200",
  gcp: "border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-200",
  azure: "border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-900 dark:bg-sky-950 dark:text-sky-200",
};

const MAX_CHIPS = 4;

function EntitlementChips({
  items,
  variant,
}: {
  items: Array<{ name: string }>;
  variant: "outbound" | "inbound";
}) {
  if (items.length === 0) {
    return (
      <span className="text-xs text-zinc-400">
        No {variant === "outbound" ? "outbound" : "inbound"}
      </span>
    );
  }

  const visible = items.slice(0, MAX_CHIPS);
  const remaining = items.length - visible.length;
  const chipStyle =
    variant === "outbound"
      ? "border-violet-200 bg-violet-50 text-violet-800 dark:border-violet-900 dark:bg-violet-950 dark:text-violet-200"
      : "border-teal-200 bg-teal-50 text-teal-800 dark:border-teal-900 dark:bg-teal-950 dark:text-teal-200";

  return (
    <div className="flex flex-wrap gap-1.5">
      {visible.map((item) => (
        <span
          key={item.name}
          className={`rounded-full border px-2 py-0.5 text-xs font-medium ${chipStyle}`}
        >
          {item.name}
        </span>
      ))}
      {remaining > 0 ? (
        <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-xs text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400">
          +{remaining}
        </span>
      ) : null}
    </div>
  );
}

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

      <div className="mt-4 space-y-3">
        <div>
          <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-zinc-500">
            Outbound
          </p>
          <EntitlementChips items={agent.iam.outbound_access} variant="outbound" />
        </div>
        <div>
          <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-zinc-500">
            Inbound
          </p>
          <EntitlementChips items={agent.iam.inbound_access} variant="inbound" />
        </div>
      </div>
    </article>
  );
}
