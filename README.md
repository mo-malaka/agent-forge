# AgentForge

**AgentForge** is an internal R&D tool that lets Sales Engineers spin up **synthetic AI agents** for identity governance demos — without connecting to real external AI infrastructure.

Create mock agents with custom metadata and IAM entitlements, then expose them through REST API endpoints that a SailPoint **Web Services SaaS** connector can poll and ingest.

**SailPoint integration:** [Connector Setup Guide](./CONNECTOR_SETUP.md) · [Web Services ISC config](./WEB_SERVICES_SETUP.md)

## What it does

- **Web UI** — create and manage synthetic agents in seconds
- **Web Services API** — flat `accounts[]` payloads for ISC account aggregation
- **Reference API** — optional cloud-native JSON shapes (Bedrock, Vertex, Foundry)
- **Standalone** — runs locally or on Amplify; no cloud credentials required

## Quick start

```bash
cd ~/developments/agent-forge
npm install
npm run dev
```

Open [http://127.0.0.1:3000](http://127.0.0.1:3000).

### Create an agent via the UI

1. Click **New Agent**
2. Fill in name, archetype, metadata, and entitlements
3. Copy the **Web Services account endpoint** from the dashboard

### Create an agent via API

```bash
curl -s -X POST http://127.0.0.1:3000/api/agents \
  -H "Content-Type: application/json" \
  -d '{
    "name": "DevOps-Bot-Prod",
    "archetype": "devops_bot",
    "deployment_provider": "aws_bedrock",
    "deployment_config": {
      "region": "us-east-1",
      "account_id": "123456789012"
    },
    "metadata": {
      "owner": "jane.doe@example.com",
      "department": "Engineering",
      "risk_level": "High"
    },
    "entitlements": ["S3:Read", "Jira:Admin"]
  }' | jq
```

## Web Services account endpoints (ISC)

Point your Web Services SaaS source here. Root path: `$.accounts[*]`

| Platform | URL |
|----------|-----|
| AWS Bedrock | `GET /api/connectors/web-services/aws-bedrock/accounts` |
| GCP Vertex AI | `GET /api/connectors/web-services/gcp-vertex/accounts` |
| Azure AI Foundry | `GET /api/connectors/web-services/azure-ai-foundry/accounts` |

## API endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/health` | Health check |
| `GET` | `/api/agents` | List all agents (unified) |
| `POST` | `/api/agents` | Create a synthetic agent |
| `GET` | `/api/agents/{id}` | Get a single agent |
| `DELETE` | `/api/agents/{id}` | Remove an agent |
| `GET` | `/api/agents/{id}/entitlements` | Entitlements-only payload |

## Deployment providers

| Value | Platform |
|-------|----------|
| `aws_bedrock` | AWS Bedrock |
| `gcp_vertex` | Google Cloud Vertex AI |
| `azure_ai_foundry` | Microsoft Azure AI Foundry |

## Configuration

API URLs are **auto-detected** from request headers. Optional override:

```bash
AGENTFORGE_BASE_URL=https://main.d12mzah9vzl24s.amplifyapp.com
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run db:reset` | Clear stored agents |

## Status

Early internal release. Core flows working: create agents, serve Web Services account payloads, optional cloud-native reference shapes.
