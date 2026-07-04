# AgentForge + SailPoint Identity Security Cloud

Connect AgentForge synthetic AI agents to Identity Security Cloud (ISC) using a **Web Services SaaS** source. No AWS, GCP, or Azure credentials are required.

**AgentForge demo URL:** `https://main.d12mzah9vzl24s.amplifyapp.com`  
**Setup guide on site:** `/setup`

---

## What this demo proves

| Concept | Meaning in AgentForge | Where to show it in ISC |
|---------|----------------------|-------------------------|
| **Outbound access** | What the agent can reach (`S3:Read`, `Jira:Admin`) | **AI Agent → Access** (`outboundPermissions`) |
| **Inbound access** | Who can invoke the agent (`invoke:engineering-team`) | **AI Agent → Access** (`inboundCallers`) |
| **Agent identity** | The governed AI agent | **Admin → Identities → AI Agents** |
| **Source account** | The connector account backing the agent | **Sources → Accounts** |
| **Provisioning** | ISC applies access changes back to AgentForge | **Access profiles / certifications → provisioning** |
| **Authorization** | Runtime allow/deny against effective access | **AgentForge authorize API + simulate panel** |
| **ISC orchestrator** | One-click sync and govern + enforce from AgentForge | **Dashboard → ISC demo orchestrator** |

**Primary demo screen:** **AI Agent → Access** (not Identity Graph). Identity Graph is optional; Web Services account entitlements often appear on the Access tab but not as expandable nodes on the agent-root graph.

After provisioning, re-run **account aggregation** so ISC reflects updated entitlements or disabled status. The **ISC demo orchestrator** can run aggregations and authorization steps for you — no Postman required.

---

## Choose your demo tier

