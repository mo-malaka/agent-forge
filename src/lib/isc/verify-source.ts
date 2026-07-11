import { getIscBaseUrl, getIscCredentials } from "@/lib/isc/config";
import { iscRequest } from "@/lib/isc/client";
import { getIscSourceId } from "@/lib/isc/settings-store";
import { DEPLOYMENT_PROVIDERS, type DeploymentProvider } from "@/lib/providers/profiles";

export interface IscSourceVerifyResult {
  provider: DeploymentProvider;
  sourceId: string;
  ok: boolean;
  sourceName: string | null;
  message: string;
}

export async function verifyIscPlatformSource(
  provider: DeploymentProvider,
  sourceIdInput?: string,
): Promise<IscSourceVerifyResult> {
  const credentials = getIscCredentials();
  if (!credentials) {
    return {
      provider,
      sourceId: sourceIdInput?.trim() ?? "",
      ok: false,
      sourceName: null,
      message:
        "ISC credentials are not configured. Save tenant connection above first.",
    };
  }

  const sourceId = sourceIdInput?.trim() || getIscSourceId(provider) || "";
  if (!sourceId) {
    return {
      provider,
      sourceId: "",
      ok: false,
      sourceName: null,
      message: `No source ID saved for ${DEPLOYMENT_PROVIDERS[provider].label}.`,
    };
  }

  try {
    const source = await iscRequest<{ id?: string; name?: string }>(
      { ...credentials, sourceId },
      `/sources/${sourceId}`,
    );

    const name = source.name?.trim() ?? null;
    return {
      provider,
      sourceId,
      ok: true,
      sourceName: name,
      message: name
        ? `Verified source “${name}” (${sourceId})`
        : `Verified source ${sourceId}`,
    };
  } catch (error) {
    const raw =
      error instanceof Error
        ? error.message
        : "Could not verify source with ISC API";
    const apiBase = getIscBaseUrl(credentials);
    const tenantHint =
      raw.includes("404") || raw.includes("Not found")
        ? ` API base: ${apiBase}. If this tenant is wrong, re-save ISC tenant connection above (UI overrides baked Amplify env vars when saved).`
        : "";

    return {
      provider,
      sourceId,
      ok: false,
      sourceName: null,
      message: `${raw}${tenantHint}`,
    };
  }
}
