import type { DeploymentProvider } from "@/lib/providers/profiles";

import { loadIscSessionCache } from "./session-cache";
import { formatIscTenantUrl } from "./tenant-url";

export const CONNECTOR_SLUG_TO_PROVIDER = {
  "aws-bedrock": "aws_bedrock",
  "gcp-vertex": "gcp_vertex",
  "azure-ai-foundry": "azure_ai_foundry",
} as const satisfies Record<string, DeploymentProvider>;

export type ConnectorSlug = keyof typeof CONNECTOR_SLUG_TO_PROVIDER;

export interface IscBootstrapPrefill {
  tenant: string;
  domain: string;
  tenantUrl: string;
  clientId: string;
  sourceIds: Record<string, string>;
}

/** Reuse tenant + source IDs saved on Demo (session) or server-side ISC settings. */
export async function loadIscBootstrapPrefill(
  connectorSlugs: ConnectorSlug[],
): Promise<IscBootstrapPrefill> {
  const cache = loadIscSessionCache();
  const sourceIds: Record<string, string> = {};

  for (const slug of connectorSlugs) {
    const provider = CONNECTOR_SLUG_TO_PROVIDER[slug];
    const fromCache = cache?.sources[provider]?.trim();
    if (fromCache) {
      sourceIds[slug] = fromCache;
    }
  }

  let tenant = cache?.tenant?.trim() ?? "";
  let domain = cache?.domain?.trim() ?? "";
  let clientId = cache?.client_id?.trim() ?? "";

  try {
    const [credRes, srcRes] = await Promise.all([
      fetch("/api/isc/credentials"),
      fetch("/api/isc/sources"),
    ]);

    if (credRes.ok) {
      const cred = (await credRes.json()) as {
        tenant?: string | null;
        domain?: string;
        clientId?: string | null;
      };
      tenant = tenant || cred.tenant?.trim() || "";
      domain = cred.domain?.trim() || domain;
      clientId = clientId || cred.clientId?.trim() || "";
    }

    if (srcRes.ok) {
      const body = (await srcRes.json()) as {
        sources?: Partial<Record<DeploymentProvider, string>>;
      };

      for (const slug of connectorSlugs) {
        if (sourceIds[slug]) {
          continue;
        }
        const provider = CONNECTOR_SLUG_TO_PROVIDER[slug];
        const id = body.sources?.[provider]?.trim();
        if (id) {
          sourceIds[slug] = id;
        }
      }
    }
  } catch {
    // Prefill is best-effort.
  }

  return {
    tenant,
    domain,
    tenantUrl: tenant && domain ? formatIscTenantUrl(tenant, domain) : "",
    clientId,
    sourceIds,
  };
}

export function resolveBootstrapClientSecret(typedSecret: string): string {
  const trimmed = typedSecret.trim();
  if (trimmed) {
    return trimmed;
  }
  return loadIscSessionCache()?.client_secret?.trim() ?? "";
}
