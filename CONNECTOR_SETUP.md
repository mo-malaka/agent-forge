# AgentForge + SailPoint Identity Security Cloud

Connect AgentForge synthetic AI agents to Identity Security Cloud (ISC) using a **Web Services SaaS** source. No AWS, GCP, or Azure credentials are required.

**AgentForge demo URL:** `https://main.d12mzah9vzl24s.amplifyapp.com`

---

## What you will set up

1. A **Web Services SaaS** source in ISC
2. **HTTP operations** for test connection and account aggregation
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
3. Complete **Base Configuration** (source name, owner, etc.)
4. Open **Connection Settings**

### Authentication (no auth required)

AgentForge does not require authentication for demos. In ISC, configure this using **Custom Authentication** with all credential fields left blank:

| Setting | Value |
|---------|-------|
| **Authentication Type** | **Custom Authentication** |
| **Base URL** | `https://main.d12mzah9vzl24s.amplifyapp.com` |
| Username | *(leave blank)* |
| Password | *(leave blank)* |
| API Token | *(leave blank)* |
| Resource Owner Username | *(leave blank)* |
| Resource Owner Password | *(leave blank)* |
| Private Key | *(leave blank)* |

ISC treats empty custom authentication parameters as **no authentication** — you do not need Basic Auth, OAuth, or an API token for AgentForge.

5. Save **Connection Settings**

> There is no separate **Test Connection** button on this screen. You verify connectivity in Step 3 by creating a **Test Connection** HTTP operation.

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

**Expected response from AgentForge:**

```json
{
  "status": "ok",
  "service": "agent-forge",
  "timestamp": "..."
}
```

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

These dropdowns designate which attributes ISC uses as the unique account key and display name. You will see **Account ID** and **Account Name** badges next to those attributes in the schema table.

4. Click **Save**

---

## Step 5 — Run account aggregation

1. Go to **Account Management → Account Aggregation**
2. Click **Start Aggregation**
3. Wait for **Success**
4. Open **Account Management → Accounts**
5. Check **All**, **Correlated**, and **Uncorrelated** filters

You should see your synthetic agent (for example **DevOps-Bot-Prod**) with status **Enabled**.


