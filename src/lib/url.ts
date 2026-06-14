import { DEPLOYMENT_PROVIDERS } from "@/lib/providers/profiles";

export function getBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, "") ??
    "http://localhost:3000"
  );
}

export function getPollUrl(): string {
  return `${getBaseUrl()}/api/agents`;
}

export function getProviderConnectorUrl(slug: string): string {
  return `${getBaseUrl()}/api/connectors/${slug}/agents`;
}

export const PROVIDER_CONNECTOR_ENDPOINTS = Object.values(
  DEPLOYMENT_PROVIDERS,
).map((profile) => ({
  label: profile.label,
  slug: profile.connectorSlug,
  url: getProviderConnectorUrl(profile.connectorSlug),
}));
