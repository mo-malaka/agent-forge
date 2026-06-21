# AgentForge + SailPoint Identity Security Cloud

Connect AgentForge synthetic AI agents to Identity Security Cloud (ISC) using a **Web Services SaaS** source. No AWS, GCP, or Azure credentials are required.

**AgentForge demo URL:** `https://main.d12mzah9vzl24s.amplifyapp.com`

---

## What you will set up

1. A **Web Services SaaS** source in ISC
2. **HTTP operations** for test connection, account aggregation, entitlement aggregation, and machine identity aggregation
3. **Account schema** with inbound/outbound access attributes
4. Synthetic agent accounts and AI agent identities visible in ISC and **Identity Graph**

---

## Before you begin

- AgentForge is reachable from your ISC tenant (use the public Amplify URL above)
- You have permission to create and configure sources in ISC
- Create **one Web Services source per cloud platform** you want to demo (e.g. one for AWS Bedrock agents)

Verify AgentForge is running:

```bash
curl -s https://main.d12mzah9vzl24s.amplifyapp.com/api/health
```

---

## Step 1 — Choose the correct endpoint

Use the **Web Services account** endpoints below. Do **not** use the cloud-native paths (`/api/connectors/aws-bedrock/agents`, etc.) for account aggregation.

| Platform | Path (append to base URL) |
|----------|---------------------------|
| AWS Bedrock | `/api/connectors/web-services/aws-bedrock/accounts` |
| Google Cloud Vertex AI | `/api/connectors/web-services/gcp-vertex/accounts` |
| Microsoft Azure AI Foundry | `/api/connectors/web-services/azure-ai-foundry/accounts` |

**AWS example (full URL):**

```
https://main.d12mzah9vzl24s.amplifyapp.com/api/connectors/web-services/aws-bedrock/accounts
```

Copy the matching URL from the AgentForge dashboard **Web Services account endpoints** section.

**Sample response:**

```json
{
  "accounts": [
    {
      "accountId": "agt_demo_aws_bedrock",
      "name": "DevOps-Bot-Prod",
      "displayName": "DevOps-Bot-Prod",
      "nativeIdentity": "arn:aws:bedrock:us-east-1:123456789012:agent/agt_demo_aws_bedrock",
      "status": "PREPARED",
      "owner": "platform-ops@sailpoint.com",
      "platform": "AWS Bedrock"
    }
  ]
}
```

---

## Step 2 — Create the Web Services source

1. Go to **Admin → Connections → Sources → Create source**
2. Select **Web Services SaaS**
3. Complete **Base Configuration** (source name, owner, etc.)
4. Open **Connection Settings**

### Authentication (no auth required)

AgentForge does not require authentication for demos. In ISC, configure this using **Custom Authentication** with all credential fields left blank:

| Setting | Value |
|---------|-------|
| **Authentication Type** | **Custom Authentication** |
| **Base URL** | `https://main.d12mzah9vzl24s.amplifyapp.com` |


5. Save **Connection Settings**

---

## Step 3 — Configure HTTP operations

Go to **Source Setup → HTTP Operations**. You need **two operations**: one to test connectivity, one to aggregate accounts.

### 3a — Test Connection operation

ISC uses an HTTP operation (not a standalone button) to verify the source is reachable.

1. Click **Add operation** (or **Create operation**)
2. Open the **General Information** tab and set:

| Field | Value |
|-------|-------|
| **Operation Name** | `Test Connection` |
| **Operation Type** | `Test Connection` |
| **Request Type** | `API` |
| **Context URL** | `/api/health` |
| **HTTP Method** | `GET` |

