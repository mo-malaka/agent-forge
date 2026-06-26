import { iscRequest } from "@/lib/isc/client";
import { extractTaskId } from "@/lib/isc/tasks";
import type { AggregationStartResult, IscConfig } from "@/lib/isc/types";

function toAggregationResult(raw: unknown): AggregationStartResult {
  return {
    taskId: extractTaskId(raw),
    raw,
  };
}

export async function startEntitlementAggregation(
  config: IscConfig,
): Promise<AggregationStartResult> {
  const raw = await iscRequest(
    config,
    `/entitlements/aggregate/sources/${config.sourceId}`,
    { method: "POST", bodyMode: "none" },
  );

  return toAggregationResult(raw);
}

export async function startMachineIdentityAggregation(
  config: IscConfig,
  schemas: string[] = ["bedrock-agent"],
): Promise<AggregationStartResult> {
  const raw = await iscRequest(
    config,
    `/sources/${config.sourceId}/aggregate-agents`,
    {
      method: "POST",
      body: { schemas },
    },
  );

  return toAggregationResult(raw);
}

export async function startAccountAggregation(
  config: IscConfig,
  options: { disableOptimization?: boolean } = {},
): Promise<AggregationStartResult> {
  if (options.disableOptimization) {
    const raw = await iscRequest(
      config,
      `/sources/${config.sourceId}/load-accounts`,
      {
        method: "POST",
        bodyMode: "form",
        body: { disableOptimization: "true" },
      },
    );

    return toAggregationResult(raw);
  }

  const raw = await iscRequest(
    config,
    `/sources/${config.sourceId}/load-accounts`,
    { method: "POST", bodyMode: "none" },
  );

  return toAggregationResult(raw);
}
