import Link from "next/link";
import { notFound } from "next/navigation";

import { CopyButton } from "@/components/CopyButton";
import { DeleteAgentButton } from "@/components/DeleteAgentButton";
import { getAgentById } from "@/lib/agents/repository";
import { serializeAgent } from "@/lib/agents/serializer";
import { getPollUrl } from "@/lib/url";

interface AgentDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function AgentDetailPage({ params }: AgentDetailPageProps) {
  const { id } = await params;
  const row = await getAgentById(id);

  if (!row) {
    notFound();
  }

  const agent = serializeAgent(row);
  const pollUrl = getPollUrl();
  const deployment = agent.deployment;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-6 py-8">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <Link
            href="/"
            className="text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            ← Back to dashboard
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
          Connector endpoints
        </h2>
        <EndpointRow
          label={`${deployment.provider_label} connector`}
          value={agent.endpoints.provider_connector}
        />
        <EndpointRow label="Unified poll (all agents)" value={pollUrl} />
        <EndpointRow label="This agent" value={agent.endpoints.self} />
        <EndpointRow
          label="Entitlements"
          value={agent.endpoints.entitlements}
        />
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

        <InfoPanel title="IAM Entitlements">
          <ul className="space-y-2 text-sm">
            {agent.iam.entitlements.map((entitlement) => (
              <li
                key={entitlement.id}
                className="flex items-center justify-between rounded-md bg-zinc-50 px-3 py-2 dark:bg-zinc-900"
              >
                <span className="font-medium text-zinc-900 dark:text-zinc-100">
                  {entitlement.name}
                </span>
                <span className="text-xs text-zinc-500">
                  risk {entitlement.risk_score}
                </span>
              </li>
            ))}
          </ul>
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
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
      <h2 className="mb-4 text-sm font-medium text-zinc-900 dark:text-zinc-100">
        {title}
      </h2>
      {children}
    </section>
  );
}
