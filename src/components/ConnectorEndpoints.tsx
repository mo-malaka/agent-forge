import { CopyButton } from "@/components/CopyButton";
import {
  getWebServicesAccountEndpoints,
  getWebServicesEntitlementEndpoints,
  getWebServicesProvisionEndpoints,
} from "@/lib/url";

interface ConnectorEndpointsProps {
  baseUrl: string;
}

export function ConnectorEndpoints({ baseUrl }: ConnectorEndpointsProps) {
  const webServicesEndpoints = getWebServicesAccountEndpoints(baseUrl);
  const entitlementEndpoints = getWebServicesEntitlementEndpoints(baseUrl);
  const provisionEndpoints = getWebServicesProvisionEndpoints(baseUrl);

  return (
    <div id="endpoints" className="scroll-mt-6 space-y-6">
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
    </div>
  );
}
