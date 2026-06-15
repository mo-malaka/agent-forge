# SailPoint Connector Setup Guide

This guide explains how to connect SailPoint Identity Security Cloud (ISC) to **AgentForge** for AIS governance demos. AgentForge simulates AI agents deployed on **AWS Bedrock**, **Google Cloud Vertex AI**, and **Microsoft Azure AI Foundry** — no real cloud credentials required.

---

## How it works

```
┌─────────────┐     creates      ┌─────────────┐     polls       ┌─────────────┐
│  AgentForge │  ──────────────► │  Mock API   │ ◄────────────── │  SailPoint  │
│     UI      │   synthetic      │  (REST)     │   aggregation   │  Connector  │
│             │   agents         │             │                 │             │
└─────────────┘                  └─────────────┘                 └─────────────┘
```

1. You create agents in AgentForge and choose a deployment platform (Bedrock, GCP, or Azure).
2. AgentForge serves those agents through REST endpoints shaped like each cloud provider.
3. A SailPoint REST / Web Services connector polls the endpoint during account aggregation.
4. Agents appear in ISC as identities/accounts with attributes and entitlements for demo workflows.

---

## Prerequisites

- AgentForge running and reachable from your ISC environment (local laptop or shared demo host)
- A SailPoint source configured with a **REST** or **Web Services** connector
- Network access from ISC to the AgentForge host on port `3000` (or your deployed port)

Verify AgentForge is up:

```bash
curl -s http://<agentforge-host>:3000/api/health | jq
```

Expected response:

```json
{
  "status": "ok",
  "service": "agent-forge",
  "timestamp": "..."
}
```

---

## Step 1: Create demo agents

1. Open the AgentForge UI: `http://<agentforge-host>:3000`
2. Click **New Agent**
3. Select the **Deployment Platform** that matches the connector you will configure
4. Fill in agent name, archetype, metadata (owner, department, risk level), and entitlements
5. Repeat for 3–5 agents per platform to populate the demo

Copy connector URLs from the **dashboard** — each platform has its own poll endpoint.

---

## Step 2: Choose the correct poll endpoint

Use **one SailPoint application source per cloud platform**, each pointing at the matching AgentForge endpoint.

| Demo platform | Full poll URL |
|---------------|---------------|
| AWS Bedrock | `http://<host>:3000/api/connectors/aws-bedrock/agents` |
| Google Cloud Vertex AI | `http://<host>:3000/api/connectors/gcp-vertex/agents` |
| Microsoft Azure AI Foundry | `http://<host>:3000/api/connectors/azure-ai-foundry/agents` |
| All platforms (unified) | `http://<host>:3000/api/agents` |

**Recommendation:** Use platform-specific endpoints for AIS demos — the JSON shape matches what SailPoint would see from a real cloud integration.

### Pagination

All list endpoints support standard query parameters:

```
?page=1&limit=50
```

---

## Step 3: Configure the SailPoint connector

These steps apply to a generic **REST / Web Services** connector. Exact field names vary by ISC version and connector template — adjust to match your environment.

### Connection

| Setting | Demo value |
|---------|------------|
| Authentication | None (no auth required for local AgentForge) |
| HTTP method | `GET` |
| Content type | `application/json` |
| Base URL | Your deployed AgentForge URL (e.g. `https://main.d12mzah9vzl24s.amplifyapp.com`) — auto-detected from request headers; no env var required on Amplify |
| Resource path | See platform table below |

### Platform resource paths

| Platform | Path |
|----------|------|
| AWS Bedrock | `/api/connectors/aws-bedrock/agents` |
| GCP Vertex AI | `/api/connectors/gcp-vertex/agents` |
| Azure AI Foundry | `/api/connectors/azure-ai-foundry/agents` |

---

## Step 4: Account schema mapping

Map JSON fields from the poll response to SailPoint account attributes.

### AWS Bedrock

**Response root array:** `agentSummaries`

| SailPoint field | JSON path | Notes |
|-----------------|-----------|-------|
| Account ID | `agentArn` | e.g. `arn:aws:bedrock:us-east-1:123456789012:agent/agt_xxx` |
| Account name | `agentName` | Display name |
| Status | `agentStatus` | Active = `PREPARED` |
| Native ID | `agentId` | AgentForge internal ID |

