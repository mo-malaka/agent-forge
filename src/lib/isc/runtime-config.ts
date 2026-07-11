import { AsyncLocalStorage } from "node:async_hooks";

import type { DeploymentProvider } from "@/lib/providers/profiles";

import type { IscCredentials } from "./config";

export interface IscRuntimePayload {
  tenant: string;
  client_id: string;
  client_secret: string;
  api_version?: string;
  domain?: string;
  sources?: Partial<Record<DeploymentProvider, string>>;
}

const storage = new AsyncLocalStorage<IscRuntimePayload>();

export function runWithIscRuntime<T>(
  payload: IscRuntimePayload | undefined | null,
  fn: () => T,
): T {
  if (
    !payload?.tenant?.trim() ||
    !payload.client_id?.trim() ||
    !payload.client_secret?.trim()
  ) {
    return fn();
  }

  return storage.run(payload, fn);
}

export async function runWithIscRuntimeAsync<T>(
  payload: IscRuntimePayload | undefined | null,
  fn: () => Promise<T>,
): Promise<T> {
  if (
    !payload?.tenant?.trim() ||
    !payload.client_id?.trim() ||
    !payload.client_secret?.trim()
  ) {
    return fn();
  }

  return storage.run(payload, fn);
}

export function getActiveIscRuntime(): IscRuntimePayload | undefined {
  return storage.getStore();
}

export function runtimeToCredentials(payload: IscRuntimePayload): IscCredentials {
  return {
    tenant: payload.tenant.trim(),
    clientId: payload.client_id.trim(),
    clientSecret: payload.client_secret.trim(),
    apiVersion: payload.api_version?.trim() || "v2026",
    domain: payload.domain?.trim() || "identitynow.com",
  };
}

export function parseIscRuntimeHeader(
  header: string | null,
): IscRuntimePayload | undefined {
  if (!header?.trim()) {
    return undefined;
  }

  try {
    const json = Buffer.from(header, "base64").toString("utf8");
    const parsed = JSON.parse(json) as IscRuntimePayload;
    if (
      !parsed.tenant?.trim() ||
      !parsed.client_id?.trim() ||
      !parsed.client_secret?.trim()
    ) {
      return undefined;
    }
    return parsed;
  } catch {
    return undefined;
  }
}

export function runtimeFromRequest(
  request: Request,
  body?: { isc_runtime?: IscRuntimePayload },
): IscRuntimePayload | undefined {
  return (
    body?.isc_runtime ??
    parseIscRuntimeHeader(request.headers.get("X-AgentForge-Isc-Runtime"))
  );
}
