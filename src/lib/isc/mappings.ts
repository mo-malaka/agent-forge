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
      sourceId: config.sourceId,
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

async function putMachineAccountMappings(
  config: IscConfig,
  mappings: MachineAccountAttributeMapping[],
  path: "machine-account-mappings" | "machine-mappings",
): Promise<MachineAccountAttributeMapping[]> {
  return iscRequest<MachineAccountAttributeMapping[]>(
    config,
    `/sources/${config.sourceId}/${path}`,
    {
      method: "PUT",
      body: mappings,
      experimental: true,
    },
  );
}

async function postMachineAccountMappings(
  config: IscConfig,
  mappings: MachineAccountAttributeMapping[],
): Promise<MachineAccountAttributeMapping[]> {
  return iscRequest<MachineAccountAttributeMapping[]>(
    config,
    `/sources/${config.sourceId}/machine-account-mappings`,
    {
      method: "POST",
      body: mappings,
      experimental: true,
    },
  );
}

export async function updateMachineAccountMappings(
  config: IscConfig,
  mapping?: MachineAccountAttributeMapping,
): Promise<MachineAccountAttributeMapping[]> {
  const sourceName = await getSourceName(config);
  const mappings = [
    mapping ?? buildNativeIdentityMachineAccountMapping(config, sourceName),
  ];

  const attempts: Array<() => Promise<MachineAccountAttributeMapping[]>> = [
    () => putMachineAccountMappings(config, mappings, "machine-account-mappings"),
    () => putMachineAccountMappings(config, mappings, "machine-mappings"),
    () => postMachineAccountMappings(config, mappings),
  ];

  let lastError: Error | null = null;

  for (const attempt of attempts) {
    try {
      return await attempt();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
    }
  }

  throw lastError ?? new Error("Failed to update machine account mappings");
}

export function getDefaultMachineAccountMappings(
  config: IscConfig,
  sourceName: string,
): MachineAccountAttributeMapping[] {
  return [buildNativeIdentityMachineAccountMapping(config, sourceName)];
}
