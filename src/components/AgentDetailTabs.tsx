"use client";

import Link from "next/link";
import { useState } from "react";

import { CopyButton } from "@/components/CopyButton";
import { SimulateAccessPanel } from "@/components/SimulateAccessPanel";
import type { SerializedAgent } from "@/types/agent";

type TabId = "details" | "access" | "accounts" | "authorize" | "api";

const TABS: { id: TabId; label: string }[] = [
  { id: "details", label: "Details" },
  { id: "access", label: "Access" },
  { id: "accounts", label: "Accounts" },
  { id: "authorize", label: "Authorize" },
  { id: "api", label: "API" },
];

interface AgentDetailTabsProps {
  agent: SerializedAgent;
  entitlementUrl: string;
  pollUrl: string;
}

export function AgentDetailTabs({
  agent,
  entitlementUrl,
  pollUrl,
}: AgentDetailTabsProps) {
  const [activeTab, setActiveTab] = useState<TabId>("details");
  const deployment = agent.deployment;
  const extendedEntitlements = agent.extended_entitlements;
  const linkedAccounts = agent.linked_accounts;

  return (
    <div className="space-y-4">
      <div className="flex gap-1 overflow-x-auto rounded-lg border border-zinc-200 bg-white p-1 dark:border-zinc-700 dark:bg-zinc-950">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`shrink-0 rounded-md px-3 py-2 text-sm font-medium transition ${
              activeTab === tab.id
                ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                : "text-zinc-600 hover:bg-zinc-50 dark:text-zinc-400 dark:hover:bg-zinc-900"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "details" ? (
        <div className="space-y-4">
          <InfoPanel title="Platform details">
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
          </InfoPanel>

          <InfoPanel title="Agent attributes">
            {Object.keys(agent.details).length > 0 ? (
              <dl className="space-y-3 text-sm">
                {Object.entries(agent.details).map(([key, value]) => (
                  <div key={key}>
                    <dt className="text-xs uppercase tracking-wide text-zinc-500">
                      {key}
                    </dt>
                    <dd className="mt-1 break-all text-zinc-900 dark:text-zinc-100">
                      {formatDetailValue(value)}
                    </dd>
                  </div>
                ))}
              </dl>
            ) : (
              <p className="text-sm text-zinc-500">No extended details configured.</p>
            )}
          </InfoPanel>

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
        </div>
      ) : null}

      {activeTab === "access" ? (
        <div className="space-y-4">
          {extendedEntitlements.length > 0 ? (
            <InfoPanel title="Entitlements (ISC-style)">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-zinc-200 text-xs uppercase tracking-wide text-zinc-500 dark:border-zinc-800">
                      <th className="py-2 pr-3 font-medium">Entitlement</th>
                      <th className="py-2 pr-3 font-medium">Attribute</th>
                      <th className="py-2 pr-3 font-medium">Source</th>
                      <th className="py-2 font-medium">Account</th>
                    </tr>
                  </thead>
                  <tbody>
                    {extendedEntitlements.map((item) => (
                      <tr
                        key={item.id}
                        className="border-b border-zinc-100 dark:border-zinc-900"
                      >
                        <td className="py-2 pr-3 font-medium text-zinc-900 dark:text-zinc-100">
                          {item.entitlementName}
                        </td>
                        <td className="py-2 pr-3 text-zinc-600 dark:text-zinc-400">
                          {item.attributeName}
                        </td>
                        <td className="py-2 pr-3 text-zinc-600 dark:text-zinc-400">
                          {item.sourceName}
                        </td>
                        <td className="py-2 text-zinc-600 dark:text-zinc-400">
                          {item.accountName}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </InfoPanel>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2">
            <InfoPanel title="Outbound access">
              <AccessList
                items={agent.iam.outbound_access}
                emptyLabel="No outbound permissions."
              />
            </InfoPanel>
            <InfoPanel title="Inbound access">
              <AccessList
                items={agent.iam.inbound_access}
                emptyLabel="No inbound callers configured."
              />
            </InfoPanel>
          </div>
        </div>
      ) : null}

      {activeTab === "accounts" ? (
        <InfoPanel title="Linked accounts">
          {linkedAccounts.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 text-xs uppercase tracking-wide text-zinc-500 dark:border-zinc-800">
                    <th className="py-2 pr-3 font-medium">Name</th>
                    <th className="py-2 pr-3 font-medium">Status</th>
                    <th className="py-2 pr-3 font-medium">Source</th>
                    <th className="py-2 pr-3 font-medium">Owner</th>
                    <th className="py-2 font-medium">Native identity</th>
                  </tr>
                </thead>
                <tbody>
                  {linkedAccounts.map((account) => (
                    <tr
                      key={account.id}
                      className="border-b border-zinc-100 dark:border-zinc-900"
                    >
                      <td className="py-2 pr-3 font-medium text-zinc-900 dark:text-zinc-100">
                        {account.displayName}
                      </td>
                      <td className="py-2 pr-3">
                        <StatusBadge status={account.status} />
                      </td>
                      <td className="py-2 pr-3 text-zinc-600 dark:text-zinc-400">
                        {account.sourceName}
                      </td>
                      <td className="py-2 pr-3 text-zinc-600 dark:text-zinc-400">
                        {account.accountOwner ?? "—"}
                      </td>
                      <td className="py-2 font-mono text-xs text-zinc-600 dark:text-zinc-400">
                        {account.nativeIdentity}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-zinc-500">No linked accounts configured.</p>
          )}
        </InfoPanel>
      ) : null}

      {activeTab === "authorize" ? (
        <SimulateAccessPanel
          agentId={agent.id}
          agentName={agent.name}
          authorizeUrl={agent.endpoints.authorize}
          outboundPermissions={agent.iam.outbound_access.map((item) => item.name)}
          inboundCallers={agent.iam.inbound_access.map((item) => item.name)}
          status={agent.status}
        />
      ) : null}

      {activeTab === "api" ? (
        <section className="space-y-3 rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
          <p className="text-xs text-zinc-500">
            All platform endpoints are on the{" "}
            <Link href="/setup#endpoints" className="font-medium underline underline-offset-2">
              setup page
            </Link>
            .
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
          <EndpointRow label="Entitlements" value={agent.endpoints.entitlements} />
          <EndpointRow label="Authorize" value={agent.endpoints.authorize} />
          <EndpointRow
            label={`${deployment.provider_label} reference payload`}
            value={agent.endpoints.reference_api}
          />
          <EndpointRow label="Unified list (all platforms)" value={pollUrl} />
        </section>
      ) : null}
    </div>
  );
}

function formatDetailValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "—";
  }

  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  return JSON.stringify(value, null, 2);
}

function StatusBadge({ status }: { status: "Enabled" | "Disabled" }) {
  const enabled = status === "Enabled";

  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
        enabled
          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
          : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
      }`}
    >
      {status}
    </span>
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
        className={`mt-1 text-zinc-900 dark:text-zinc-100 ${mono ? "break-all font-mono text-xs" : ""}`}
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