**Optional attributes:**

| Attribute | JSON path |
|-----------|-----------|
| Region | `region` |
| Account ID (AWS) | `accountId` |
| Foundation model | `foundationModel` |
| Agent alias | `agentAlias` |
| Description | `description` |

**Sample response:**

```json
{
  "agentSummaries": [
    {
      "agentId": "agt_SmwMzlqr1qJB",
      "agentName": "DevOps-Bot-Prod",
      "agentStatus": "PREPARED",
      "agentArn": "arn:aws:bedrock:us-east-1:123456789012:agent/agt_SmwMzlqr1qJB",
      "foundationModel": "anthropic.claude-3-5-sonnet-20241022-v2:0",
      "region": "us-east-1",
      "accountId": "123456789012"
    }
  ]
}
```

---

### Google Cloud Vertex AI

**Response root array:** `agents`

| SailPoint field | JSON path | Notes |
|-----------------|-----------|-------|
| Account ID | `name` | Full resource name |
| Account name | `displayName` | Human-readable name |
| Status | `state` | Active = `ACTIVE` |
| Native ID | `labels.agentforge_id` | AgentForge internal ID |

**Optional attributes:**

| Attribute | JSON path |
|-----------|-----------|
| GCP project | `project_id` |
| Location | `location` |
| Archetype | `labels.archetype` |
| Created | `createTime` |
| Updated | `updateTime` |

**Sample response:**

```json
{
  "agents": [
    {
      "name": "projects/demo-ai-governance/locations/us-central1/agents/agt_xxx",
      "displayName": "DevOps-Bot-Prod",
      "state": "ACTIVE",
      "project_id": "demo-ai-governance",
      "location": "us-central1",
      "labels": {
        "archetype": "devops_bot",
        "agentforge_id": "agt_xxx"
      }
    }
  ]
}
```

---

### Microsoft Azure AI Foundry

**Response root array:** `value`

| SailPoint field | JSON path | Notes |
|-----------------|-----------|-------|
| Account ID | `id` | Full Azure resource ID |
| Account name | `name` | Display name |
| Status | `properties.provisioningState` | Active = `Succeeded` |
| Native ID | Parse from `id` or use detail endpoint | |

**Optional attributes:**

| Attribute | JSON path |
|-----------|-----------|
| Location | `location` |
| Workspace | `properties.workspace` |
| Resource group | `properties.resourceGroup` |
| Subscription | `properties.subscriptionId` |
| Archetype | `properties.archetype` |
| Display name | `properties.displayName` |

**Sample response:**

```json
{
  "value": [
    {
      "id": "/subscriptions/00000000-0000-0000-0000-000000000001/resourceGroups/rg-ai-agents/providers/Microsoft.CognitiveServices/accounts/foundry-demo/agents/agt_xxx",
      "name": "DevOps-Bot-Prod",
      "location": "eastus",
      "properties": {
        "provisioningState": "Succeeded",
        "displayName": "DevOps-Bot-Prod",
        "archetype": "devops_bot",
        "workspace": "foundry-demo",
        "resourceGroup": "rg-ai-agents"
      }
    }
  ]
}
```

---

## Step 5: Unified endpoint (all platforms)

Use `GET /api/agents` when you want a **single source** covering all deployment platforms. This returns a normalized envelope with a `deployment` block on each agent.

| SailPoint field | JSON path |
|-----------------|-----------|
| Account ID | `agents[].external_id` |
| Account name | `agents[].name` |
| Status | `agents[].status` |
| Cloud provider | `agents[].provider` |
| Platform | `agents[].deployment.provider_label` |
| Region / location | `agents[].deployment.region` or `.location` |

**Filter by platform:**

```
GET /api/agents?deployment_provider=aws_bedrock
GET /api/agents?deployment_provider=gcp_vertex
GET /api/agents?deployment_provider=azure_ai_foundry
```

---

## Step 6: Entitlements

