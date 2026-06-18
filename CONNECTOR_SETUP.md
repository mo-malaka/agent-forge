# AgentForge + SailPoint Identity Security Cloud

Connect AgentForge synthetic AI agents to Identity Security Cloud (ISC) using a **Web Services SaaS** source. No AWS, GCP, or Azure credentials are required.

**AgentForge demo URL:** `https://main.d12mzah9vzl24s.amplifyapp.com`

---

## What you will set up

1. A **Web Services SaaS** source in ISC
2. An **account aggregation** that polls AgentForge
3. **Account schema** and **correlation** settings
4. Synthetic agent accounts visible under **Admin → Connections → Sources → Accounts**

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
3. Complete **Base Configuration** and **Connection Settings**
4. Set **Authentication** to **None** (AgentForge does not require auth for demos)
5. Set the **Base URL** to your AgentForge host, for example:
   ```
   https://main.d12mzah9vzl24s.amplifyapp.com
   ```
6. Run **Test Connection** and confirm it succeeds

---

## Step 3 — Configure account aggregation (HTTP operation)

1. Open **Source Setup → HTTP Operations**
2. Create or edit the **Account Aggregation** operation
3. Use these settings:

| Setting | Value |
|---------|-------|
| HTTP method | `GET` |
| URL path | `/api/connectors/web-services/aws-bedrock/accounts` |
| Authentication | None |

4. Under **Response Information**, set:

| Setting | Value |
|---------|-------|
| Root path | `$.accounts[*]` |

> The root path must include `[*]` so ISC iterates each object in the `accounts` array.

5. Under **Response Mapping**, map attributes **relative to the root path** (do not repeat the root path in each mapping):

| Schema attribute | Attribute path |
|------------------|----------------|
| `accountId` | `accountId` |
| `name` | `name` |
| `nativeIdentity` | `nativeIdentity` |

Optional attributes: `displayName`, `status`, `owner`, `platform`, `archetype`.

6. **Preview** or **Test** the operation — you should see at least one account with a non-empty `accountId`.

---

## Step 4 — Configure the account schema

1. Go to **Account Management → Account Schema**
2. Add the attributes your response mapping uses (minimum: `accountId`, `name`, `nativeIdentity`). Set each **Type** to `string`.
3. Open **Edit Account Schema** (panel on the right) and set:

| Field | Value |
|-------|-------|
| **Account ID** | `accountId` |
| **Account Name** | `name` |

These dropdowns designate which attributes ISC uses as the unique account key and display name. You will see **Account ID** and **Account Name** badges next to those attributes in the schema table.

4. Click **Save**

> **Note:** ISC uses **Account ID** and **Account Name** selectors in the schema editor — not checkboxes labeled “Identity Attribute.” Correlation to human identities is configured separately in Step 5.

---

## Step 5 — Configure account correlation

Correlation links aggregated accounts to **identities** in ISC. Aggregation works without correlation; uncorrelated accounts still appear under **Accounts → Uncorrelated**.

### Option A — Leave uncorrelated (simplest demo)

1. Go to **Account Management → Account Correlation**
2. Save with the default settings
3. After aggregation, open **Accounts** and filter by **Uncorrelated**

This is enough to demo synthetic agent accounts in ISC.

### Option B — Correlate by owner email

Use this when agent `owner` should match an identity email in ISC.

1. Add `owner` to the account schema (type: `string`) and map `owner = owner` in the HTTP operation
2. On **Account Correlation**, click **Add Criteria**:

| Identity attribute | Account attribute |
|--------------------|-------------------|
| `email` | `owner` |

3. Ensure a human identity exists with that email (seed agents use values like `platform-ops@sailpoint.com`)
4. Save and use **Test Account Correlation** to verify

### Option C — Correlate by name

| Identity attribute | Account attribute |
|--------------------|-------------------|
| `name` | `name` |

Only works if an identity with the same name exists (e.g. `DevOps-Bot-Prod`).

---

## Step 6 — Run account aggregation

1. Go to **Account Management → Account Aggregation**
2. Click **Start Aggregation**
3. Wait for **Success**
4. Open **Account Management → Accounts**
5. Check **All**, **Correlated**, and **Uncorrelated** filters

You should see your synthetic agent (for example **DevOps-Bot-Prod**) with status **Enabled**.

---

## Demo checklist

- [ ] Web Services source created and connection test passes
- [ ] Account aggregation URL uses `/web-services/.../accounts`
- [ ] Root path is `$.accounts[*]`
- [ ] Response mapping: `accountId`, `name`, `nativeIdentity`
- [ ] Account schema: **Account ID** = `accountId`, **Account Name** = `name`
- [ ] Account correlation saved
- [ ] Account aggregation completed successfully
- [ ] Account visible under **Accounts**

---

## Troubleshooting

### "KeyID cannot be empty"

The **Account ID** field is empty during aggregation.

| Check | Action |
|-------|--------|
| Endpoint | Use `/web-services/.../accounts`, not `/aws-bedrock/agents` |
| Root path | Must be `$.accounts[*]` |
| Response mapping | Use `accountId = accountId` (not `$.accounts[*].accountId`) |
| Account schema | **Account ID** dropdown must be set to `accountId` |
| Preview | Confirm `accountId` has a value like `agt_demo_aws_bedrock` |

### Aggregation succeeds but 0 accounts

Usually a response mapping or root path issue. Enable **Show Debug Info**, re-run aggregation, and confirm the raw JSON contains an `accounts` array with data.

### Account shows as Uncorrelated

Expected unless a correlation rule matches an identity. The account is still aggregated successfully — view it under **Uncorrelated**, or configure correlation in Step 5.

### Wrong JSON shape

| Wrong endpoint | Returns |
|----------------|---------|
| `/api/connectors/aws-bedrock/agents` | `agentSummaries[]` |
| `/api/connectors/web-services/aws-bedrock/accounts` | `accounts[]` ✓ |

Always use the **web-services** path for ISC account aggregation.

---

## Optional reference endpoints

These return cloud-native JSON shapes (Bedrock, Vertex, Foundry) for field-mapping walkthroughs. They are **not** used for Web Services account aggregation.

| Platform | Path |
|----------|------|
| AWS Bedrock | `/api/connectors/aws-bedrock/agents` |
| GCP Vertex AI | `/api/connectors/gcp-vertex/agents` |
| Azure AI Foundry | `/api/connectors/azure-ai-foundry/agents` |
| All platforms | `/api/agents` |

---

## Support

- AgentForge health: `GET /api/health`
- Account count check:

```bash
curl -s "https://main.d12mzah9vzl24s.amplifyapp.com/api/connectors/web-services/aws-bedrock/accounts" | jq '.accounts | length'
```

Expected: `1` or more on a fresh deploy (demo seed data).
