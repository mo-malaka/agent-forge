import { iscRequest } from "@/lib/isc/client";
import type { IscConfig } from "@/lib/isc/config";
import type {
  DemoVerifyResult,
  IscAccountSummary,
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

function accountMatchesSource(
  account: IscAccountSummary,
  sourceId: string,
): boolean {
  if (account.sourceId === sourceId) {
    return true;
  }

  const source = account.source as { id?: string } | undefined;
  return source?.id === sourceId;
}

async function listWithFilterFallback<T>(
  config: IscConfig,
  path: string,
  filterAttempts: string[],
  options: { experimental?: boolean; limit?: number; apiVersion?: string } = {},
): Promise<T[]> {
  const limit = String(options.limit ?? 50);
  let lastError: Error | null = null;

  for (const filters of filterAttempts) {
    try {
      const payload = await iscRequest<unknown>(config, path, {
        query: { filters, limit },
        experimental: options.experimental,
        apiVersion: options.apiVersion,
      });
      return asArray<T>(payload);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (!lastError.message.includes("Invalid filter")) {
        throw lastError;
      }
    }
  }

  throw lastError ?? new Error(`Failed to list ${path}`);
}

async function listAccountsWithApiFallback(
  config: IscConfig,
  limit: number,
): Promise<IscAccountSummary[]> {
  const filterAttempts = [
    `source.id eq "${config.sourceId}"`,
    `sourceId eq "${config.sourceId}"`,
  ];
  const apiVersions = [config.apiVersion, "v2025"].filter(
    (value, index, array) => array.indexOf(value) === index,
  );

  for (const apiVersion of apiVersions) {
    try {
      const results = await listWithFilterFallback<IscAccountSummary>(
        config,
        "/accounts",
        filterAttempts,
        { limit, apiVersion },
      );
      if (results.length > 0) {
        return results;
      }
    } catch {
      // Try next API version or unfiltered fallback.
    }

    try {
      const payload = await iscRequest<unknown>(config, "/accounts", {
        query: { limit: String(Math.max(limit, 250)) },
        apiVersion,
      });
      const filtered = asArray<IscAccountSummary>(payload).filter((account) =>
        accountMatchesSource(account, config.sourceId),
      );
      if (filtered.length > 0) {
        return filtered;
      }
    } catch {
      // Try next API version.
    }
  }

  return [];
}

export async function listSourceAccounts(
  config: IscConfig,
  limit = 50,
): Promise<IscAccountSummary[]> {
  return listAccountsWithApiFallback(config, limit);
}

export async function listSourceMachineAccounts(
  config: IscConfig,
  limit = 50,
): Promise<IscMachineAccountSummary[]> {
  return listWithFilterFallback<IscMachineAccountSummary>(
    config,
    "/machine-accounts",
    [
      `source.id eq "${config.sourceId}"`,
      `sourceId eq "${config.sourceId}"`,
    ],
    { experimental: true, limit },
  );
}

export async function listSourceEntitlements(
  config: IscConfig,
  limit = 50,
): Promise<unknown[]> {
  return listWithFilterFallback<unknown>(
    config,
    "/entitlements",
    [
      `source.id eq "${config.sourceId}"`,
      `sourceId eq "${config.sourceId}"`,
    ],
    { limit },
  );
}

function buildAccessHints(input: {
  accountCount: number;
  machineAccountCount: number;
  entitlementCount: number;
}): string[] {
  const hints: string[] = [];

  if (input.entitlementCount === 0) {
    hints.push(
      "Entitlement catalog is empty — run outbound + inbound entitlement aggregation in ISC (Steps 2–3).",
    );
  }

  if (input.accountCount === 0) {
    hints.push(
      "No source accounts returned from ISC API — re-run account aggregation (Step 5). If accounts exist in the UI, the v2026 accounts API may be empty on this tenant.",
    );
  }

  if (
    input.entitlementCount > 0 &&
    input.accountCount > 0 &&
    input.machineAccountCount === 0
  ) {
    hints.push(
      "Accounts exist but no machine accounts — re-run Step 6 to classify and link nativeIdentity → nativeIdentity.",
    );
  }

  if (
    input.entitlementCount > 0 &&
    input.accountCount > 0 &&
    input.machineAccountCount > 0
  ) {
    hints.push(
      "If AI Agent → Access is still empty, confirm account and AI agent nativeIdentity both hold the full ARN, then re-run Steps 5 and 6.",
    );
  }

  return hints;
}

export async function verifySourceData(
  config: IscConfig,
): Promise<DemoVerifyResult> {
  const [accounts, machineAccounts, entitlements] = await Promise.all([
    listSourceAccounts(config),
    listSourceMachineAccounts(config),
    listSourceEntitlements(config),
  ]);

  const accountCount = accounts.length;
  const machineAccountCount = machineAccounts.length;
  const entitlementCount = entitlements.length;
  const accessReady =
    entitlementCount > 0 && accountCount > 0 && machineAccountCount > 0;
  const hints = buildAccessHints({
    accountCount,
    machineAccountCount,
    entitlementCount,
  });

  return {
    accounts,
    machineAccounts,
    entitlements,
    accountCount,
    machineAccountCount,
    entitlementCount,
    accessReady,
    hints,
  };
}
