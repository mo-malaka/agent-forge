export interface IscPatAuthInput {
  tenant: string;
  domain?: string;
  personalAccessToken?: string;
  clientId?: string;
  clientSecret?: string;
}

/** PAT Client ID + Secret, or a pre-fetched JWT access token from /oauth/token. */
export async function resolveIscAccessToken(
  input: IscPatAuthInput,
): Promise<string> {
  const token = input.personalAccessToken?.trim();
  if (token) {
    return token;
  }

  const clientId = input.clientId?.trim();
  const clientSecret = input.clientSecret?.trim();
  const tenant = input.tenant.trim();
  const domain = input.domain?.trim() || "identitynow.com";

  if (!clientId || !clientSecret) {
    throw new Error(
      "Provide client_id + client_secret from Connect (step 1), or save credentials there first.",
    );
  }

  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: clientId,
    client_secret: clientSecret,
  });

  let response: Response;
  try {
    response = await fetch(`https://${tenant}.api.${domain}/oauth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Could not reach ISC oauth/token for ${tenant}.api.${domain} (${detail}).`,
    );
  }

  const text = await response.text();
  let payload: { access_token?: string; error?: string } | null = null;
  if (text) {
    try {
      payload = JSON.parse(text) as { access_token?: string; error?: string };
    } catch {
      throw new Error(`ISC oauth/token failed (${response.status}): ${text}`);
    }
  }

  if (!response.ok) {
    throw new Error(
      `ISC oauth/token failed (${response.status}): ${text || response.statusText}`,
    );
  }

  if (!payload?.access_token) {
    throw new Error("ISC oauth/token did not return access_token.");
  }

  return payload.access_token;
}
