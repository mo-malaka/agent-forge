import {
  runWithIscRuntimeAsync,
  runtimeFromRequest,
  type IscRuntimePayload,
} from "@/lib/isc/runtime-config";

export async function withRequestIscRuntime<T>(
  request: Request,
  body: { isc_runtime?: IscRuntimePayload } | undefined,
  fn: () => Promise<T>,
): Promise<T> {
  const runtime = runtimeFromRequest(request, body);
  return runWithIscRuntimeAsync(runtime, fn);
}
