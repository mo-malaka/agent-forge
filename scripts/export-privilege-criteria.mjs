#!/usr/bin/env node
/**
 * Export privilege classification from a configured ISC source tenant.
 *
 * Usage:
 *   node scripts/export-privilege-criteria.mjs \
 *     --tenant company23447-poc \
 *     --domain identitynow-demo.com \
 *     --token "$PAT" \
 *     --source-id e3cbc0b8bc4c437e9ded4d24af46a871 \
 *     --platform aws_bedrock \
 *     --output config/isc/golden/privilege-classification.aws-bedrock.json
 */

import { writeFileSync } from "node:fs";
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
    platform: "aws_bedrock",
    apiVersion: "v2026",
    output: null,
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
    } else if (flag === "--platform" && value) {
      args.platform = value;
      i += 1;
    } else if (flag === "--api-version" && value) {
      args.apiVersion = value;
      i += 1;
    } else if (flag === "--output" && value) {
      args.output = value;
      i += 1;
    }
  }

  const hasToken = Boolean(args.token?.trim());
  const hasClient =
    Boolean(args.clientId?.trim() && args.clientSecret?.trim()) ||
    Boolean(process.env.ISC_CLIENT_ID?.trim() && process.env.ISC_CLIENT_SECRET?.trim());

  if (!args.tenant || !args.sourceId || !args.output || (!hasToken && !hasClient)) {
    console.error(
      "Usage: node scripts/export-privilege-criteria.mjs --tenant T --source-id ID --output path.json",
    );
    console.error(
      "  Auth: --client-id ID --client-secret SECRET   (PAT from Preferences — recommended)",
    );
    console.error(
      "    or: --token ACCESS_TOKEN   (pre-fetched JWT from oauth/token)",
    );
    console.error("    or: ISC_CLIENT_ID + ISC_CLIENT_SECRET env vars");
    process.exit(1);
  }

  return args;
}

function apiBase(args) {
  return `https://${args.tenant.trim()}.api.${args.domain.trim()}/${args.apiVersion}`;
}

async function iscFetch(args, path, options = {}) {
  const url = `${apiBase(args)}${path}`;
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

async function listCriteriaConfig(args) {
  const filter = encodeURIComponent(`sourceId eq "${args.sourceId}"`);
  const body = await iscFetch(
    args,
    `/criteria-config/privilege?filters=${filter}&count=true`,
  );
  return asArray(body);
}

async function listCustomCriteria(args) {
  const filter = encodeURIComponent(`sourceId eq "${args.sourceId}"`);
  try {
    const body = await iscFetch(args, `/criteria/privilege?filters=${filter}&count=true`);
    return asArray(body);
  } catch (error) {
    console.warn("Could not list /criteria/privilege:", error.message);
    return [];
  }
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

  const configs = await listCriteriaConfig(args);

  if (configs.length === 0) {
    console.error(
      `No privilege criteria config found for source ${args.sourceId}. Enable classification in ISC UI first, then re-export.`,
    );
    process.exit(1);
  }

  const criteriaConfig = configs[0];
  const customCriteria = await listCustomCriteria(args);

  const golden = {
    version: 1,
    description:
      "Golden privilege classification — export from source tenant; apply after SP-Config import with new source ID",
    platform: args.platform,
    exportedFrom: {
      tenant: args.tenant,
      sourceId: args.sourceId,
      exportedAt: new Date().toISOString(),
    },
    criteriaConfig: {
      id: criteriaConfig.id ?? null,
      config: criteriaConfig.config ?? null,
    },
    customCriteria: customCriteria.map((row) => ({
      type: row.type,
      operator: row.operator,
      privilegeLevel: row.privilegeLevel,
      groups: row.groups,
    })),
  };

  const outputPath = resolve(args.output);
  writeFileSync(outputPath, `${JSON.stringify(golden, null, 2)}\n`, "utf8");

  console.log(`Wrote ${outputPath}`);
  console.log(`  criteriaConfigId: ${criteriaConfig.id ?? "(unknown)"}`);
  console.log(`  globalPrivilegeLevelEnabled: ${criteriaConfig.config?.globalPrivilegeLevelEnabled ?? "?"}`);
  console.log(`  mode: ${criteriaConfig.config?.privilegeClassificationMode ?? "?"}`);
  console.log(`  customCriteria rows: ${customCriteria.length}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
