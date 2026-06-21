import { DEPLOYMENT_PROVIDERS } from "@/lib/providers/profiles";

function stripTrailingSlash(url: string): string {
  return url.replace(/\/$/, "");
}

/**
 * Resolve the public base URL for connector links.
 *
 * Priority:
 * 1. AGENTFORGE_BASE_URL or NEXT_PUBLIC_BASE_URL (explicit override)
 * 2. Incoming request Host / X-Forwarded-* headers (auto-detect on Amplify, etc.)
 * 3. http://localhost:3000 (local dev fallback)
 */
export function resolveBaseUrl(headerList?: Headers): string {
  const explicit =
    process.env.AGENTFORGE_BASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_BASE_URL?.trim();

  if (explicit) {
    return stripTrailingSlash(explicit);
  }

  if (headerList) {
    const host =
      headerList.get("x-forwarded-host")?.split(",")[0]?.trim() ||
      headerList.get("host")?.trim();

    if (host) {
      const forwardedProto = headerList
        .get("x-forwarded-proto")
        ?.split(",")[0]
        ?.trim();
      const proto =
        forwardedProto ||
        (host.startsWith("localhost") || host.startsWith("127.0.0.1")
          ? "http"
          : "https");

      return `${proto}://${host}`;
    }
  }

  return "http://localhost:3000";
}

/** @deprecated Use resolveBaseUrl() or getRequestBaseUrl() instead */
export function getBaseUrl(): string {
  return resolveBaseUrl();
}

export async function getRequestBaseUrl(): Promise<string> {
  const { headers } = await import("next/headers");
  return resolveBaseUrl(await headers());
}

export function getPollUrl(baseUrl?: string): string {
  return `${baseUrl ?? resolveBaseUrl()}/api/agents`;
}

export function getProviderConnectorUrl(slug: string, baseUrl?: string): string {
  return `${baseUrl ?? resolveBaseUrl()}/api/connectors/${slug}/agents`;
}

export function getProviderConnectorEndpoints(baseUrl: string) {
  return Object.values(DEPLOYMENT_PROVIDERS).map((profile) => ({
    label: profile.label,
    slug: profile.connectorSlug,
    url: getProviderConnectorUrl(profile.connectorSlug, baseUrl),
  }));
}

export function getWebServicesAccountUrl(slug: string, baseUrl?: string): string {
  return `${baseUrl ?? resolveBaseUrl()}/api/connectors/web-services/${slug}/accounts`;
}

export function getWebServicesEntitlementUrl(slug: string, baseUrl?: string): string {
  return `${baseUrl ?? resolveBaseUrl()}/api/connectors/web-services/${slug}/entitlements`;
}

export function getWebServicesAccountEndpoints(baseUrl: string) {
  return Object.values(DEPLOYMENT_PROVIDERS).map((profile) => ({
    label: profile.label,
    slug: profile.connectorSlug,
    url: getWebServicesAccountUrl(profile.connectorSlug, baseUrl),
    rootPath: "$.accounts[*]",
  }));
}

export function getWebServicesEntitlementEndpoints(baseUrl: string) {
  return Object.values(DEPLOYMENT_PROVIDERS).map((profile) => ({
    label: profile.label,
    slug: profile.connectorSlug,
    url: getWebServicesEntitlementUrl(profile.connectorSlug, baseUrl),
    rootPath: "$.entitlements[*]",
    outboundUrl: `${getWebServicesEntitlementUrl(profile.connectorSlug, baseUrl)}?type=outbound`,
    inboundUrl: `${getWebServicesEntitlementUrl(profile.connectorSlug, baseUrl)}?type=inbound`,
  }));
}