| Tier | What you get | Extra ISC setup |
|------|----------------|-----------------|
| **Tier 1 — Bedrock only** | Hero agent with ~14 entitlements on **one** source (`AI Agents Bedrock`). Good for govern + enforce. | **No new HTTP operations** — use your existing Bedrock source. Reset hero data + re-aggregate. |
| **Tier 2 — Full hero** | Multi-source **AI Agent → Access** and **Accounts** like the reference screenshots (AWS IAM, Google Workspace, Entra ID, AD). Rich Identity Graph. | **3–4 additional Web Services sources**, new entitlement types, and HTTP operations per source ([Part L](#part-l--synthetic-sources-optional-multi-source-hero)). |

> **If you only configured the Bedrock source (Parts B–F), Tier 1 is expected.** Tier 2 is optional and matches the multi-source screenshots you shared.

---

## Prerequisites

- AgentForge reachable from your ISC tenant
- Permission to create and configure sources in ISC
- **Agent Identity Security (AIS)** licensed on your tenant
- Create **one Web Services source per platform** you demo (e.g. AWS Bedrock)
- For the **ISC demo orchestrator**: API client credentials with source, account, entitlement, and machine-identity scopes (see [Part K](#part-k--isc-demo-orchestrator))

Verify AgentForge:

```bash
curl -s https://main.d12mzah9vzl24s.amplifyapp.com/api/health
```

---

## Part A — Prepare data in AgentForge

### A0 — Load hero agents (Phase 1 — do this first)

AgentForge ships three **hero agents** with rich metadata, linked accounts, and extended entitlements:

| Platform | Agent name | Agent ID |
|----------|------------|----------|
| AWS Bedrock | `CloudOps-Navigator:Infra-DevOps-Agent` | `agt_demo_aws_bedrock` |
| GCP Vertex | `sw-bug-assistant-25924` | `agt_demo_gcp_vertex` |
| Azure Foundry | `Frontline-Support-Bot` | `agt_demo_azure_foundry` |

**Reset to hero seed:**

1. Open AgentForge → **/demo**
2. Click **Reset demo agent**
3. Choose scope **full-store** (removes bulk agents, restores the 3 heroes)
4. Confirm the AWS hero name is `CloudOps-Navigator:Infra-DevOps-Agent`

Or via API:

```bash
curl -s -X POST https://YOUR_AGENTFORGE_URL/api/demo/reset \
  -H "Content-Type: application/json" \
  -d '{"scope":"full-store","remove_bulk_agents":true}'
```

**Verify locally:**

```bash
curl -s https://YOUR_AGENTFORGE_URL/api/agents/agt_demo_aws_bedrock | jq '.agent.name, (.agent.extended_entitlements | length), (.agent.linked_accounts | length)'
```

Expected: name `CloudOps-Navigator:Infra-DevOps-Agent`, ~14 extended entitlements, 3 linked accounts.

### A1 — Bulk-create agents (optional)

**Option 1 — ISC demo orchestrator (recommended after one-time ISC setup):**

1. Configure ISC env vars on AgentForge (see [Part K](#part-k--isc-demo-orchestrator))
2. Open the dashboard → **ISC demo orchestrator** → **Run full sync**

This bulk-creates agents and runs ISC aggregations in order.

**Option 2 — Manual bulk create:**

1. Open the AgentForge dashboard
2. Use **Quick bulk create** — pick platform and **5, 10, or 20** agents
3. Each agent gets random **outbound** permissions and **inbound** callers

Or use the three hero seed agents on a fresh install (see [A0](#a0--load-hero-agents-phase-1--do-this-first)).

### A2 — Understand the payloads

**Accounts** (`GET /api/connectors/web-services/{platform}/accounts`):

| Field | Purpose |
|-------|---------|
| `accountId` | Short stable ID (`agt_xxx`) — map to Account ID |
| `nativeIdentity` | Cloud ARN / resource ID — **must match** machine identity Native Identity |
| `identityName` | Display name for machine identity aggregation |
| `outboundPermissions` | Outbound access (multi-valued) |
| `inboundCallers` | Inbound access (multi-valued) |

**Entitlements** (`GET /api/connectors/web-services/{platform}/entitlements`):

| Query | Purpose |
|-------|---------|
| (none) | All entitlements |
| `?type=outbound` | Outbound catalog only |
| `?type=inbound` | Inbound catalog only |

Root path for entitlements: `$.entitlements[*]`

### A3 — Endpoint reference

| Platform | Accounts | Entitlements |
|----------|----------|--------------|
| AWS Bedrock | `/api/connectors/web-services/aws-bedrock/accounts` | `/api/connectors/web-services/aws-bedrock/entitlements` |
| GCP Vertex | `/api/connectors/web-services/gcp-vertex/accounts` | `/api/connectors/web-services/gcp-vertex/entitlements` |
| Azure AI Foundry | `/api/connectors/web-services/azure-ai-foundry/accounts` | `/api/connectors/web-services/azure-ai-foundry/entitlements` |

**Synthetic sources (Tier 2 only)** — see [Part L](#part-l--synthetic-sources-optional-multi-source-hero):

| Source | Accounts | Entitlements |
|--------|----------|--------------|
| AWS IAM | `/api/connectors/web-services/synthetic/aws-iam/accounts` | `.../entitlements` |
| Google Workspace | `/api/connectors/web-services/synthetic/google-workspace/accounts` | `.../entitlements` |
| Entra ID | `/api/connectors/web-services/synthetic/entra-id/accounts` | `.../entitlements` |
| Active Directory | `/api/connectors/web-services/synthetic/active-directory/accounts` | `.../entitlements` |

**Sample account (hero AWS Bedrock):**

```json
{
  "accountId": "acct_aws_bedrock_primary",
  "name": "CloudOps-Navigator:LVA0UBIDXW",
  "nativeIdentity": "arn:aws:bedrock:us-west-2:718666815581:agent-alias/OBK4WA6JJN/LVA0UBIDXW",
  "identityName": "CloudOps-Navigator:Infra-DevOps-Agent",
  "machineIdentity": "CloudOps-Navigator:Infra-DevOps-Agent",
  "sourceName": "AWS Bedrock - spciem",
  "owner": "mostafa.helmy@sailpoint.com",
  "outboundPermissions": ["S3:Read", "Jira:Admin", "EC2:Describe", "Bedrock:InvokeModel"],
  "inboundCallers": ["invoke:engineering-team", "invoke:service-now-workflow"]
}
```

**Sample entitlement (extended — Tier 2 sources):**

```json
{
  "entitlementId": "ent_aws_security_audit",
  "name": "SecurityAudit",
  "attributeName": "AWSManagedPolicies",
  "attributeValue": "arn:aws:iam::aws:policy/SecurityAudit",
  "sourceName": "AWS IAM - spciem",
  "accountName": "AmazonBedrockExecutionRoleForAgents",
  "accessDirection": "outbound",
  "riskScore": 5
}
```

> **Linking rule:** Account entitlement values (`S3:Read`) must match the **Entitlement ID** field in your entitlement type schema. Set **Entitlement ID = `name`** on both `outboundPermissions` and `inboundCallers` entitlement types (see Step 5).

---

## Part B — Create the Web Services source

1. **Admin → Connections → Sources → Create source**
2. Select **Web Services SaaS**
3. Complete base configuration
4. **Connection Settings → Authentication:**

| Setting | Value |
|---------|-------|
| **Authentication Type** | Custom Authentication |
| **Base URL** | `https://main.d12mzah9vzl24s.amplifyapp.com` |

Leave credential fields blank. Save.

---

## Part C — Entitlement types (do this before account entitlements)

ISC allows **only one account attribute per entitlement type**. Do **not** set both `outboundPermissions` and `inboundCallers` to type `group` — you will get *"Multiple Entitlement attributes with same type present"*.

### C1 — Create entitlement type `outboundPermissions`

1. **Entitlement Management → Entitlement Types → Add**
2. Name: **`outboundPermissions`**
3. Add schema attributes: `entitlementId` (string), `name` (string), optional `riskScore` (string)
4. Edit entitlement type settings:

| Setting | Value |
|---------|-------|
| **Entitlement ID** | `name` |
| **Entitlement Name** | `name` |

### C2 — Create entitlement type `inboundCallers`

Same steps, name **`inboundCallers`**, same schema shape, **Entitlement ID = `name`**.

---

## Part D — HTTP operations

Go to **Source Setup → HTTP Operations**. Create **five** operations.

### D1 — Test Connection

| Field | Value |
|-------|-------|
| **Operation Type** | Test Connection |
| **Context URL** | `/api/health` |
| **HTTP Method** | `GET` |

### D2 — Account Aggregation

| Field | Value |
|-------|-------|
| **Operation Type** | Account Aggregation |
| **Context URL** | `/api/connectors/web-services/aws-bedrock/accounts` |
| **HTTP Method** | `GET` |
| **Root path** | `$.accounts[*]` |

**Response mapping** (paths relative to each account — do not prefix with `$.accounts[*]`):

| Schema attribute | Attribute path |
|------------------|----------------|
| `accountId` | `accountId` |
| `name` | `name` |
| `nativeIdentity` | `nativeIdentity` |
| `identity` | `identity` |
| `backendId` | `backendId` |
| `displayName` | `displayName` |
| `identityName` | `identityName` |
| `status` | `status` |
| `owner` | `owner` |
| `platform` | `platform` |
| `archetype` | `archetype` |
| `outboundPermissions` | `outboundPermissions` |
| `inboundCallers` | `inboundCallers` |

Preview/test — confirm `outboundPermissions` and `inboundCallers` appear as arrays.

### D2.5 — Group Aggregation (required for API / orchestrator)

The ISC API `POST /entitlements/aggregate/sources/{id}` triggers the **default** operation type **`Group Aggregation`** — not `Group Aggregation-outboundPermissions`.

If you only configure typed group aggregation ops (D3/D4), the API and AgentForge orchestrator will fail with:

> No configuration found for 'Group Aggregation'. Please add at least one operation and try again.

Add **one extra** HTTP operation for API-driven outbound entitlement sync:

| Field | Value |
|-------|-------|
| **Operation Type** | **Group Aggregation** |
| **Context URL** | `/api/connectors/web-services/aws-bedrock/entitlements?type=outbound` |
| **HTTP Method** | `GET` |
| **Root path** | `$.entitlements[*]` |

Use the **same response mapping** as D3.

**Also configure the default `group` entitlement type** (this op aggregates as object type `group`, not `outboundPermissions`):

1. **Entitlement Management → Entitlement Types → group** (default)
2. Set **Entitlement ID** = `name` and **Entitlement Name** = `name`
3. In the **Group Aggregation** HTTP op response mapping, include at minimum:

| Schema attribute | Attribute path |
|------------------|----------------|
| `name` | `name` |
| `entitlementId` | `entitlementId` |
| `id` | `id` |
| `value` | `value` |
| `accessDirection` | `accessDirection` |
| `riskScore` | `riskScore` |

> If you see **`KeyID cannot be empty`** during Group Aggregation, the default `group` entitlement type Entitlement ID field does not match any populated attribute in the HTTP response mapping. Align Entitlement ID = `name` and map `name` → `name`.

> **Inbound** (`inboundCallers`) cannot be triggered by this API on Web Services sources. Run it manually: **Source → Entitlement Aggregation → Specific Types → inboundCallers**.

**Simpler alternative:** Skip the generic **Group Aggregation** op entirely. Run **Group Aggregation - outboundPermissions** and **Group Aggregation - inboundCallers** from the ISC UI (Specific Types). The AgentForge orchestrator marks inbound as manual and can skip the API outbound step too.

### D3 — Group Aggregation — outboundPermissions

| Field | Value |
|-------|-------|
| **Operation Type** | **Group Aggregation - outboundPermissions** |
| **Context URL** | `/api/connectors/web-services/aws-bedrock/entitlements?type=outbound` |
| **HTTP Method** | `GET` |
| **Root path** | `$.entitlements[*]` |

| Schema attribute | Attribute path |
|------------------|----------------|
| `entitlementId` | `entitlementId` |
| `name` | `name` |
| `accessDirection` | `accessDirection` |
| `riskScore` | `riskScore` |

> If aggregation fails with *"No configuration found for Group Aggregation-outboundPermissions"*, this operation is missing or the operation type name does not match the entitlement type name exactly.

### D4 — Group Aggregation — inboundCallers

| Field | Value |
|-------|-------|
| **Operation Type** | **Group Aggregation - inboundCallers** |
| **Context URL** | `/api/connectors/web-services/aws-bedrock/entitlements?type=inbound` |
| **HTTP Method** | `GET` |
| **Root path** | `$.entitlements[*]` |

Same response mapping as D3.

### D5 — Machine Identity Aggregation

No separate AgentForge URL — reuse the **accounts** endpoint.

| Field | Value |
|-------|-------|
| **Operation Type** | **Machine Identity Aggregation - {schema name}** (e.g. `bedrock-agent`) |
| **Context URL** | `/api/connectors/web-services/aws-bedrock/accounts` |
| **HTTP Method** | `GET` |
| **Root path** | `$.accounts[*]` |

| Machine identity attribute | Attribute path |
|----------------------------|----------------|
| Native Identity | `nativeIdentity` (or `backendId` if your schema uses that) |
| Identity Name | `identityName` |
| `backendId` | `backendId` |
| `identity` | `identity` |
| `owner` | `owner` |
| `platform` | `platform` |

Map **`nativeIdentity`** to the ARN field, **not** `accountId`.

---

## Part E — Schemas

### E1 — Account schema

**Account Management → Account Schema**

| Attribute | Type | Entitlement | Multi-valued |
|-----------|------|-------------|--------------|
| `accountId` | string | No | No |
| `name` | string | No | No |
| `nativeIdentity` | string | No | No |
| `outboundPermissions` | **outboundPermissions** | Yes | Yes |
| `inboundCallers` | **inboundCallers** | Yes | Yes |

**Edit Account Schema:** Account ID = `accountId`, Account Name = `name`.

### E2 — Machine identity schema

**Machine Identities → Machine Identity Schemas → Create** (e.g. `bedrock-agent`)

Add attributes, then **Actions → Edit Type**:

| Setting | Attribute |
|---------|-----------|
| **Native Identifier** | `nativeIdentity` |
| **Identity Name** | `identityName` |

The schema name must match the suffix in **Machine Identity Aggregation - {schema name}**.

---

## Part F — Run aggregations (order matters)

**Manual (ISC UI):**

```
1. Group Aggregation → outboundPermissions
2. Group Aggregation → inboundCallers
3. Machine Identity Aggregation → bedrock-agent (Specific Schemas — not "All" if no schemas exist)
4. Account Aggregation
```

**Automated (AgentForge orchestrator):** **Run full sync** on the dashboard runs the same sequence via ISC v2026 APIs, including entitlement aggregation twice and machine account mappings. See [Part K](#part-k--isc-demo-orchestrator).

**Machine identity aggregation:** If you see *`Illegal value "" for field "datasetIds"`*, you have no machine identity schema selected. Choose **Specific Schemas** and pick your schema (e.g. `bedrock-agent`).

### Verify after aggregation

| Check | Location | Expected |
|-------|----------|----------|
| Entitlement catalog | Source → Entitlements or Access Model | S3:Read, invoke:engineering-team, etc. |
| Accounts | Source → Accounts | DevOps-Bot-Prod enabled |
| Entitlement assignments | Account → Entitlement Assignments | 6 items (not empty) |
| AI agents | Admin → AI Agents | DevOps-Bot-Prod listed |

---

## Part G — Link account to AI agent

Correlating in **Machine Accounts** alone may not populate **AI Agent → Accounts**.

**Automated:** **Run full sync** applies machine account mappings via `PUT /v2026/sources/{sourceId}/machine-account-mappings` (nativeIdentity → nativeIdentity). See [Part K](#part-k--isc-demo-orchestrator).

**Manual:**

1. **Admin → Identities → AI Agents → DevOps-Bot-Prod**
2. **Accounts** tab → link **AgentForge Bedrock** account  
   — or edit the source account → **Machine Identity** → pick **DevOps-Bot-Prod**

If multiple **DevOps-Bot-Prod** entries appear in the dropdown, pick the one whose native/cloud identity **matches the account ARN**.

**nativeIdentity must align:** Account `nativeIdentity` (ARN) = AI Agent `cloudIdentity`. If regions differ (`us-east-1` vs `us-west-2`), auto-linking fails. AgentForge seed agents use `us-east-1`; bulk-created AWS agents default to `us-east-1` for consistency.

---

## Part H — Demo walkthrough (inbound / outbound access)

### Hero screen — AI Agent → Access

1. **Admin → Identity Management → Identities → AI Agents**
2. Open **DevOps-Bot-Prod**
3. **Access** tab

**Outbound talk track:**

> These are outbound permissions — what this agent can reach in connected systems.

Show: `S3:Read`, `EC2:Describe`, `Jira:Admin`, `Bedrock:InvokeModel` (attribute `outboundPermissions`).

**Inbound talk track:**

> These are inbound callers — principals allowed to invoke this agent.

Show: `invoke:engineering-team`, `invoke:service-now-workflow` (attribute `inboundCallers`).

### Supporting screens

| Screen | Purpose |
|--------|---------|
| Source account → Attributes | Raw connector data |
| Source account → Entitlement Assignments | Proves catalog linking worked |
| Source → Entitlements | Entitlement catalog |
| AgentForge dashboard | Bulk create + copy endpoints |

### Identity Graph (optional)

- Open from **AI Agent → View in Identity Graph**
- Agent-root graph may show **0 Direct Entitlements** — expected for Web Services account-scoped entitlements
- **Do not** add Account ID filters unless you know the graph’s internal ID (wrong filter = empty graph)
- Alternative: **Home → Identity Graph** → search `S3:Read` for reverse path
- Alternative: open graph from **Machine Accounts** row (account-centric view)

**One-liner for audiences:**

> Entitlements are the individual permissions; access is the full inbound/outbound picture. AIS shows that on the agent Access tab.

---

## Part I — Provisioning (add/remove entitlement, disable agent)

AgentForge implements **write-back** so ISC provisioning plans can change agent access and status. After a provision completes, re-run **account aggregation** on the source.

### I1 — HTTP operations to add

Go to **Source Setup → HTTP Operations** and create **five** additional operations (same base URL as aggregation).

#### Add Entitlement — outboundPermissions

| Field | Value |
|-------|-------|
| **Operation Type** | **Add Entitlement - outboundPermissions** |
| **Context URL** | `/api/connectors/web-services/aws-bedrock/provision/add-entitlement` |
| **HTTP Method** | `POST` |
| **Content-Type** | `application/json` |

**Request body mapping** (ISC plan variables):

| Body field | Value |
|------------|-------|
| `nativeIdentity` | `$plan.nativeIdentity$` |
| `accountId` | `$plan.accountId$` |
| `outboundPermissions` | `$plan.outboundPermissions$` |

AgentForge also accepts `entitlement` + `entitlementType: outboundPermissions`.

#### Add Entitlement — inboundCallers

| Field | Value |
|-------|-------|
| **Operation Type** | **Add Entitlement - inboundCallers** |
| **Context URL** | `/api/connectors/web-services/aws-bedrock/provision/add-entitlement` |
| **HTTP Method** | `POST` |

| Body field | Value |
|------------|-------|
| `nativeIdentity` | `$plan.nativeIdentity$` |
| `inboundCallers` | `$plan.inboundCallers$` |

#### Remove Entitlement — outboundPermissions / inboundCallers

| Operation Type | Context URL |
|----------------|-------------|
| **Remove Entitlement - outboundPermissions** | `/api/connectors/web-services/aws-bedrock/provision/remove-entitlement` |
| **Remove Entitlement - inboundCallers** | `/api/connectors/web-services/aws-bedrock/provision/remove-entitlement` |

Same body mapping as add, using the entitlement attribute being removed.

#### Disable Account

| Field | Value |
|-------|-------|
| **Operation Type** | **Disable Account** |
| **Context URL** | `/api/connectors/web-services/aws-bedrock/provision/disable-account` |
| **HTTP Method** | `POST` |

| Body field | Value |
|------------|-------|
| `nativeIdentity` | `$plan.nativeIdentity$` |
| `accountId` | `$plan.accountId$` |

Sets agent status to **inactive**. Account aggregation returns platform-native disabled status (`FAILED` on Bedrock, `DELETED` on Vertex, `Failed` on Azure).

#### Enable Account (optional)

| Field | Value |
|-------|-------|
| **Operation Type** | **Enable Account** |
| **Context URL** | `/api/connectors/web-services/aws-bedrock/provision/enable-account` |
| **HTTP Method** | `POST` |

Same body as disable. Restores `active` status.

#### Get Object (optional)

| Field | Value |
|-------|-------|
| **Operation Type** | **Get Object** |
| **Context URL** | `/api/connectors/web-services/aws-bedrock/account?nativeIdentity=$plan.nativeIdentity$` |
| **HTTP Method** | `GET` |

Root path: `$.account` or `$.object`.

### I2 — Test provisioning with curl

Replace `NATIVE_IDENTITY` with an agent ARN from account aggregation:

```bash
# Add outbound permission
curl -s -X POST https://main.d12mzah9vzl24s.amplifyapp.com/api/connectors/web-services/aws-bedrock/provision/add-entitlement \
  -H "Content-Type: application/json" \
  -d '{"nativeIdentity":"NATIVE_IDENTITY","outboundPermissions":"DynamoDB:Read"}'

# Remove outbound permission
curl -s -X POST https://main.d12mzah9vzl24s.amplifyapp.com/api/connectors/web-services/aws-bedrock/provision/remove-entitlement \
  -H "Content-Type: application/json" \
  -d '{"nativeIdentity":"NATIVE_IDENTITY","outboundPermissions":"Jira:Admin"}'

# Disable agent account
curl -s -X POST https://main.d12mzah9vzl24s.amplifyapp.com/api/connectors/web-services/aws-bedrock/provision/disable-account \
  -H "Content-Type: application/json" \
  -d '{"nativeIdentity":"NATIVE_IDENTITY"}'
```

Successful responses include `success: true` and an updated `account` object.

### I3 — Demo flow with ISC

1. Create an **access profile** with outbound entitlements (e.g. add `DynamoDB:Read`)
2. Assign the profile to a user and provision to the linked AI agent account
3. Re-run **account aggregation**
4. Open **AI Agent → Access** — new outbound permission appears
5. Run a **certification** or manual revoke to remove `Jira:Admin`
6. Re-aggregate — permission disappears on the Access tab
7. **Disable** the account via provisioning — account shows disabled in **Sources → Accounts**

### I4 — Direct AgentForge API (optional)

`PATCH /api/agents/{id}` accepts:

```json
{
  "status": "inactive",
  "entitlements": ["S3:Read", "EC2:Describe"],
  "inbound_access": ["invoke:engineering-team"]
}
```

Useful for local testing without ISC.

---

## Part J — Simulate authorization (Phase 3)

AgentForge evaluates **effective access** at runtime: assert a principal and requested permission, get **allow** or **deny**. This simulates enforcement after ISC governance — without connecting to real cloud APIs.

### J1 — Authorize API

```
POST /api/agents/{id}/authorize
```

**Outbound** (what the agent can reach):

```json
{
  "principal": "DevOps-Bot-Prod",
  "direction": "outbound",
  "resource": "S3",
  "action": "Read"
}
```

Or use a full permission string:

```json
{
  "principal": "DevOps-Bot-Prod",
  "direction": "outbound",
  "permission": "S3:Read"
}
```

**Inbound** (who can invoke the agent):

```json
{
  "principal": "jane.doe@sailpoint.com",
  "direction": "inbound",
  "action": "invoke",
  "caller": "invoke:engineering-team"
}
```

### J2 — Evaluation rules

| Check | Result |
|-------|--------|
| Agent `status` is `inactive` | **deny** (`agent_disabled`) |
| Outbound: `Resource:Action` not in `outboundPermissions` | **deny** (`agent_outbound_allowlist`) |
| Inbound: `caller` not in `inboundCallers` | **deny** (`agent_inbound_allowlist`) |
| Match found | **allow** |

Responses use HTTP **200** for allow and **403** for deny. The JSON body always includes `decision`, `reason`, `policy`, and `effective_access`.

### J3 — Demo flow (govern → provision → enforce)

**Automated:** After full sync, use **Run govern + enforce** on the dashboard. It runs authorize allow → revoke entitlement (AgentForge) → unoptimized account aggregation → authorize deny.

**Manual:**

1. **Before revoke:** authorize `S3:Read` → **allow**
2. **Certify / revoke** `Jira:Admin` in ISC → provisioning removes it → re-aggregate
3. Authorize `Jira:Admin` → **deny** (no longer in effective outbound)
4. **Disable** agent via provisioning → authorize any request → **deny** (`agent_disabled`)

```bash
AGENT_ID=agt_xxx

# Allow outbound read
curl -s -X POST https://main.d12mzah9vzl24s.amplifyapp.com/api/agents/$AGENT_ID/authorize \
  -H "Content-Type: application/json" \
  -d '{"principal":"DevOps-Bot-Prod","direction":"outbound","permission":"S3:Read"}'

# Deny after revoke
curl -s -X POST https://main.d12mzah9vzl24s.amplifyapp.com/api/agents/$AGENT_ID/authorize \
  -H "Content-Type: application/json" \
  -d '{"principal":"DevOps-Bot-Prod","direction":"outbound","permission":"Jira:Admin"}'

# Inbound allow
curl -s -X POST https://main.d12mzah9vzl24s.amplifyapp.com/api/agents/$AGENT_ID/authorize \
  -H "Content-Type: application/json" \
  -d '{"principal":"jane.doe@sailpoint.com","direction":"inbound","caller":"invoke:engineering-team"}'
```

### J4 — UI simulate panel

Open any agent detail page in AgentForge. The **Simulate authorization** panel lets you pick inbound/outbound, principal, and permission — then shows allow/deny with policy and matched entitlement.

---

## Part K — ISC demo orchestrator

Run the full AgentForge + ISC demo from the **dashboard** without Postman. AgentForge calls ISC v2026 APIs server-side using OAuth client credentials.

### K1 — What still requires one-time ISC setup

The orchestrator does **not** replace initial connector bootstrap. Configure once in ISC (or export golden source JSON):

| One-time in ISC | Why |
|-----------------|-----|
| Web Services source + HTTP operations | Poorly documented create-source API |
| Entitlement types (`outboundPermissions`, `inboundCallers`) | No clean public create API |
| Account + machine identity schemas | AIS-specific configuration |

After bootstrap, the orchestrator handles runtime demo steps.

### K2 — Environment variables

Set on AgentForge (`.env.local` locally, Amplify environment variables in production). Copy from [`.env.example`](./.env.example).

| Variable | Required | Description |
|----------|----------|-------------|
| `ISC_TENANT` | Yes | Tenant slug (e.g. `acme`) |
| `ISC_CLIENT_ID` | Yes | API client ID |
| `ISC_CLIENT_SECRET` | Yes | API client secret — **server only, never expose to browser** |
| `ISC_SOURCE_ID` | Yes | Web Services source ID for AgentForge |
| `ISC_API_VERSION` | No | Default `v2026` |
| `ISC_DOMAIN` | No | Default `identitynow.com` |
| `ISC_DEMO_AGENT_ID` | No | Agent for govern + enforce (default `agt_demo_aws_bedrock`) |

**Minimum OAuth scopes:**

- `idn:sources:read`, `idn:sources:manage`
- `idn:accounts:read`
- `idn:entitlement:manage`
- `idn:mis-agents:aggregate`
- `idn:mis-account:read`

Verify configuration:

```bash
curl -s https://main.d12mzah9vzl24s.amplifyapp.com/api/demo/config | jq
```

Expected: `"configured": true` with tenant and sourceId.

**Amplify note:** If `configured` is `false` but vars are set in the console, ensure `amplify.yml` is deployed and trigger a **new build** (not just “Redeploy this version” of an old build from before vars were set).

### K3 — Demo modes

| Mode | Button | Steps |
|------|--------|-------|
| **Full sync** | Run full sync | Bulk create → entitlement agg ×2 → MIS agg → account agg → machine account mappings → verify |
| **Govern + enforce** | Run govern + enforce | Authorize allow → revoke entitlement → unoptimized account agg → authorize deny |

**Full sync** ISC API calls (AgentForge server → ISC):

| Step | ISC API |
|------|---------|
| Entitlement aggregation | `POST /v2026/entitlements/aggregate/sources/{sourceId}` |
| Machine identity aggregation | `POST /v2026/sources/{sourceId}/aggregate-agents` |
| Account aggregation | `POST /v2026/sources/{sourceId}/load-accounts` |
| Machine account mappings | `PUT /v2026/sources/{sourceId}/machine-account-mappings` |
| Verify | `GET /v2026/accounts`, `GET /v2026/machine-accounts` |

Aggregation steps return a task ID; the UI polls `GET /beta/task-status/{taskId}` until complete.

**Govern + enforce** defaults:

| Setting | Default |
|---------|---------|
| Allow permission | `S3:Read` |
| Revoke entitlement | `Jira:Admin` |
| Revoke path | AgentForge direct (`remove-entitlement`) — reliable when ISC UI actions are missing |
| Principal | `demo-user` |

Override these in the orchestrator panel before running.

### K4 — Dashboard usage

1. Open AgentForge dashboard
2. Confirm green **ISC connected** banner (tenant + source ID)
3. Set platform, bulk count, demo agent ID, allow/revoke permissions if needed
4. Click **Run full sync** — wait for the step log to complete
5. In ISC, confirm **AI Agent → Access** shows inbound + outbound
6. Click **Run govern + enforce** — confirm allow then deny in the step log

### K5 — Demo API (optional)

Same steps via API if scripting outside the UI:

```bash
# List modes and steps
curl -s https://main.d12mzah9vzl24s.amplifyapp.com/api/demo/run | jq

# Run one step
curl -s -X POST "https://main.d12mzah9vzl24s.amplifyapp.com/api/demo/run?mode=full-sync" \
  -H "Content-Type: application/json" \
  -d '{"step":"entitlement-aggregation"}' | jq

# Poll ISC task
curl -s https://main.d12mzah9vzl24s.amplifyapp.com/api/demo/task/{taskId} | jq
```

### K6 — Architecture

```
ONE-TIME (ISC UI)
  Web Services source + HTTP ops + entitlement types + schemas
                    ↓
DEMO (AgentForge orchestrator)
  AgentForge bulk create
  → ISC entitlement agg (×2)
  → ISC MIS agg
  → ISC account agg
  → ISC machine account mappings
  → ISC verify
  → AgentForge authorize (allow)
  → AgentForge revoke (or ISC access-request)
  → ISC account agg (unoptimized)
  → AgentForge authorize (deny)
```

---

## Part L — Synthetic sources (optional multi-source hero)

Use this when you want **AI Agent → Access** and **Accounts** to show entitlements from **AWS IAM**, **Google Workspace**, **Entra ID**, and **Active Directory** — like the reference ISC screenshots.

**Prerequisite:** Complete [A0](#a0--load-hero-agents-phase-1--do-this-first) and your existing Bedrock source (Parts B–F). Deploy the latest AgentForge build so synthetic endpoints exist.

### L1 — What you are adding

For each synthetic source, create **one new Web Services SaaS source** in ISC. All sources use the **same AgentForge Base URL**; only the **Context URL** paths differ.

Copy URLs from AgentForge **/connector** → **Synthetic source endpoints**.

| ISC source name (suggested) | Context path prefix | Entitlement attribute types needed |
|-----------------------------|---------------------|-----------------------------------|
| `AgentForge AWS IAM` | `/api/connectors/web-services/synthetic/aws-iam/` | `AWSManagedPolicies`, `CustomerManagedPolicies`, `InlinePolicies` |
| `AgentForge Google Workspace` | `/api/connectors/web-services/synthetic/google-workspace/` | `resourcePermissions` |
| `AgentForge Entra ID` | `/api/connectors/web-services/synthetic/entra-id/` | `appRoleAssignments` |
| `AgentForge Active Directory` | `/api/connectors/web-services/synthetic/active-directory/` | `memberOf` |

### L2 — Repeat per synthetic source (example: AWS IAM)

Do steps L2a–L2e for **each** of the four sources above.

#### L2a — Create the source

1. **Admin → Connections → Sources → Create source**
2. Type: **Web Services SaaS**
3. Name: e.g. `AgentForge AWS IAM`
4. **Connection Settings → Authentication:**
   - **Authentication Type:** Custom Authentication
   - **Base URL:** your AgentForge URL (same as Bedrock source)
5. Save

#### L2b — Create entitlement types (AWS IAM example)

Create **one entitlement type per attribute** used by that source. Names must match `attributeName` in the payload **exactly**.

**For AWS IAM**, create three types:

| Entitlement type name | Entitlement ID field | Entitlement Name field |
|-----------------------|----------------------|------------------------|
| `AWSManagedPolicies` | `name` | `name` |
| `CustomerManagedPolicies` | `name` | `name` |
| `InlinePolicies` | `name` | `name` |

Schema attributes (each type): `entitlementId` (string), `name` (string), optional `attributeName`, `attributeValue`, `riskScore`.

**For Google Workspace:** one type `resourcePermissions`  
**For Entra ID:** one type `appRoleAssignments`  
**For Active Directory:** one type `memberOf`

#### L2c — HTTP operations (per source)

Go to **Source Setup → HTTP Operations**. Create these operations (replace `aws-iam` with the slug for each source):

| # | Operation Type | Context URL | Method | Root path |
|---|----------------|-------------|--------|-----------|
| 1 | Test Connection | `/api/health` | GET | — |
| 2 | Account Aggregation | `/api/connectors/web-services/synthetic/aws-iam/accounts` | GET | `$.accounts[*]` |
| 3 | Group Aggregation - AWSManagedPolicies | `/api/connectors/web-services/synthetic/aws-iam/entitlements` | GET | `$.entitlements[*]` |
| 4 | Group Aggregation - CustomerManagedPolicies | same URL | GET | `$.entitlements[*]` |
| 5 | Group Aggregation - InlinePolicies | same URL | GET | `$.entitlements[*]` |

**Account aggregation response mapping** (same as Part D2):

| Schema attribute | Attribute path |
|------------------|----------------|
| `accountId` | `accountId` |
| `name` | `name` |
| `nativeIdentity` | `nativeIdentity` |
| `identityName` | `identityName` |
| `machineIdentity` | `machineIdentity` |
| `status` | `status` |
| `owner` | `accountOwner` |
| `AWSManagedPolicies` | `AWSManagedPolicies` |
| `CustomerManagedPolicies` | `CustomerManagedPolicies` |
| `InlinePolicies` | `InlinePolicies` |

> Map only the entitlement attributes that exist for that source. Google Workspace accounts use `resourcePermissions` instead of the IAM fields.

**Group aggregation response mapping** (per entitlement type):

| Schema attribute | Attribute path |
|------------------|----------------|
| `entitlementId` | `entitlementId` |
| `name` | `name` |
| `attributeName` | `attributeName` |
| `attributeValue` | `attributeValue` |
| `accessDirection` | `accessDirection` |
| `riskScore` | `riskScore` |

For Google Workspace / Entra / AD sources, create **one** Group Aggregation operation per entitlement type (`resourcePermissions`, `appRoleAssignments`, or `memberOf`).

#### L2d — Account schema

**Account Management → Account Schema** — add entitlement attributes matching the types you created:

| Source | Multi-valued account attributes (type = matching entitlement type) |
|--------|---------------------------------------------------------------------|
| AWS IAM | `AWSManagedPolicies`, `CustomerManagedPolicies`, `InlinePolicies` |
| Google Workspace | `resourcePermissions` |
| Entra ID | `appRoleAssignments` |
| Active Directory | `memberOf` |

Set **Account ID** = `accountId`, **Account Name** = `name`.

#### L2e — Run aggregations (per source)

For each synthetic source, in ISC UI:

```
1. Group Aggregation → each entitlement type (e.g. AWSManagedPolicies, …)
2. Account Aggregation
```

### L3 — Link accounts to the AI agent

After all sources are aggregated:

1. **Admin → Identities → AI Agents → CloudOps-Navigator:Infra-DevOps-Agent**
2. **Accounts** tab — link accounts from each source:
   - `AmazonBedrockExecutionRoleForAgents` (AWS IAM)
   - `sp-readonly@readonly-integration` (Google Workspace)
   - Bedrock alias account (AWS Bedrock source)
3. Or use **machine account mappings** (`nativeIdentity` → `nativeIdentity`) via the orchestrator if configured for each source.

### L4 — Verify

| Check | Location | Expected (AWS hero) |
|-------|----------|---------------------|
| Entitlement catalog | Each source → Entitlements | IAM policies, GWS roles, etc. |
| Accounts | Each source → Accounts | 1+ accounts per synthetic source |
| AI Agent → Accounts | Hero agent | 3–4 linked accounts |
| AI Agent → Access | Hero agent | 10–15 entitlements across sources |
| Identity Graph | Viewing agent | Branches per source name |

### L5 — Tier 1 shortcut (Bedrock source only)

If you **do not** add synthetic sources:

1. [A0](#a0--load-hero-agents-phase-1--do-this-first) — full-store reset
2. Re-run aggregations on your **existing Bedrock source only**:
   - Group Aggregation → `outboundPermissions`
   - Group Aggregation → `inboundCallers`
   - Machine Identity Aggregation
   - Account Aggregation
3. Link the Bedrock account to the AI agent

**Expected:** ~6–14 entitlements, all with source **AI Agents Bedrock**. You will **not** see AWS IAM / Google Workspace as separate source names without Part L.

---

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| Still shows `DevOps-Bot-Prod` / 4 entitlements | Old AgentForge data or stale ISC aggregation | [A0](#a0--load-hero-agents-phase-1--do-this-first) full-store reset; redeploy AgentForge; re-aggregate all sources |
| Access shows only Bedrock source | Tier 1 only — synthetic sources not configured | Complete [Part L](#part-l--synthetic-sources-optional-multi-source-hero) for multi-source Access tab |
| *No configuration for Group Aggregation-AWSManagedPolicies* | Missing typed HTTP operation | Add **Group Aggregation - AWSManagedPolicies** on the AWS IAM source (L2c) |
| *Multiple Entitlement attributes with same type* | Both access fields typed as `group` | Create separate types `outboundPermissions` and `inboundCallers` |
| *No configuration for Group Aggregation-outboundPermissions* | Missing HTTP operation | Add operation type **Group Aggregation - outboundPermissions** (D3) |
| *datasetIds empty* on machine identity agg | No schema selected | Create machine identity schema; use **Specific Schemas** |
| Attributes populated, Entitlement Assignments empty | Entitlement ID mismatch | Set **Entitlement ID = `name`**; re-run group + account agg |
| Catalog shows `S3 Read`, account has `S3:Read` | Display normalization | OK if Entitlement Assignments on account are populated |
| AI Agent → Access empty | Account not linked to agent | Correlate on **AI Agent → Accounts** |
| AI Agent → Accounts empty | nativeIdentity / ARN mismatch | Align ARN; re-aggregate; link manually |
| Identity Graph empty / all zeros | Account entitlements not "direct" on identity | Demo **Access** tab; optional access profiles for richer graph |
| Graph *Filter Returned No Results* | Bad Account ID filter | Clear filters in Explorer |
| 0 accounts in aggregation | Wrong URL or root path | `$.accounts[*]`; platform-specific path |
| KeyID / 0 accounts (ISC) | Wrong endpoint | Use Web Services `/accounts`, not `/connectors/aws-bedrock/agents` |
| Provision succeeds but ISC unchanged | No re-aggregation | Re-run account aggregation after provision |
| Provision 404 | Wrong platform URL or nativeIdentity | Match source platform path; use ARN from account agg |
| Remove entitlement 404 | Value not on agent | Confirm exact entitlement string (`S3:Read` vs `S3 Read`) |
| Orchestrator: ISC not configured | Missing env vars | Set `ISC_TENANT`, `ISC_CLIENT_ID`, `ISC_CLIENT_SECRET`, `ISC_SOURCE_ID` |
| Orchestrator: auth failed | Bad client credentials or scopes | Verify OAuth client scopes (Part K2) |
| Orchestrator: task timed out | Large tenant / slow agg | Re-run single step via `/api/demo/run`; check ISC task monitor |
| Orchestrator: machine mappings failed | Experimental API | Ensure `ISC_API_VERSION=v2026`; check source has MIS enabled |
| Group agg `KeyID cannot be empty` | Generic **Group Aggregation** uses default `group` schema; Entitlement ID field not mapped | Set `group` type Entitlement ID = `name`; map `name` in response — or use typed ops from UI only (D3/D4) |

---

## Glossary

| Term | Definition |
|------|------------|
| **Entitlement** | A named permission (`S3:Read`, `invoke:engineering-team`) |
| **Access** | The overall picture of what an identity can do — shown on **AI Agent → Access** |
| **Outbound** | What the agent can reach (`outboundPermissions`) |
| **Inbound** | Who can invoke the agent (`inboundCallers`) |
| **Account** | Connector object on the Web Services source |
| **AI Agent** | Governed machine identity in AIS |

---

## Quick checklist

```
☐ Tier chosen: Tier 1 (Bedrock only) OR Tier 2 (+ synthetic sources)
☐ Hero agents loaded — full-store reset (Part A0)
☐ One-time ISC bootstrap (source, HTTP ops, entitlement types, schemas)
☐ AgentForge ISC env vars set (Part K2)
☐ Web Services Bedrock source + test connection
☐ Entitlement types: outboundPermissions, inboundCallers (Entitlement ID = name)
☐ HTTP ops: test, account, group×2, machine identity
☐ Account + machine identity schemas
☐ Aggregate: group outbound → group inbound → machine identity → account
     (or Run full sync on dashboard)
☐ Optional Tier 2: 4 synthetic sources + entitlement types + HTTP ops (Part L)
☐ AI Agent linked to source account(s)
☐ AI Agent → Access shows inbound + outbound (Tier 1) or multi-source (Tier 2)
☐ Provisioning HTTP ops: add/remove entitlement, disable account
☐ Authorize API: allow known permission, deny revoked/disabled
     (or Run govern + enforce on dashboard)
☐ Demo!
```
