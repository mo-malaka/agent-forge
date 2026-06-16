# SailPoint Connector Setup Guide

Connect **AgentForge** to Identity Security Cloud using a **Web Services SaaS** source. No real AWS, GCP, or Azure credentials required.

**Detailed ISC configuration:** [WEB_SERVICES_SETUP.md](./WEB_SERVICES_SETUP.md)

---

## How it works

```
┌─────────────┐     creates      ┌─────────────┐     polls       ┌─────────────┐
│  AgentForge │  ──────────────► │  Mock API   │ ◄────────────── │  SailPoint  │
│     UI      │   synthetic      │  (REST)     │   aggregation   │ Web Services│
│             │   agents         │             │                 │   SaaS      │
└─────────────┘                  └─────────────┘                 └─────────────┘
```

1. Create agents in AgentForge and choose a deployment platform (Bedrock, GCP, or Azure).
2. Configure a **Web Services SaaS** source in ISC pointing at the AgentForge account endpoint.
3. Run **Account Aggregation** — agents appear as accounts in ISC.

---

## Account endpoints

Use these URLs for account aggregation (not the cloud-native `/agents` paths):

| Platform | Account aggregation URL |
|----------|-------------------------|
| AWS Bedrock | `GET /api/connectors/web-services/aws-bedrock/accounts` |
| GCP Vertex AI | `GET /api/connectors/web-services/gcp-vertex/accounts` |
| Azure AI Foundry | `GET /api/connectors/web-services/azure-ai-foundry/accounts` |

Example:

```
https://main.d12mzah9vzl24s.amplifyapp.com/api/connectors/web-services/aws-bedrock/accounts
```

---

## Quick ISC settings

| Setting | Value |
|---------|-------|
| Connector type | Web Services SaaS |
| Authentication | None |
| HTTP method | `GET` |
| Root path | `$.accounts[*]` |
| `id` mapping | `id` |
| `name` mapping | `name` (set as Identity Attribute) |
| `nativeIdentity` mapping | `nativeIdentity` |

Complete **Account Schema** and **Account Correlation** before aggregating — both are required.

---

## Troubleshooting: Success but 0 accounts

See [WEB_SERVICES_SETUP.md](./WEB_SERVICES_SETUP.md) for the full checklist. Common causes:

- Wrong endpoint (using `/api/connectors/aws-bedrock/agents` instead of `/web-services/.../accounts`)
- Root path missing `[*]` (use `$.accounts[*]`, not `$.accounts`)
- Response mappings prefixed incorrectly (use `id = id`, not `id = $.accounts[*].id`)
- Account Schema or Account Correlation not saved

---

## Optional: cloud-native reference payloads

These mimic Bedrock / Vertex / Foundry API shapes for field-mapping demos. Use the **web-services** endpoints above for actual ISC aggregation.

| Platform | Reference URL |
|----------|---------------|
| AWS Bedrock | `GET /api/connectors/aws-bedrock/agents` |
| GCP Vertex AI | `GET /api/connectors/gcp-vertex/agents` |
| Azure AI Foundry | `GET /api/connectors/azure-ai-foundry/agents` |
| All platforms | `GET /api/agents` |

---

## Demo checklist

- [ ] AgentForge running (`/api/health` returns OK)
- [ ] Agents created per platform
- [ ] Web Services source uses `/web-services/.../accounts` URL
- [ ] Root path `$.accounts[*]` and attribute mappings configured
- [ ] Account Schema + Account Correlation completed
- [ ] Account aggregation run — accounts visible in ISC
