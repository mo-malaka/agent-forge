import Link from "next/link";

import { AgentCard } from "@/components/AgentCard";
import { BulkCreateAgentsForm } from "@/components/BulkCreateAgentsForm";
import { CopyButton } from "@/components/CopyButton";
import { listAgents } from "@/lib/agents/repository";
import { serializeAgent } from "@/lib/agents/serializer";
import { DEFAULT_LIMIT, DEFAULT_PAGE } from "@/lib/constants";
import {
  getPollUrl,
  getProviderConnectorEndpoints,
  getRequestBaseUrl,
  getWebServicesAccountEndpoints,
  getWebServicesEntitlementEndpoints,
} from "@/lib/url";

export default async function DashboardPage() {
  const baseUrl = await getRequestBaseUrl();
  const pollUrl = getPollUrl(baseUrl);
  const webServicesEndpoints = getWebServicesAccountEndpoints(baseUrl);
  const entitlementEndpoints = getWebServicesEntitlementEndpoints(baseUrl);
  const referenceEndpoints = getProviderConnectorEndpoints(baseUrl);
  const { rows, total } = await listAgents({
    page: DEFAULT_PAGE,
    limit: DEFAULT_LIMIT,
    status: "active",
  });

  const agents = rows.map((row) => serializeAgent(row, baseUrl));

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-6 py-8">
      <section className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
          Active Synthetic Agents
        </h1>
        <p className="max-w-2xl text-sm text-zinc-600 dark:text-zinc-400">
          Mock agents for SailPoint demos — inbound and outbound access via Web
          Services SaaS. Copy endpoints below or bulk-create agents, then follow
          the{" "}
          <Link
            href="/setup"
            className="font-medium text-zinc-700 underline underline-offset-2 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-100"
          >
            setup guide
          </Link>{" "}
          to demo on AI Agent → Access in ISC.
        </p>
      </section>

      <section className="space-y-3 rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
          Web Services account endpoints
        </p>
        <p className="text-xs text-zinc-500">
          Use root path{" "}
          <code className="rounded bg-white px-1 dark:bg-zinc-950">
            $.accounts[*]
          </code>
          .{" "}
          <Link
            href="/setup"
            className="font-medium text-zinc-700 underline underline-offset-2 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-100"
          >
            SailPoint setup guide
          </Link>{" "}
          for ISC configuration.
        </p>
        {webServicesEndpoints.map((endpoint) => (
          <div
            key={endpoint.slug}
            className="flex items-center justify-between gap-3 rounded-md border border-zinc-200 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-950"
          >
            <div className="min-w-0">
              <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                {endpoint.label}
              </p>
              <code className="block truncate text-sm text-zinc-800 dark:text-zinc-200">
                {endpoint.url}
              </code>
            </div>
            <CopyButton value={endpoint.url} label="Copy" />
          </div>
        ))}
      </section>

      <section className="space-y-3 rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
          Web Services entitlement endpoints
        </p>
        <p className="text-xs text-zinc-500">
          Use root path{" "}
          <code className="rounded bg-white px-1 dark:bg-zinc-950">
            $.entitlements[*]
          </code>
          . Filter with{" "}
          <code className="rounded bg-white px-1 dark:bg-zinc-950">
            ?type=outbound
          </code>{" "}
          or{" "}
          <code className="rounded bg-white px-1 dark:bg-zinc-950">
            ?type=inbound
          </code>{" "}
          for separate ISC group aggregations.
        </p>
        {entitlementEndpoints.map((endpoint) => (
          <div
            key={endpoint.slug}
            className="space-y-2 rounded-md border border-zinc-200 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-950"
          >
            <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
              {endpoint.label}
            </p>
            <div className="flex items-center justify-between gap-3">
              <code className="truncate text-sm text-zinc-800 dark:text-zinc-200">
                {endpoint.url}
              </code>
              <CopyButton value={endpoint.url} label="Copy" />
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              <CopyButton value={endpoint.outboundUrl} label="Copy outbound" />
              <CopyButton value={endpoint.inboundUrl} label="Copy inbound" />
            </div>
          </div>
        ))}
      </section>

      <section className="space-y-3 rounded-lg border border-dashed border-zinc-300 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-900">
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
          Cloud-native reference payloads (optional)
        </p>
        <p className="text-xs text-zinc-500">
          Bedrock / Vertex / Foundry JSON shapes for field-mapping walkthroughs.
        </p>
        {referenceEndpoints.map((endpoint) => (
          <div
            key={endpoint.slug}
            className="flex items-center justify-between gap-3"
          >
            <div className="min-w-0">
              <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                {endpoint.label}
              </p>
              <code className="block truncate text-sm text-zinc-800 dark:text-zinc-200">
                {endpoint.url}
              </code>
            </div>
            <CopyButton value={endpoint.url} label="Copy" />
          </div>
        ))}
        <div className="border-t border-zinc-200 pt-3 dark:border-zinc-700">
          <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
            Unified list (all platforms)
          </p>
          <div className="mt-1 flex items-center justify-between gap-3">
            <code className="truncate text-sm text-zinc-800 dark:text-zinc-200">
              {pollUrl}
            </code>
            <CopyButton value={pollUrl} label="Copy" />
          </div>
        </div>
      </section>

      <BulkCreateAgentsForm />

      {agents.length === 0 ? (
        <section className="rounded-lg border border-dashed border-zinc-300 p-10 text-center dark:border-zinc-700">
          <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
            No synthetic agents yet
          </h2>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Create your first agent and choose which cloud platform it should
            mimic.
          </p>
          <Link
            href="/agents/new"
            className="mt-4 inline-flex rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
          >
            Create Agent
          </Link>
        </section>
      ) : (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              {total} agent{total === 1 ? "" : "s"} active
            </p>
            <Link
              href="/agents/new"
              className="text-sm font-medium text-zinc-900 hover:underline dark:text-zinc-100"
            >
              + New agent
            </Link>
          </div>
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
