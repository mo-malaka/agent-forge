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

**Primary demo screen:** **AI Agent → Access** (not Identity Graph). Identity Graph is optional; Web Services account entitlements often appear on the Access tab but not as expandable nodes on the agent-root graph.

---

## Prerequisites

- AgentForge reachable from your ISC tenant
- Permission to create and configure sources in ISC
- **Agent Identity Security (AIS)** licensed on your tenant
- Create **one Web Services source per platform** you demo (e.g. AWS Bedrock)

Verify AgentForge:

```bash
curl -s https://main.d12mzah9vzl24s.amplifyapp.com/api/health
```

---

## Part A — Prepare data in AgentForge

### A1 — Bulk-create agents (recommended)

1. Open the AgentForge dashboard
2. Use **Quick bulk create** — pick platform and **5, 10, or 20** agents
3. Each agent gets random **outbound** permissions and **inbound** callers

Or use the three seed agents (`DevOps-Bot-Prod`, etc.) on a fresh install.

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

**Sample account:**

```json
{
  "accountId": "agt_demo_aws_bedrock",
  "name": "DevOps-Bot-Prod",
  "nativeIdentity": "arn:aws:bedrock:us-east-1:123456789012:agent/agt_demo_aws_bedrock",
  "identityName": "DevOps-Bot-Prod",
  "owner": "platform-ops@sailpoint.com",
  "outboundPermissions": ["S3:Read", "Jira:Admin", "EC2:Describe", "Bedrock:InvokeModel"],
  "inboundCallers": ["invoke:engineering-team", "invoke:service-now-workflow"]
}
```

**Sample entitlement:**

```json
{
  "entitlementId": "ent_s3_read",
  "name": "S3:Read",
  "accessDirection": "outbound",
  "riskScore": 3
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
| `displayName` | `displayName` |
| `identityName` | `identityName` |
| `status` | `status` |
| `owner` | `owner` |
| `platform` | `platform` |
| `archetype` | `archetype` |
| `outboundPermissions` | `outboundPermissions` |
| `inboundCallers` | `inboundCallers` |

Preview/test — confirm `outboundPermissions` and `inboundCallers` appear as arrays.

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
| Native Identity | `nativeIdentity` |
| Identity Name | `identityName` |
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

```
1. Group Aggregation → outboundPermissions
2. Group Aggregation → inboundCallers
3. Machine Identity Aggregation → bedrock-agent (Specific Schemas — not "All" if no schemas exist)
4. Account Aggregation
```

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

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
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
☐ AgentForge agents created (bulk or seed)
☐ Web Services source + test connection
☐ Entitlement types: outboundPermissions, inboundCallers (Entitlement ID = name)
☐ HTTP ops: test, account, group×2, machine identity
☐ Account + machine identity schemas
☐ Aggregate: group outbound → group inbound → machine identity → account
☐ Account shows Entitlement Assignments (6 items)
☐ AI Agent linked to source account
☐ AI Agent → Access shows inbound + outbound
☐ Demo!
```
