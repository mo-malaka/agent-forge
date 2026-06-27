import { iscRequest } from "@/lib/isc/client";
import type {
  DemoVerifyResult,
  IscAccountSummary,
  IscConfig,
  IscMachineAccountSummary,
} from "@/lib/isc/types";

function asArray<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) {
    return payload as T[];
  }

  if (payload && typeof payload === "object") {
    const record = payload as Record<string, unknown>;
    if (Array.isArray(record.items)) {
      return record.items as T[];
    }
  }

  return [];
}

export async function listSourceAccounts(
  config: IscConfig,
  limit = 50,
): Promise<IscAccountSummary[]> {
  const filter = `sourceId eq "${config.sourceId}"`;
  const payload = await iscRequest<unknown>(config, "/accounts", {
    query: {
      filters: filter,
      limit: String(limit),
    },
  });

  return asArray<IscAccountSummary>(payload);
}

export async function listSourceMachineAccounts(
  config: IscConfig,
  limit = 50,
): Promise<IscMachineAccountSummary[]> {
  const filter = `source.id eq "${config.sourceId}"`;
  const payload = await iscRequest<unknown>(config, "/machine-accounts", {
    query: {
      filters: filter,
      limit: String(limit),
    },
    experimental: true,
  });

  return asArray<IscMachineAccountSummary>(payload);
}

export async function verifySourceData(
  config: IscConfig,
): Promise<DemoVerifyResult> {
  const [accounts, machineAccounts] = await Promise.all([
    listSourceAccounts(config),
    listSourceMachineAccounts(config),
  ]);

  return {
    accounts,
    machineAccounts,
    accountCount: accounts.length,
    machineAccountCount: machineAccounts.length,
  };
}
