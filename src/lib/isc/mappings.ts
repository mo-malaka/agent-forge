import { iscRequest } from "@/lib/isc/client";
import type {
  IscConfig,
  MachineAccountAttributeMapping,
} from "@/lib/isc/types";

async function getSourceName(config: IscConfig): Promise<string> {
  const fromEnv = process.env.ISC_SOURCE_NAME?.trim();
  if (fromEnv) {
    return fromEnv;
  }

  const source = await iscRequest<{ name?: string }>(
    config,
    `/sources/${config.sourceId}`,
  );

  if (!source.name?.trim()) {
    throw new Error(
      "Could not resolve ISC source name. Set ISC_SOURCE_NAME or ensure the PAT can read the source.",
    );
  }

  return source.name.trim();
}

export function buildNativeIdentityMachineAccountMapping(
  config: IscConfig,
  sourceName: string,
): MachineAccountAttributeMapping {
  return {
    transformDefinition: {
      type: "accountAttribute",
      attributes: {
        sourceId: config.sourceId,
        sourceName,
        attributeName: "nativeIdentity",
      },
    },
    target: {
      type: "IDENTITY",
      attributeName: "nativeIdentity",
    },
  };
}

export async function getMachineAccountMappings(
  config: IscConfig,
): Promise<MachineAccountAttributeMapping[]> {
  return iscRequest<MachineAccountAttributeMapping[]>(
    config,
    `/sources/${config.sourceId}/machine-account-mappings`,
    { experimental: true },
  );
}

export async function updateMachineAccountMappings(
  config: IscConfig,
  mapping?: MachineAccountAttributeMapping,
): Promise<MachineAccountAttributeMapping[]> {
  const sourceName = await getSourceName(config);
  const payload =
    mapping ?? buildNativeIdentityMachineAccountMapping(config, sourceName);

  try {
    await iscRequest(
      config,
      `/sources/${config.sourceId}/machine-account-mappings`,
      {
        method: "DELETE",
        bodyMode: "none",
        experimental: true,
      },
    );
  } catch {
    // No existing mappings to clear.
  }

  return iscRequest<MachineAccountAttributeMapping[]>(
    config,
    `/sources/${config.sourceId}/machine-account-mappings`,
    {
      method: "POST",
      body: payload,
      experimental: true,
    },
  );
}

export function getDefaultMachineAccountMappings(
  config: IscConfig,
  sourceName: string,
): MachineAccountAttributeMapping[] {
  return [buildNativeIdentityMachineAccountMapping(config, sourceName)];
}
