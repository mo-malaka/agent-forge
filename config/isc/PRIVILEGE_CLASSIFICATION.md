# Privilege classification — SP-Config vs API bootstrap

## Finding: SOURCE sp-config does **not** export privilege classification

We compared the maintainer **raw SOURCE exports** (`config/isc/exports/*.raw.json`) against the committed golden files. Neither file contains keys such as `privilege`, `classification`, `globalPrivilegeLevelEnabled`, or criteria trees — even when the **source tenant had privilege classification configured in the UI**.

| Artifact | `riskScore` in schema | Privilege classification settings |
|----------|----------------------|-----------------------------------|
| `exports/aws-bedrock.raw.json` | Yes | **No** |
| `golden/aws-bedrock.sp-config.json` | Yes | **No** |

ISC’s `includeTypes: ["SOURCE"]` export captures the Web Services connector shell (schemas, HTTP ops, aggregations). **Entitlement Management → Privilege Classification** is stored separately and must be applied via the **Privilege Criteria Configuration API** (v2026).

References:

- [Privilege Criteria Configuration API](https://developer.sailpoint.com/docs/api/v2026/privilege-criteria-configuration/)
- Custom criteria: `POST /criteria/privilege` (per-level criteria groups)

## Recommended bootstrap (two phases)

| Phase | What | How |
|-------|------|-----|
| **1** | Source connector | Existing golden SP-Config (Config Hub or API import) |
| **2** | Privilege classification | Export from golden **source tenant** → commit golden JSON → apply after import |

Phase 2 runs **after** the target source exists and you know its **new source ID** (IDs change per tenant).

## Maintainer: export from your configured source tenant

```bash
node scripts/export-privilege-criteria.mjs \
  --tenant YOUR_GOLDEN_TENANT \
  --domain identitynow-demo.com \
  --token "$ORG_ADMIN_PAT" \
  --source-id YOUR_BEDROCK_SOURCE_ID \
  --platform aws_bedrock \
  --output config/isc/golden/privilege-classification.aws-bedrock.json
```

Repeat for `gcp_vertex` and `azure_ai_foundry`. Commit the `privilege-classification.*.json` files.

The export captures:

- `criteriaConfig` — enable flag, classification mode, connector/custom toggles
- `customCriteria` — HIGH / MEDIUM / LOW custom criteria rows (if any)

## Demo user: apply after SP-Config import

**Option A — Setup UI (API import):** check **Apply privilege classification** and pass the **new** Bedrock source ID after import.

**Option B — CLI (maintainer / SE):**

```bash
node scripts/apply-privilege-criteria.mjs \
  --tenant TARGET_TENANT \
  --domain identitynow-demo.com \
  --token "$ORG_ADMIN_PAT" \
  --source-id NEW_SOURCE_ID_AFTER_IMPORT \
  --golden config/isc/golden/privilege-classification.aws-bedrock.json
```

Then re-run **entitlement aggregation** (`outboundPermissions` + `inboundCallers`) so direct privilege levels are assigned.

## AgentForge data prerequisites

Golden SP-Config already maps **`riskScore`** on entitlement types. For criteria on `privilegeLevel`, also map that attribute in the entitlement schema and group aggregation response (see CONNECTOR_SETUP Part M).

AgentForge’s entitlement API already returns both fields when present on agents.

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| Toggle off after import | Phase 2 not run | Run apply script or Setup checkbox |
| “No criteria config for source” | Source just created; ISC may lag | Wait ~30s, retry apply |
| All entitlements same level | `SINGLE_PRIVILEGE_LEVEL` mode | Re-export from tenant using **criteria** mode |
| Rings still missing | Entitlements not re-aggregated | Re-run outbound + inbound entitlement aggs |
