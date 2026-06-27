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

async function listWithFilterFallback<T>(
  config: IscConfig,
  path: string,
  filterAttempts: string[],
  options: { experimental?: boolean; limit?: number } = {},
): Promise<T[]> {
  const limit = String(options.limit ?? 50);
  let lastError: Error | null = null;

  for (const filters of filterAttempts) {
    try {
      const payload = await iscRequest<unknown>(config, path, {
        query: { filters, limit },
        experimental: options.experimental,
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

export async function listSourceAccounts(
  config: IscConfig,
  limit = 50,
): Promise<IscAccountSummary[]> {
  return listWithFilterFallback<IscAccountSummary>(
    config,
    "/accounts",
    [
      `source.id eq "${config.sourceId}"`,
      `sourceId eq "${config.sourceId}"`,
    ],
    { limit },
  );
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
      "Entitlement catalog is empty — run outbound + inbound entitlement aggregation in ISC (Steps 2–3), not only the AgentForge acknowledge button.",
    );
  }

  if (input.accountCount === 0) {
    hints.push("No source accounts found — re-run account aggregation (Step 5).");
  }

  if (
    input.entitlementCount > 0 &&
    input.accountCount > 0 &&
    input.machineAccountCount > 0
  ) {
    hints.push(
      "If AI Agent → Access is empty: open DevOps-Bot-Prod → Accounts tab, link the Bedrock source account, then re-run account aggregation.",
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
