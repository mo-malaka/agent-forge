import Link from "next/link";

import { CopyButton } from "@/components/CopyButton";
import { ConnectorChecklist } from "@/components/ConnectorChecklist";
import {
  getPollUrl,
  getProviderConnectorEndpoints,
  getRequestBaseUrl,
  getSyntheticWebServicesEndpoints,
  getWebServicesAccountEndpoints,
  getWebServicesEntitlementEndpoints,
  getWebServicesProvisionEndpoints,
} from "@/lib/url";

export default async function ConnectorPage() {
  const baseUrl = await getRequestBaseUrl();
  const pollUrl = getPollUrl(baseUrl);
  const webServicesEndpoints = getWebServicesAccountEndpoints(baseUrl);
  const entitlementEndpoints = getWebServicesEntitlementEndpoints(baseUrl);
  const provisionEndpoints = getWebServicesProvisionEndpoints(baseUrl);
  const referenceEndpoints = getProviderConnectorEndpoints(baseUrl);
  const syntheticEndpoints = getSyntheticWebServicesEndpoints(baseUrl);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-6 py-8">
      <section className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
          Connector
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Web Services URLs for your ISC source. See the{" "}
          <Link
            href="/setup"
            className="font-medium underline underline-offset-2 hover:text-zinc-900 dark:hover:text-zinc-100"
          >
            setup guide
          </Link>{" "}
          for full configuration steps.
        </p>
      </section>

      <ConnectorChecklist />

      <section className="space-y-3 rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
          Account endpoints
        </p>
        <p className="text-xs text-zinc-500">
          Root path{" "}
          <code className="rounded bg-white px-1 dark:bg-zinc-950">
            $.accounts[*]
          </code>
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
          Entitlement endpoints
        </p>
        <p className="text-xs text-zinc-500">
          Root path{" "}
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
          </code>
          .
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

      <section className="space-y-3 rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
          Provisioning endpoints
        </p>
        <p className="text-xs text-zinc-500">
          POST JSON with{" "}
          <code className="rounded bg-white px-1 dark:bg-zinc-950">
            nativeIdentity
          </code>{" "}
          or{" "}
          <code className="rounded bg-white px-1 dark:bg-zinc-950">
            accountId
          </code>
          .
        </p>
        {provisionEndpoints.map((endpoint) => (
          <div
            key={endpoint.slug}
            className="space-y-2 rounded-md border border-zinc-200 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-950"
          >
            <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
              {endpoint.label}
            </p>
            <div className="space-y-1 text-xs">
              <div className="flex items-center justify-between gap-3">
                <code className="truncate text-zinc-800 dark:text-zinc-200">
                  Add entitlement: {endpoint.addEntitlementUrl}
                </code>
                <CopyButton value={endpoint.addEntitlementUrl} label="Copy" />
              </div>
              <div className="flex items-center justify-between gap-3">
                <code className="truncate text-zinc-800 dark:text-zinc-200">
                  Remove entitlement: {endpoint.removeEntitlementUrl}
                </code>
                <CopyButton
                  value={endpoint.removeEntitlementUrl}
                  label="Copy"
                />
              </div>
              <div className="flex items-center justify-between gap-3">
                <code className="truncate text-zinc-800 dark:text-zinc-200">
                  Disable account: {endpoint.disableAccountUrl}
                </code>
                <CopyButton value={endpoint.disableAccountUrl} label="Copy" />
              </div>
              <div className="flex items-center justify-between gap-3">
                <code className="truncate text-zinc-800 dark:text-zinc-200">
                  Get account: {endpoint.getAccountUrl}
                </code>
                <CopyButton value={endpoint.getAccountUrl} label="Copy" />
              </div>
            </div>
          </div>
        ))}
      </section>

      <section className="space-y-3 rounded-lg border border-amber-200 bg-amber-50/50 p-4 dark:border-amber-900 dark:bg-amber-950/20">
        <p className="text-xs font-medium uppercase tracking-wide text-amber-800 dark:text-amber-300">
          Synthetic source endpoints (multi-source hero demo)
        </p>
        <p className="text-xs text-zinc-600 dark:text-zinc-400">
          Optional — create additional ISC Web Services sources for AWS IAM,
          Google Workspace, Entra ID, and Active Directory. See the{" "}
          <Link
            href="/setup#part-l--synthetic-sources-optional-multi-source-hero"
            className="font-medium underline underline-offset-2"
          >
            setup guide Part L
          </Link>
          .
        </p>
        {syntheticEndpoints.map((endpoint) => (
          <div
            key={endpoint.slug}
            className="space-y-2 rounded-md border border-amber-200 bg-white p-3 dark:border-amber-900 dark:bg-zinc-950"
          >
            <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
              {endpoint.label}
            </p>
            <div className="flex items-center justify-between gap-3">
              <code className="truncate text-sm text-zinc-800 dark:text-zinc-200">
                Accounts: {endpoint.accountsUrl}
              </code>
              <CopyButton value={endpoint.accountsUrl} label="Copy" />
            </div>
            <div className="flex items-center justify-between gap-3">
              <code className="truncate text-sm text-zinc-800 dark:text-zinc-200">
                Entitlements: {endpoint.entitlementsUrl}
              </code>
              <CopyButton value={endpoint.entitlementsUrl} label="Copy" />
            </div>
          </div>
        ))}
      </section>

      <section className="space-y-3 rounded-lg border border-dashed border-zinc-300 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-900">
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
          Reference payloads (optional)
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
    </div>
  );
}
