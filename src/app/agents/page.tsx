import Link from "next/link";

import { AgentCard } from "@/components/AgentCard";
import { BulkCreateAgentsForm } from "@/components/BulkCreateAgentsForm";
import { listAgents } from "@/lib/agents/repository";
import { serializeAgent } from "@/lib/agents/serializer";
import { DEFAULT_LIMIT, DEFAULT_PAGE } from "@/lib/constants";
import { getRequestBaseUrl } from "@/lib/url";

export const dynamic = "force-dynamic";

export default async function AgentsPage() {
  const baseUrl = await getRequestBaseUrl();
  const { rows, total } = await listAgents({
    page: DEFAULT_PAGE,
    limit: DEFAULT_LIMIT,
    status: "active",
  });

  const agents = rows.map((row) => serializeAgent(row, baseUrl));

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-6 py-8">
      <section className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
            Agents
          </h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Synthetic AI agents with outbound permissions and inbound callers.
          </p>
        </div>
        <Link
          href="/agents/new"
          className="shrink-0 rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
        >
          New agent
        </Link>
      </section>

      <BulkCreateAgentsForm />

      {agents.length === 0 ? (
        <section className="rounded-lg border border-dashed border-zinc-300 p-10 text-center dark:border-zinc-700">
          <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
            No agents yet
          </h2>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Bulk create demo agents above, or run step 1 from the{" "}
            <Link href="/demo" className="font-medium underline underline-offset-2">
              ISC demo
            </Link>
            .
          </p>
        </section>
      ) : (
        <section className="space-y-4">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            {total} agent{total === 1 ? "" : "s"} active
          </p>
          <div className="grid gap-4">
            {agents.map((agent) => (
              <AgentCard key={agent.id} agent={agent} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