Agent entitlements are included in the unified agent detail response. For a dedicated entitlements poll:

```
GET /api/agents/{id}/entitlements
```

**Response shape:**

```json
{
  "agent_id": "agt_xxx",
  "entitlements": [
    {
      "id": "ent_s3_read",
      "name": "S3:Read",
      "type": "permission",
      "resource": "aws:s3",
      "action": "read",
      "risk_score": 3
    }
  ]
}
```

### Entitlement mapping (unified detail)

From `GET /api/agents/{id}`:

| SailPoint field | JSON path |
|-----------------|-----------|
| Entitlement name | `agent.iam.entitlements[].name` |
| Entitlement ID | `agent.iam.entitlements[].id` |
| Type | `agent.iam.entitlements[].type` |
| Risk score | `agent.iam.entitlements[].risk_score` |

### Metadata mapping (unified detail)

| Attribute | JSON path |
|-----------|-----------|
| Owner | `agent.metadata.owner` |
| Department | `agent.metadata.department` |
| Risk level | `agent.metadata.risk_level` |
| Version | `agent.metadata.version` |
| Archetype | `agent.archetype_label` |

---

## Step 7: Run aggregation in ISC

1. Save the connector / application source configuration
2. Run **Account Aggregation** on the source
3. Verify agents appear under the application
4. Run **Entitlement Aggregation** if your connector template supports it
5. Link accounts to identities if required for your demo scenario

Re-run aggregation after creating new agents in AgentForge.

---

## Demo workflow checklist

- [ ] AgentForge running (`/api/health` returns OK)
- [ ] Agents created per platform (Bedrock, GCP, Azure)
- [ ] Connector URLs copied from dashboard
- [ ] One ISC application source per cloud platform
- [ ] Account ID mapped to ARN / GCP name / Azure resource ID
- [ ] Account aggregation completed
- [ ] Entitlements visible in ISC
- [ ] Governance demo ready (access review, policy, certification)

---

## Production vs demo

| | AgentForge (demo) | Production |
|--|-------------------|------------|
| Data source | Local JSON store | Real Bedrock / Vertex / Foundry APIs |
| Authentication | None | Cloud IAM, API keys, OAuth |
| Agent IDs | Synthetic ARNs / resource names | Real cloud resource identifiers |
| Purpose | SE demos, connector testing | Live governance |

When moving from demo to production, replace the AgentForge poll URL and credentials with your real cloud provider integration. The SailPoint account schema concepts (agent ID, name, status, entitlements) remain the same.

---

## Troubleshooting

### Connector returns no accounts

- Confirm agents exist: `curl http://<host>:3000/api/agents`
- Verify you are using the **platform-specific** endpoint that matches how agents were created
- Check the response root array name (`agentSummaries`, `agents`, or `value`)

### Wrong account IDs in ISC

- Bedrock → map `agentArn`, not `agentId`
- GCP → map `name` (full resource path), not `displayName`
- Azure → map `id` (full resource path), not `name`

### AgentForge unreachable from ISC

- Ensure the host is network-accessible (not just `localhost` on your laptop)
- Connector URLs auto-detect from the request `Host` header on Amplify/Vercel; only set `AGENTFORGE_BASE_URL` or `NEXT_PUBLIC_BASE_URL` if ISC polls a different hostname than the browser sees
- Check firewall rules on port `3000` (local) or HTTPS on your deployed domain

### Stale data after creating new agents

- Re-run account aggregation in ISC
- AgentForge serves live data — no cache delay on the API side

---

## Quick reference

```bash
# Health check
curl http://<host>:3000/api/health

# AWS Bedrock agents
curl http://<host>:3000/api/connectors/aws-bedrock/agents

# GCP Vertex agents
curl http://<host>:3000/api/connectors/gcp-vertex/agents

# Azure AI Foundry agents
curl http://<host>:3000/api/connectors/azure-ai-foundry/agents

# All agents (unified)
curl http://<host>:3000/api/agents

# Single agent detail + entitlements
curl http://<host>:3000/api/agents/<agent-id>
curl http://<host>:3000/api/agents/<agent-id>/entitlements
```
