# Web Services SaaS + AgentForge Setup

Use this guide when running **AgentForge demos** with a **Web Services SaaS** source in Identity Security Cloud. No real AWS/GCP/Azure required.

---

## Why you see "Success" but 0 accounts

This is almost always a **response mapping** issue, not a connection issue:

1. **HTTP test passes** — ISC reaches AgentForge and gets JSON back
2. **"Found 1 account" in test** — the connector can see data in the response
3. **0 accounts after aggregation** — schema attributes (`id`, `name`, `nativeIdentity`) are not mapped correctly from the JSON path

Your screenshot also shows **Account Schema** and **Account Correlation** marked **Required** — those must be completed before accounts appear.

---

## Step 1: Use the Web Services account endpoint

Do **not** use the native-shape endpoints (`/api/connectors/aws-bedrock/agents`) for Web Services account aggregation. Use the flat account endpoint:

| Platform | Account aggregation URL |
|----------|-------------------------|
| AWS Bedrock | `GET /api/connectors/web-services/aws-bedrock/accounts` |
| GCP Vertex AI | `GET /api/connectors/web-services/gcp-vertex/accounts` |
| Azure AI Foundry | `GET /api/connectors/web-services/azure-ai-foundry/accounts` |

Example (AWS):

```
https://main.d12mzah9vzl24s.amplifyapp.com/api/connectors/web-services/aws-bedrock/accounts
```

Sample response:

```json
{
  "accounts": [
    {
      "id": "arn:aws:bedrock:us-east-1:123456789012:agent/agt_demo_aws_bedrock",
      "name": "DevOps-Bot-Prod",
      "displayName": "DevOps-Bot-Prod",
      "nativeIdentity": "arn:aws:bedrock:us-east-1:123456789012:agent/agt_demo_aws_bedrock",
      "status": "PREPARED",
      "agentId": "agt_demo_aws_bedrock",
      "archetype": "devops_bot",
      "platform": "AWS Bedrock"
    }
  ],
  "pagination": { "page": 1, "limit": 50, "total": 1, "has_more": false }
}
```

---

## Step 2: HTTP operation (account aggregation)

| Setting | Value |
|---------|-------|
| Method | `GET` |
| Authentication | None |
| URL | `/api/connectors/web-services/aws-bedrock/accounts` |
| Root path | `$.accounts[*]` |

> **Critical:** Root path must include `[*]` to iterate the array. Use `$.accounts[*]`, not `$.accounts` or `$.agentSummaries`.

---

## Step 3: Account schema

Go to **Account Management → Account Schema** and configure:

| Schema attribute | Response mapping | Notes |
|----------------|------------------|-------|
| `id` | `id` | Required — unique account ID |
| `name` | `name` | Required — set as **Identity Attribute** |
| `nativeIdentity` | `nativeIdentity` | Required for correlation |
| `displayName` | `displayName` | Optional |
| `status` | `status` | Optional |
| `agentId` | `agentId` | Optional |
| `platform` | `platform` | Optional |

**Identity Attribute** must be set (usually `name`). If `name` maps to a missing JSON field, ISC drops all accounts silently.

Response mappings are **relative to the root path** — do not prefix with `$.accounts[*].`:

```
id = id
name = name
nativeIdentity = nativeIdentity
```

---

## Step 4: Account correlation

Go to **Account Management → Account Correlation** and add a rule:

| Field | Value |
|-------|-------|
| Match account | `nativeIdentity` |
| To identity | `email` or `name` (your choice for demos) |

Save correlation rules before aggregating.

---

## Step 5: Run account aggregation

1. **Account Management → Account Aggregation → Start Aggregation**
2. Wait for **Success**
3. Go to **Accounts** — check **All**, **Correlated**, and **Uncorrelated** tabs

---

## Common mistakes

| Symptom | Fix |
|---------|-----|
| Test finds 1, aggregation shows 0 | Wrong root path — switch to `$.accounts[*]` on the **web-services** endpoint |
| Using `/api/connectors/aws-bedrock/agents` | Array is `agentSummaries`, not `accounts` — easy to mis-map |
| `id = $.accounts[*].id` in mapping | Remove prefix — use `id = id` when root path is `$.accounts[*]` |
| Identity attribute empty | Set Identity Attribute to `name` and map `name = name` |
| Schema still "Required" | Complete Account Schema + Account Correlation and save |
| Wrong platform URL | AWS source must use `web-services/aws-bedrock/accounts` |

---

## Debug checklist

1. Enable **Show Debug Info** on the Web Services source
2. Run account aggregation and inspect the raw response in logs
3. Confirm the response contains `"accounts": [...]` with at least one object
4. Validate JSON path `$.accounts[*]` in a JSONPath tester
5. Confirm `id`, `name`, and `nativeIdentity` are non-empty on every account object

---

## Verify AgentForge has data

```bash
curl -s "https://main.d12mzah9vzl24s.amplifyapp.com/api/connectors/web-services/aws-bedrock/accounts" | jq '.accounts | length'
```

Expected: `1` or more (seed includes `agt_demo_aws_bedrock`).
