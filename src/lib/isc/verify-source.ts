import { getIscCredentials } from "@/lib/isc/config";
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
        "ISC credentials are not configured. Set ISC_TENANT, ISC_CLIENT_ID, and ISC_CLIENT_SECRET on the server.",
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
    return {
      provider,
      sourceId,
      ok: false,
      sourceName: null,
      message:
        error instanceof Error
          ? error.message
          : "Could not verify source with ISC API",
    };
  }
}
