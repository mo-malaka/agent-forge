import { getIscCredentials } from "@/lib/isc/config";
import type { IscPatAuthInput } from "@/lib/isc/pat-auth";

/** Merge request body auth with saved UI/env credentials and ISC runtime context. */
export function resolveIscTargetAuth(input: {
  tenant?: string;
  domain?: string;
  personalAccessToken?: string;
  clientId?: string;
  clientSecret?: string;
}): IscPatAuthInput {
  const stored = getIscCredentials();

  const tenant = input.tenant?.trim() || stored?.tenant?.trim() || "";
  const domain = input.domain?.trim() || stored?.domain;
  const clientId = input.clientId?.trim() || stored?.clientId;
  const clientSecret = input.clientSecret?.trim() || stored?.clientSecret;

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
      "Tenant slug is required. Save your connection in Connect (step 1) first.",
    );
  }

  if (!hasToken && !hasClientCreds) {
    throw new Error(
      "Client ID and secret are required. Save your connection in Connect (step 1) first.",
    );
  }
}