3. Leave **Header**, **Response Mapping**, and **XPath Namespace Mapping** empty unless your ISC version requires them
4. Save the operation
5. Run the test from **Review and Test** (or your source's test action) and confirm it succeeds


### 3b — Account Aggregation operation

1. Add a second HTTP operation
2. Open **General Information** and set:

| Field | Value |
|-------|-------|
| **Operation Name** | `Account Aggregation` *(or a descriptive name)* |
| **Operation Type** | `Account Aggregation` |
| **Request Type** | `API` |
| **Context URL** | `/api/connectors/web-services/aws-bedrock/accounts` |
| **HTTP Method** | `GET` |

Use the platform-specific path from Step 1 (e.g. `gcp-vertex` or `azure-ai-foundry` instead of `aws-bedrock`).

3. Open **Response Information** and set:

| Field | Value |
|-------|-------|
| **Root path** | `$.accounts[*]` |

> The root path must include `[*]` so ISC iterates each object in the `accounts` array.

4. Open **Response Mapping** and map attributes **relative to the root path** (do not repeat the root path in each mapping):

| Schema attribute | Attribute path |
|------------------|----------------|
| `accountId` | `accountId` |
| `name` | `name` |
| `nativeIdentity` | `nativeIdentity` |

Optional attributes: `displayName`, `status`, `owner`, `platform`, `archetype`.

5. Save the operation
6. **Preview** or **Test** the operation — you should see at least one account with a non-empty `accountId`

---

## Step 4 — Configure the account schema

1. Go to **Account Management → Account Schema**
2. Add the attributes your response mapping uses (minimum: `accountId`, `name`, `nativeIdentity`). Set each **Type** to `string`.
3. Open **Edit Account Schema** (panel on the right) and set:

| Field | Value |
|-------|-------|
| **Account ID** | `accountId` |
| **Account Name** | `name` |

4. Click **Save**

---

## Step 5 — Run account aggregation

1. Go to **Account Management → Account Aggregation**
2. Click **Start Aggregation**
3. Wait for **Success**
4. Open **Account Management → Accounts**
5. Check **All**, **Correlated**, and **Uncorrelated** filters

You should see your synthetic agent (for example **DevOps-Bot-Prod**) with status **Enabled**.

---

## Step 6 — Inbound and outbound access (Option C)

AgentForge exposes **outbound** access (what the agent can reach) and **inbound** access (who can invoke the agent). Use these for Identity Graph and Agent Identity Security demos.

### Account payload fields

Each account in `GET /api/connectors/web-services/{platform}/accounts` now includes:

| Field | Direction | Example |
|-------|-----------|---------|
| `outboundPermissions` | Outbound | `["S3:Read", "Jira:Admin"]` |
| `inboundCallers` | Inbound | `["invoke:engineering-team"]` |
| `identityName` | Machine identity | Same as agent display name |

**Sample account with access:**

```json
{
  "accountId": "agt_demo_aws_bedrock",
  "name": "DevOps-Bot-Prod",
  "nativeIdentity": "arn:aws:bedrock:us-east-1:123456789012:agent/agt_demo_aws_bedrock",
  "identityName": "DevOps-Bot-Prod",
  "owner": "platform-ops@sailpoint.com",
  "outboundPermissions": ["S3:Read", "Jira:Admin"],
  "inboundCallers": ["invoke:engineering-team", "invoke:service-now-workflow"]
}
```

### 6a — Mark access fields as entitlements on the account schema

1. Go to **Account Management → Account Schema**
2. Add multi-valued string attributes:
   - `outboundPermissions` (entitlement type: **outbound** or **permission**)
   - `inboundCallers` (entitlement type: **inbound** or **permission**)
3. Map them in your **Account Aggregation** response mapping:

| Schema attribute | Attribute path |
|------------------|----------------|
| `outboundPermissions` | `outboundPermissions` |
| `inboundCallers` | `inboundCallers` |

4. Re-run account aggregation

### 6b — Entitlement catalog aggregation

Add **Group Aggregation** HTTP operations for the entitlement catalog.

| Platform | Context URL |
|----------|-------------|
| AWS Bedrock | `/api/connectors/web-services/aws-bedrock/entitlements` |
| GCP Vertex | `/api/connectors/web-services/gcp-vertex/entitlements` |
| Azure AI Foundry | `/api/connectors/web-services/azure-ai-foundry/entitlements` |

**Root path:** `$.entitlements[*]`

**Response mapping:**

| Schema attribute | Attribute path |
|------------------|----------------|
| `entitlementId` | `entitlementId` |
| `name` | `name` |
| `accessDirection` | `accessDirection` |
| `riskScore` | `riskScore` |

Create **two entitlement types** in ISC (e.g. `outbound` and `inbound`), then add separate group aggregation operations:

- Outbound catalog: `GET .../entitlements?type=outbound`
- Inbound catalog: `GET .../entitlements?type=inbound`

**Sample entitlement:**

```json
{
  "entitlementId": "ent_s3_read",
  "name": "S3:Read",
  "accessDirection": "outbound",
  "riskScore": 3
}
```

### 6c — Machine identity aggregation (reuse accounts endpoint)

You do **not** need a separate AgentForge URL for machine identities. Point **Machine Identity Aggregation** at the same accounts endpoint:

| Field | Value |
|-------|-------|
| **Context URL** | `/api/connectors/web-services/aws-bedrock/accounts` |
| **Root path** | `$.accounts[*]` |

Map machine identity schema attributes:

| Machine identity attribute | Account path |
|----------------------------|--------------|
| Native Identity | `nativeIdentity` |
| Identity Name | `identityName` |
| Owner | `owner` |

Ensure `nativeIdentity` matches between account aggregation and machine identity aggregation so ISC correlates the AI agent identity to its source account.

### 6d — Identity Graph demo flow

1. Bulk-create agents in AgentForge (or use seed agents)
2. Run **Machine Identity Aggregation** → agents appear under **Admin → Identities → AI Agents**
3. Run **Account Aggregation** → correlate accounts to agent identities
4. Run **Entitlement Aggregation** (outbound + inbound types)
5. Open an AI agent → **View in Identity Graph**
6. Show **outbound** path (agent → account → permissions) and **inbound** path (user entitlements → agent)

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| No outbound/inbound on account | Re-run account aggregation after schema update; bulk-create new agents if testing locally |
| Entitlement catalog empty | Ensure agents have `outboundPermissions` / `inboundCallers`; check `?type=` filter |
| Agent not in Identity Graph | Run machine identity aggregation; confirm AIS is licensed |
| Account not linked to agent | Verify `nativeIdentity` is identical on account and machine identity |

