import Link from "next/link";
import { notFound } from "next/navigation";

import { CopyButton } from "@/components/CopyButton";
import { DeleteAgentButton } from "@/components/DeleteAgentButton";
import { SimulateAccessPanel } from "@/components/SimulateAccessPanel";
import { getAgentById } from "@/lib/agents/repository";
import { serializeAgent } from "@/lib/agents/serializer";
import { getPollUrl, getRequestBaseUrl, getWebServicesEntitlementUrl } from "@/lib/url";
import { DEPLOYMENT_PROVIDERS } from "@/lib/providers/profiles";

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
  const deployment = agent.deployment;
  const entitlementUrl = getWebServicesEntitlementUrl(
    DEPLOYMENT_PROVIDERS[deployment.provider].connectorSlug,
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
            {agent.archetype_label} · {deployment.provider_label} ·{" "}
            <span className="font-mono text-xs">{agent.id}</span>
          </p>
        </div>
        <DeleteAgentButton agentId={agent.id} agentName={agent.name} />
      </div>

      <section className="space-y-3 rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
        <h2 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
          Cloud deployment (mocked)
        </h2>
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <DetailItem label="Platform" value={deployment.provider_label} />
          <DetailItem label="Native status" value={deployment.native_status} />
          <DetailItem
            label="Resource ID"
            value={deployment.resource_id}
            mono
            className="sm:col-span-2"
          />
          {deployment.resource_arn ? (
            <DetailItem
              label="ARN"
              value={deployment.resource_arn}
              mono
              className="sm:col-span-2"
            />
          ) : null}
          {deployment.location ? (
            <DetailItem label="Location" value={deployment.location} />
          ) : null}
          {deployment.region ? (
            <DetailItem label="Region" value={deployment.region} />
          ) : null}
        </dl>
      </section>

      <section className="space-y-3 rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
        <h2 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
          Web Services endpoints
        </h2>
        <p className="text-xs text-zinc-500">
          Point your ISC Web Services source account aggregation at the platform
          list URL. Root path: <code>$.accounts[*]</code>. Accounts include{" "}
          <code>outboundPermissions</code> and <code>inboundCallers</code> for
          Identity Graph demos.
        </p>
        <EndpointRow
          label={`${deployment.provider_label} accounts`}
          value={agent.endpoints.web_services}
        />
        <EndpointRow
          label={`${deployment.provider_label} entitlements`}
          value={entitlementUrl}
        />
        <EndpointRow label="This agent" value={agent.endpoints.self} />
        <EndpointRow
          label="Entitlements"
          value={agent.endpoints.entitlements}
        />
        <EndpointRow label="Authorize" value={agent.endpoints.authorize} />
      </section>

      <SimulateAccessPanel
        agentId={agent.id}
        agentName={agent.name}
        authorizeUrl={agent.endpoints.authorize}
        outboundPermissions={agent.iam.outbound_access.map((item) => item.name)}
        inboundCallers={agent.iam.inbound_access.map((item) => item.name)}
        status={agent.status}
      />

      <section className="space-y-3 rounded-lg border border-dashed border-zinc-300 bg-white p-5 dark:border-zinc-700 dark:bg-zinc-950">
        <h2 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
          Cloud-native reference API (optional)
        </h2>
        <EndpointRow
          label={`${deployment.provider_label} reference payload`}
          value={agent.endpoints.reference_api}
        />
        <EndpointRow label="Unified list (all platforms)" value={pollUrl} />
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        <InfoPanel title="Metadata">
          <dl className="space-y-2 text-sm">
            {Object.entries(agent.metadata).map(([key, value]) => (
              <div key={key}>
                <dt className="text-xs uppercase tracking-wide text-zinc-500">
                  {key}
                </dt>
                <dd className="mt-1 text-zinc-900 dark:text-zinc-100">{value}</dd>
              </div>
            ))}
            {Object.keys(agent.metadata).length === 0 ? (
              <p className="text-sm text-zinc-500">No metadata provided.</p>
            ) : null}
          </dl>
        </InfoPanel>

        <InfoPanel title="Outbound access">
          <AccessList items={agent.iam.outbound_access} emptyLabel="No outbound permissions." />
        </InfoPanel>

        <InfoPanel title="Inbound access" className="md:col-span-2">
          <AccessList items={agent.iam.inbound_access} emptyLabel="No inbound callers configured." />
        </InfoPanel>
      </section>
    </div>
  );
}

function EndpointRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md bg-zinc-50 p-3 dark:bg-zinc-900">
      <div className="min-w-0">
        <p className="text-xs uppercase tracking-wide text-zinc-500">{label}</p>
        <code className="mt-1 block truncate text-sm text-zinc-800 dark:text-zinc-200">
          {value}
        </code>
      </div>
      <CopyButton value={value} />
    </div>
  );
}

function DetailItem({
  label,
  value,
  mono = false,
  className = "",
}: {
  label: string;
  value: string;
  mono?: boolean;
  className?: string;
}) {
  return (
    <div className={className}>
      <dt className="text-xs uppercase tracking-wide text-zinc-500">{label}</dt>
      <dd
        className={`mt-1 text-zinc-900 dark:text-zinc-100 ${mono ? "font-mono text-xs break-all" : ""}`}
      >
        {value}
      </dd>
    </div>
  );
}

function InfoPanel({
  title,
  children,
  className = "",
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950 ${className}`}
    >
      <h2 className="mb-4 text-sm font-medium text-zinc-900 dark:text-zinc-100">
        {title}
      </h2>
      {children}
    </section>
  );
}

function AccessList({
  items,
  emptyLabel,
}: {
  items: Array<{ id: string; name: string; risk_score: number }>;
  emptyLabel: string;
}) {
  if (items.length === 0) {
    return <p className="text-sm text-zinc-500">{emptyLabel}</p>;
  }

  return (
    <ul className="space-y-2 text-sm">
      {items.map((item) => (
        <li
          key={item.id}
          className="flex items-center justify-between rounded-md bg-zinc-50 px-3 py-2 dark:bg-zinc-900"
        >
          <span className="font-medium text-zinc-900 dark:text-zinc-100">
            {item.name}
          </span>
          <span className="text-xs text-zinc-500">risk {item.risk_score}</span>
        </li>
      ))}
    </ul>
  );
}
