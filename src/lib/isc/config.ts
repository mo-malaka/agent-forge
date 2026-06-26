export interface IscConfig {
  tenant: string;
  clientId: string;
  clientSecret: string;
  sourceId: string;
  apiVersion: string;
  domain: string;
}

export function getIscConfig(): IscConfig | null {
  const tenant = process.env.ISC_TENANT?.trim();
  const clientId = process.env.ISC_CLIENT_ID?.trim();
  const clientSecret = process.env.ISC_CLIENT_SECRET?.trim();
  const sourceId = process.env.ISC_SOURCE_ID?.trim();

  if (!tenant || !clientId || !clientSecret || !sourceId) {
    return null;
  }

  return {
    tenant,
    clientId,
    clientSecret,
    sourceId,
    apiVersion: process.env.ISC_API_VERSION?.trim() || "v2026",
    domain: process.env.ISC_DOMAIN?.trim() || "identitynow.com",
  };
}

export function getIscBaseUrl(config: IscConfig): string {
  return `https://${config.tenant}.api.${config.domain}`;
}

export function getIscPublicStatus() {
  const config = getIscConfig();

  return {
    configured: config !== null,
    tenant: config?.tenant ?? null,
    sourceId: config?.sourceId ?? null,
    apiVersion: config?.apiVersion ?? "v2026",
  };
}
