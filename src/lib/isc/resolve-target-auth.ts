import { getIscCredentials } from "@/lib/isc/config";
import type { IscPatAuthInput } from "@/lib/isc/pat-auth";
import { getStoredIscCredentials } from "@/lib/isc/settings-store";

/** Merge request body auth with saved UI/env credentials and ISC runtime context. */
export function resolveIscTargetAuth(input: {
  tenant?: string;
  domain?: string;
  personalAccessToken?: string;
  clientId?: string;
  clientSecret?: string;
}): IscPatAuthInput {
  const active = getIscCredentials();
  const persisted = getStoredIscCredentials();

  const tenant =
    input.tenant?.trim() || active?.tenant?.trim() || persisted?.tenant?.trim() || "";
  // Prefer explicit request body, then UI-saved file (Connect), then session runtime.
  const domain =
    input.domain?.trim() ||
    persisted?.domain?.trim() ||
    active?.domain?.trim() ||
    "identitynow.com";
  const clientId = input.clientId?.trim() || active?.clientId || persisted?.clientId;
  const clientSecret =
    input.clientSecret?.trim() || active?.clientSecret || persisted?.clientSecret;

  return {
    tenant,
    domain,
    personalAccessToken: input.personalAccessToken,
    clientId,
    clientSecret,
  };
}

export function assertIscTargetAuth(
  auth: IscPatAuthInput,
): asserts auth is IscPatAuthInput & { tenant: string } {
  const hasToken = Boolean(auth.personalAccessToken?.trim());
  const hasClientCreds =
    Boolean(auth.clientId?.trim()) && Boolean(auth.clientSecret?.trim());

  if (!auth.tenant?.trim()) {
    throw new Error(
      "Tenant URL is required. Save your connection in Connect (step 1) first.",
    );
  }

  if (!hasToken && !hasClientCreds) {
    throw new Error(
      "Client ID and secret are required. Save your connection in Connect (step 1) first.",
    );
  }
}
