import { iscRequest } from "@/lib/isc/client";
import { listSourceAccounts, verifySourceData } from "@/lib/isc/verify";
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

function buildMachineAccountMapping(
  config: IscConfig,
  sourceName: string,
  accountAttribute: string,
  targetAttribute: string,
): MachineAccountAttributeMapping {
  return {
    transformDefinition: {
      type: "accountAttribute",
      attributes: {
        sourceId: config.sourceId,
        sourceName,
        attributeName: accountAttribute,
      },
    },
    target: {
      type: "IDENTITY",
      attributeName: targetAttribute,
      sourceId: config.sourceId,
    },
  };
}

export function buildDefaultMachineAccountMappings(
  config: IscConfig,
  sourceName: string,
): MachineAccountAttributeMapping[] {
  const accountAttribute =
    process.env.ISC_MIS_LINK_ACCOUNT_ATTR?.trim() || "nativeIdentity";
  const targetAttribute =
    process.env.ISC_MIS_LINK_TARGET_ATTR?.trim() || "nativeIdentity";

  return [
    buildMachineAccountMapping(
      config,
      sourceName,
      accountAttribute,
      targetAttribute,
    ),
  ];
}

/** @deprecated Use buildDefaultMachineAccountMappings */
export function buildNativeIdentityMachineAccountMapping(
  config: IscConfig,
  sourceName: string,
): MachineAccountAttributeMapping {
  return buildDefaultMachineAccountMappings(config, sourceName)[0];
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

export async function classifyAccountAsMachine(
  config: IscConfig,
  accountId: string,
): Promise<unknown> {
  return iscRequest(
    config,
    `/accounts/${accountId}/classify`,
    {
      method: "POST",
      bodyMode: "none",
      experimental: true,
      query: { classificationMode: "forceMachine" },
    },
  );
}

export async function classifySourceMachineAccounts(
  config: IscConfig,
): Promise<{ accountsSubmitted?: number; raw: unknown; mode: string }> {
  const raw = await iscRequest<Record<string, unknown>>(
    config,
    `/sources/${config.sourceId}/classify`,
    {
      method: "POST",
      bodyMode: "none",
      experimental: true,
    },
  );

  const submitted =
    typeof raw["Accounts submitted for processing"] === "number"
      ? raw["Accounts submitted for processing"]
      : undefined;

  if (submitted && submitted > 0) {
    return { accountsSubmitted: submitted, raw, mode: "source" };
  }

  const accounts = await listSourceAccounts(config, 250);
  let forced = 0;
  const failures: Array<{ accountId: string; error: string }> = [];

  for (const account of accounts) {
    if (!account.id) {
      continue;
    }

    try {
      await classifyAccountAsMachine(config, account.id);
      forced += 1;
    } catch (error) {
      failures.push({
        accountId: account.id,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return {
    accountsSubmitted: forced,
    raw: { sourceClassify: raw, forcedPerAccount: forced, failures },
    mode: forced > 0 ? "per-account" : "none",
  };
}

export async function updateMachineAccountMappings(
  config: IscConfig,
): Promise<{
  mappings: MachineAccountAttributeMapping[];
  classification: {
    accountsSubmitted?: number;
    raw: unknown;
    mode: string;
  };
}> {
  const sourceName = await getSourceName(config);
  const mappings = buildDefaultMachineAccountMappings(config, sourceName);

  const attempts: Array<() => Promise<MachineAccountAttributeMapping[]>> = [
    () => putMachineAccountMappings(config, mappings, "machine-account-mappings"),
    () => putMachineAccountMappings(config, mappings, "machine-mappings"),
    () => postMachineAccountMappings(config, mappings),
  ];

  let lastError: Error | null = null;
  let savedMappings: MachineAccountAttributeMapping[] | null = null;

  for (const attempt of attempts) {
    try {
      savedMappings = await attempt();
      break;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
    }
  }

  if (!savedMappings) {
    throw lastError ?? new Error("Failed to update machine account mappings");
  }

  let classification: {
    accountsSubmitted?: number;
    raw: unknown;
    mode: string;
  };

  try {
    classification = await classifySourceMachineAccounts(config);
  } catch (error) {
    const verification = await verifySourceData(config);
    if (verification.machineAccountCount > 0) {
      return {
        mappings: savedMappings,
        classification: {
          accountsSubmitted: verification.machineAccountCount,
          raw: {
            skippedClassify: true,
            reason: error instanceof Error ? error.message : String(error),
            verification,
          },
          mode: "already-linked",
        },
      };
    }

    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Mappings saved, but account classification failed: ${detail}. Re-run step 6 after deploy.`,
    );
  }

  if ((classification.accountsSubmitted ?? 0) === 0) {
    const verification = await verifySourceData(config);
    if (verification.machineAccountCount > 0) {
      return {
        mappings: savedMappings,
        classification: {
          accountsSubmitted: verification.machineAccountCount,
          raw: {
            ...((classification.raw as Record<string, unknown>) ?? {}),
            verification,
          },
          mode: "already-linked",
        },
      };
    }
  }

  return {
    mappings: savedMappings,
    classification,
  };
}

export function getDefaultMachineAccountMappings(
  config: IscConfig,
  sourceName: string,
): MachineAccountAttributeMapping[] {
  return buildDefaultMachineAccountMappings(config, sourceName);
}
