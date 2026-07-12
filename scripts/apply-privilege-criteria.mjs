#!/usr/bin/env node
/**
 * Apply golden privilege classification to a target ISC source (post SP-Config import).
 *
 * Usage:
 *   node scripts/apply-privilege-criteria.mjs \
 *     --tenant TARGET_TENANT \
 *     --token "$PAT" \
 *     --source-id NEW_SOURCE_ID \
 *     --golden config/isc/golden/privilege-classification.aws-bedrock.json
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { resolveIscAccessToken } from "./lib/isc-access-token.mjs";

function parseArgs(argv) {
  const args = {
    tenant: null,
    domain: "identitynow-demo.com",
    token: null,
    clientId: null,
    clientSecret: null,
    sourceId: null,
    golden: null,
    apiVersion: "v2026",
    dryRun: false,
  };

  for (let i = 2; i < argv.length; i += 1) {
    const flag = argv[i];
    const value = argv[i + 1];
    if (flag === "--tenant" && value) {
      args.tenant = value;
      i += 1;
    } else if (flag === "--domain" && value) {
      args.domain = value;
      i += 1;
    } else if (flag === "--token" && value) {
      args.token = value;
      i += 1;
    } else if (flag === "--client-id" && value) {
      args.clientId = value;
      i += 1;
    } else if (flag === "--client-secret" && value) {
      args.clientSecret = value;
      i += 1;
    } else if (flag === "--source-id" && value) {
      args.sourceId = value;
      i += 1;
    } else if (flag === "--golden" && value) {
      args.golden = value;
      i += 1;
    } else if (flag === "--api-version" && value) {
      args.apiVersion = value;
      i += 1;
    } else if (flag === "--dry-run") {
      args.dryRun = true;
    }
  }

  const hasToken = Boolean(args.token?.trim());
  const hasClient =
    Boolean(args.clientId?.trim() && args.clientSecret?.trim()) ||
    Boolean(process.env.ISC_CLIENT_ID?.trim() && process.env.ISC_CLIENT_SECRET?.trim());

  if (!args.tenant || !args.sourceId || !args.golden || (!hasToken && !hasClient)) {
    console.error(
      "Usage: node scripts/apply-privilege-criteria.mjs --tenant T --source-id ID --golden path.json",
    );
    console.error(
      "  Auth: --client-id ID --client-secret SECRET  (or ISC_CLIENT_ID + ISC_CLIENT_SECRET)",
    );
    process.exit(1);
  }

  return args;
}

function apiBase(args) {
  return `https://${args.tenant.trim()}.api.${args.domain.trim()}/${args.apiVersion}`;
}

async function iscFetch(args, path, options = {}) {
  const url = `${apiBase(args)}${path}`;
  if (args.dryRun && options.method && options.method !== "GET") {
    console.log(`[dry-run] ${options.method} ${path}`);
    return null;
  }

  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${args.token.trim()}`,
      Accept: "application/json",
      ...(options.headers ?? {}),
    },
  });

  const text = await response.text();
  let body = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }

  if (!response.ok) {
    throw new Error(
      `ISC ${options.method ?? "GET"} ${path} failed (${response.status}): ${
        typeof body === "string" ? body : JSON.stringify(body)
      }`,
    );
  }

  return body;
}

function asArray(payload) {
  if (Array.isArray(payload)) {
    return payload;
  }
  if (payload && typeof payload === "object" && Array.isArray(payload.items)) {
    return payload.items;
  }
  return [];
}

function buildConfigPatch(goldenConfig) {
  const patch = [
    { op: "replace", path: "/config/globalPrivilegeLevelEnabled", value: true },
  ];

  if (!goldenConfig || typeof goldenConfig !== "object") {
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

async function listCriteriaConfig(args) {
  const filter = encodeURIComponent(`sourceId eq "${args.sourceId}"`);
  const body = await iscFetch(
    args,
    `/criteria-config/privilege?filters=${filter}&count=true`,
  );
  return asArray(body);
}

async function main() {
  const args = parseArgs(process.argv);
  args.token = await resolveIscAccessToken({
    tenant: args.tenant,
    domain: args.domain,
    token: args.token,
    clientId: args.clientId,
    clientSecret: args.clientSecret,
  });

  const goldenPath = resolve(args.golden);
  const golden = JSON.parse(readFileSync(goldenPath, "utf8"));

  const configs = await listCriteriaConfig(args);
  if (configs.length === 0) {
    throw new Error(
      `No criteria-config record for source ${args.sourceId}. Import the source first and wait a few seconds.`,
    );
  }

  const target = configs[0];
  const criteriaConfigId = target.id;
  const patch = buildConfigPatch(golden.criteriaConfig?.config);

  console.log(`Patching criteria-config ${criteriaConfigId} (${patch.length} ops)...`);
  await iscFetch(args, `/criteria-config/privilege/${criteriaConfigId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json-patch+json" },
    body: JSON.stringify(patch),
  });

  const customRows = Array.isArray(golden.customCriteria) ? golden.customCriteria : [];
  for (const row of customRows) {
    const payload = {
      sourceId: args.sourceId,
      type: row.type ?? "CUSTOM",
      operator: row.operator ?? "OR",
      groups: row.groups ?? [],
      privilegeLevel: row.privilegeLevel,
    };

    console.log(`Creating custom criteria (${payload.privilegeLevel})...`);
    await iscFetch(args, "/criteria/privilege", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  }

  console.log("Privilege classification applied.");
  console.log("Re-run entitlement aggregation (outboundPermissions + inboundCallers) in ISC.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
