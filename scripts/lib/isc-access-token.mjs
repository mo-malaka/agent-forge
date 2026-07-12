/**
 * Resolve an ISC Bearer access token (JWT).
 *
 * ISC Personal Access Tokens are OAuth clients: use --client-id + --client-secret
 * (or ISC_CLIENT_ID / ISC_CLIENT_SECRET). Do not pass Client ID or Secret as --token.
 */

export async function resolveIscAccessToken(params) {
  const tenant = params.tenant?.trim();
  const domain = params.domain?.trim() || "identitynow.com";

  if (params.token?.trim()) {
    return params.token.trim();
  }

  const clientId = params.clientId?.trim() ?? process.env.ISC_CLIENT_ID?.trim();
  const clientSecret =
    params.clientSecret?.trim() ?? process.env.ISC_CLIENT_SECRET?.trim();

  if (!tenant || !clientId || !clientSecret) {
    throw new Error(
      "Provide --token ACCESS_TOKEN, or --client-id + --client-secret (or ISC_CLIENT_ID + ISC_CLIENT_SECRET). " +
        "PAT Client ID and Secret are not valid Bearer tokens — exchange them first.",
    );
  }

  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: clientId,
    client_secret: clientSecret,
  });

  const response = await fetch(
    `https://${tenant}.api.${domain}/oauth/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    },
  );

  const text = await response.text();
  let payload = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = text;
    }
  }

  if (!response.ok) {
    throw new Error(
      `ISC oauth/token failed (${response.status}): ${
        typeof payload === "string" ? payload : JSON.stringify(payload)
      }`,
    );
  }

  const accessToken = payload?.access_token;
  if (!accessToken || typeof accessToken !== "string") {
    throw new Error("ISC oauth/token did not return access_token.");
  }

  return accessToken;
}
