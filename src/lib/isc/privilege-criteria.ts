export interface PrivilegeCriteriaGoldenFile {
  version: number;
  description?: string;
  platform?: string;
  criteriaConfig?: {
    config?: Record<string, unknown> | null;
  };
  customCriteria?: Array<{
    type?: string;
    operator?: string;
    privilegeLevel?: string;
    groups?: unknown[];
  }>;
}

export interface PrivilegeCriteriaTarget {
  tenant: string;
  domain?: string;
  personalAccessToken?: string;
  clientId?: string;
  clientSecret?: string;
  apiVersion?: string;
}

function getApiBase(target: PrivilegeCriteriaTarget): string {
  const domain = target.domain?.trim() || "identitynow.com";
  const version = target.apiVersion?.trim() || "v2026";
  return `https://${target.tenant.trim()}.api.${domain}/${version}`;
}

async function iscFetch(
  baseUrl: string,
  token: string,
  path: string,
  options: RequestInit = {},
): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(`${baseUrl}${path}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${token.trim()}`,
        Accept: "application/json",
        ...(options.headers as Record<string, string> | undefined),
      },
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Could not reach ISC at ${baseUrl} (${detail}). Check tenant URL and network access from AgentForge.`,
    );
  }

  const text = await response.text();
  let body: unknown = null;
  if (text) {
    try {
      body = JSON.parse(text) as unknown;
    } catch {
      body = text;
    }
  }

  if (!response.ok) {
    const detail =
      typeof body === "string" ? body : JSON.stringify(body);
    throw new Error(`ISC ${options.method ?? "GET"} ${path} failed (${response.status}): ${detail}`);
  }

  return body;
}

function asArray(payload: unknown): Array<Record<string, unknown>> {
  if (Array.isArray(payload)) {
    return payload as Array<Record<string, unknown>>;
  }
  if (payload && typeof payload === "object") {
    const items = (payload as { items?: unknown }).items;
    if (Array.isArray(items)) {
      return items as Array<Record<string, unknown>>;
    }
  }
  return [];
}

function buildConfigPatch(goldenConfig: Record<string, unknown> | null | undefined) {
  const patch: Array<{ op: string; path: string; value: unknown }> = [
    { op: "replace", path: "/config/globalPrivilegeLevelEnabled", value: true },
  ];

  if (!goldenConfig) {
    return patch;
  }

  for (const [key, value] of Object.entries(goldenConfig)) {
    if (key === "globalPrivilegeLevelEnabled") {
      continue;
    }
    patch.push({ op: "replace", path: `/config/${key}`, value });
  }

  return patch;
}

export async function applyPrivilegeCriteriaGolden(params: {
  target: PrivilegeCriteriaTarget;
  sourceId: string;
  golden: PrivilegeCriteriaGoldenFile;
}): Promise<{
  criteriaConfigId: string;
  customCriteriaCreated: number;
  customCriteriaSkipped?: number;
}> {
  const { resolveIscAccessToken } = await import("@/lib/isc/pat-auth");
  const baseUrl = getApiBase(params.target);
  const token = await resolveIscAccessToken({
    tenant: params.target.tenant,
    domain: params.target.domain,
    personalAccessToken: params.target.personalAccessToken,
    clientId: params.target.clientId,
    clientSecret: params.target.clientSecret,
  });
  const sourceId = params.sourceId.trim();

  const filter = encodeURIComponent(`sourceId eq "${sourceId}"`);
  const listed = await iscFetch(
    baseUrl,
    token,
    `/criteria-config/privilege?filters=${filter}&count=true`,
  );
  const configs = asArray(listed);

  if (configs.length === 0) {
    throw new Error(
      `No privilege criteria config found for source ${sourceId}. Complete SP-Config import first, then wait ~30 seconds and retry. If it still fails, open the source in ISC → Entitlement Management and confirm privilege classification is available for Web Services sources.`,
    );
  }

  const criteriaConfigId = String(configs[0]?.id ?? "");
  if (!criteriaConfigId) {
    throw new Error("ISC returned a criteria config without an id.");
  }

  const patch = buildConfigPatch(
    params.golden.criteriaConfig?.config as Record<string, unknown> | undefined,
  );

  await iscFetch(baseUrl, token, `/criteria-config/privilege/${criteriaConfigId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json-patch+json" },
    body: JSON.stringify(patch),
  });

  let existingCustom: Array<Record<string, unknown>> = [];
  try {
    const customListed = await iscFetch(
      baseUrl,
      token,
      `/criteria/privilege?filters=${filter}&count=true`,
    );
    existingCustom = asArray(customListed);
  } catch {
    existingCustom = [];
  }

  const existingLevels = new Set(
    existingCustom
      .map((row) => String(row.privilegeLevel ?? "").trim())
      .filter(Boolean),
  );

  let created = 0;
  let skipped = 0;
  for (const row of params.golden.customCriteria ?? []) {
    const privilegeLevel = String(row.privilegeLevel ?? "").trim();
    if (privilegeLevel && existingLevels.has(privilegeLevel)) {
      skipped += 1;
      continue;
    }

    await iscFetch(baseUrl, token, "/criteria/privilege", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sourceId,
        type: row.type ?? "CUSTOM",
        operator: row.operator ?? "OR",
        groups: row.groups ?? [],
        privilegeLevel: row.privilegeLevel,
      }),
    });
    if (privilegeLevel) {
      existingLevels.add(privilegeLevel);
    }
    created += 1;
  }

  return { criteriaConfigId, customCriteriaCreated: created, customCriteriaSkipped: skipped };
}

export async function loadPrivilegeCriteriaGolden(
  platform: "aws_bedrock" | "gcp_vertex" | "azure_ai_foundry",
): Promise<PrivilegeCriteriaGoldenFile | null> {
  const { access, readFile } = await import("node:fs/promises");
  const path = await import("node:path");

  const fileMap = {
    aws_bedrock: "privilege-classification.aws-bedrock.json",
    gcp_vertex: "privilege-classification.gcp-vertex.json",
    azure_ai_foundry: "privilege-classification.azure-ai-foundry.json",
  } as const;

  const fullPath = path.join(process.cwd(), "config", "isc", "golden", fileMap[platform]);

  try {
    await access(fullPath);
    const raw = await readFile(fullPath, "utf8");
    return JSON.parse(raw) as PrivilegeCriteriaGoldenFile;
  } catch {
    return null;
  }
}
