import {
  DEPLOYMENT_PROVIDER_VALUES,
  type DeploymentProvider,
} from "@/lib/providers/profiles";

import {
  getConfiguredIscSourceIds,
  getIscSourceId,
  getStoredIscCredentials,
} from "@/lib/isc/settings-store";

export interface IscConfig {
  tenant: string;
  clientId: string;
  clientSecret: string;
  sourceId: string;
  apiVersion: string;
  domain: string;
}

export type IscCredentials = Omit<IscConfig, "sourceId">;

export { getConfiguredIscSourceIds, getIscSourceId };

function getEnvIscCredentials(): IscCredentials | null {
  const tenant = process.env.ISC_TENANT?.trim();
  const clientId = process.env.ISC_CLIENT_ID?.trim();
  const clientSecret = process.env.ISC_CLIENT_SECRET?.trim();

  if (!tenant || !clientId || !clientSecret) {
    return null;
  }

  return {
    tenant,
    clientId,
    clientSecret,
    apiVersion: process.env.ISC_API_VERSION?.trim() || "v2026",
    domain: process.env.ISC_DOMAIN?.trim() || "identitynow.com",
  };
}

export function getIscCredentials(): IscCredentials | null {
  return getStoredIscCredentials() ?? getEnvIscCredentials();
}

export function getIscConfigForProvider(
  provider: DeploymentProvider,
): IscConfig | null {
  const credentials = getIscCredentials();
  const sourceId = getIscSourceId(provider);

  if (!credentials || !sourceId) {
    return null;
  }

  return {
    ...credentials,
    sourceId,
  };
}

/** First provider with credentials + source — for auth-only calls (task polling). */
export function getAnyIscConfig(): IscConfig | null {
  const credentials = getIscCredentials();
  if (!credentials) {
    return null;
  }

  for (const provider of DEPLOYMENT_PROVIDER_VALUES) {
    const sourceId = getIscSourceId(provider);
    if (sourceId) {
      return { ...credentials, sourceId };
    }
  }

  return null;
}

/** @deprecated Use getIscConfigForProvider(provider) or getAnyIscConfig() */
export function getIscConfig(): IscConfig | null {
  return getIscConfigForProvider("aws_bedrock") ?? getAnyIscConfig();
}

export function getIscBaseUrl(config: IscCredentials): string {
  return `https://${config.tenant}.api.${config.domain}`;
}

export function getIscCredentialSource(): "ui" | "env" | null {
  if (getStoredIscCredentials()) {
    return "ui";
  }
  if (getEnvIscCredentials()) {
    return "env";
  }
  return null;
}

export function getIscPublicStatus() {
  const credentials = getIscCredentials();
  const sources = getConfiguredIscSourceIds();
  const configuredSourceCount = Object.values(sources).filter(Boolean).length;
  const credentialSource = getIscCredentialSource();

  return {
    credentialsConfigured: credentials !== null,
    configured: credentials !== null && configuredSourceCount > 0,
    tenant: credentials?.tenant ?? null,
    domain: credentials?.domain ?? null,
    apiBaseUrl: credentials ? getIscBaseUrl(credentials) : null,
    credentialSource,
    sources,
    /** Legacy — Bedrock source id (or first configured source). */
    sourceId:
      sources.aws_bedrock ?? sources.gcp_vertex ?? sources.azure_ai_foundry,
    apiVersion: credentials?.apiVersion ?? "v2026",
  };
}
