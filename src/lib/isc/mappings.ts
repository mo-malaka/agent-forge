import { iscRequest } from "@/lib/isc/client";
import type { AttributeMapping, IscConfig } from "@/lib/isc/types";

const DEFAULT_MACHINE_ACCOUNT_MAPPINGS: AttributeMapping[] = [
  {
    identityAttribute: "nativeIdentity",
    accountAttribute: "nativeIdentity",
  },
];

export async function getMachineAccountMappings(
  config: IscConfig,
): Promise<AttributeMapping[]> {
  return iscRequest<AttributeMapping[]>(
    config,
    `/sources/${config.sourceId}/machine-account-mappings`,
  );
}

export async function updateMachineAccountMappings(
  config: IscConfig,
  mappings: AttributeMapping[] = DEFAULT_MACHINE_ACCOUNT_MAPPINGS,
): Promise<AttributeMapping[]> {
  return iscRequest<AttributeMapping[]>(
    config,
    `/sources/${config.sourceId}/machine-account-mappings`,
    {
      method: "PUT",
      body: mappings,
      experimental: true,
    },
  );
}

export function getDefaultMachineAccountMappings(): AttributeMapping[] {
  return [...DEFAULT_MACHINE_ACCOUNT_MAPPINGS];
}
