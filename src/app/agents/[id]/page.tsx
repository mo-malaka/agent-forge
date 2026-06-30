import Link from "next/link";
import { notFound } from "next/navigation";

import { AgentDetailTabs } from "@/components/AgentDetailTabs";
import { DeleteAgentButton } from "@/components/DeleteAgentButton";
import { getAgentById } from "@/lib/agents/repository";
import { serializeAgent } from "@/lib/agents/serializer";
import { DEPLOYMENT_PROVIDERS } from "@/lib/providers/profiles";
import { getPollUrl, getRequestBaseUrl, getWebServicesEntitlementUrl } from "@/lib/url";

interface AgentDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function AgentDetailPage({ params }: AgentDetailPageProps) {
  const { id } = await params;
  const row = await getAgentById(id);

  if (!row) {
    notFound();
  }

  const baseUrl = await getRequestBaseUrl();
  const agent = serializeAgent(row, baseUrl);
  const pollUrl = getPollUrl(baseUrl);
  const entitlementUrl = getWebServicesEntitlementUrl(
    DEPLOYMENT_PROVIDERS[agent.deployment.provider].connectorSlug,
    baseUrl,
  );

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-6 py-8">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <Link
            href="/agents"
            className="text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            ← Back to agents
          </Link>
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
            {agent.name}
          </h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            {agent.archetype_label} · {agent.deployment.provider_label} ·{" "}
            <span className="font-mono text-xs">{agent.id}</span>
          </p>
        </div>
        <DeleteAgentButton agentId={agent.id} agentName={agent.name} />
      </div>

      <AgentDetailTabs
        agent={agent}
        entitlementUrl={entitlementUrl}
        pollUrl={pollUrl}
      />
    </div>
  );
}
