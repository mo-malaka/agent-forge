# AgentForge

**AgentForge** is an internal R&D tool that lets Sales Engineers spin up **synthetic AI agents** for identity governance demos — without connecting to real external AI infrastructure.

Create mock agents with custom metadata and IAM entitlements, then expose them through REST API endpoints that SailPoint connectors can poll and ingest like a real SaaS platform.

**SailPoint integration:** [Connector Setup Guide](./CONNECTOR_SETUP.md)

## What it does

- **Web UI** — create and manage synthetic agents in seconds
- **Mock API** — connector-friendly JSON payloads for REST / Web Services connectors
- **Standalone** — runs locally or in a container; no AWS, Azure, GCP, or Claude Enterprise required

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
3. Copy the connector poll URL from the dashboard or agent detail page

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

### Poll agents (connector target)

```bash
curl -s "http://127.0.0.1:3000/api/agents?page=1&limit=50" | jq
```

## API endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/health` | Health check |
| `GET` | `/api/agents` | List all agents (primary connector poll endpoint) |
| `POST` | `/api/agents` | Create a synthetic agent |
| `GET` | `/api/agents/{id}` | Get a single agent |
| `DELETE` | `/api/agents/{id}` | Remove an agent |
| `GET` | `/api/agents/{id}/entitlements` | Entitlements-only payload |

List endpoint supports `?page=`, `?limit=`, `?status=`, `?archetype=`, and `?deployment_provider=` query parameters.

## Cloud platform connector endpoints

Agents are mocked as deployed on a specific cloud AI platform. Use the endpoint that matches your SailPoint source system:

| Platform | Connector poll URL | Native payload shape |
|----------|-------------------|----------------------|
| AWS Bedrock | `GET /api/connectors/aws-bedrock/agents` | `agentSummaries[]` with ARNs |
| Google Cloud Vertex AI | `GET /api/connectors/gcp-vertex/agents` | `agents[]` with resource names |
| Microsoft Azure AI Foundry | `GET /api/connectors/azure-ai-foundry/agents` | `value[]` with Azure resource IDs |

The unified `GET /api/agents` endpoint returns all agents across platforms with a normalized `deployment` block and cloud-native `external_id` (ARN, GCP resource name, or Azure resource ID).

**See [CONNECTOR_SETUP.md](./CONNECTOR_SETUP.md) for full SailPoint connector configuration, field mappings, and demo workflow.**

### Deployment providers

| Value | Platform |
|-------|----------|
| `aws_bedrock` | AWS Bedrock |
| `gcp_vertex` | Google Cloud Vertex AI |
| `azure_ai_foundry` | Microsoft Azure AI Foundry |

## Agent archetypes

- Code Assistant
- DevOps Bot
- Customer Support Agent
- Financial Analyst
- Security Analyst
- HR Agent

## Configuration

Copy `.env.example` to `.env.local` and set your deployment base URL so endpoint links in API responses are correct:

```bash
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run db:reset` | Clear stored agents (`data/agents.json`) |

## Project structure

```
agent-forge/
├── src/
│   ├── app/              # Pages and API routes
│   ├── components/       # UI components
│   ├── lib/              # Business logic, storage, serialization
│   └── types/            # Shared TypeScript types
├── data/                 # Local agent store (gitignored)
└── public/
```

Agent data is persisted to `data/agents.json` and survives server restarts.

On first deploy (or when the store is empty), AgentForge automatically seeds **3 demo agents** — one each for AWS Bedrock, GCP Vertex AI, and Azure AI Foundry. Run `npm run db:reset` locally to clear data and trigger a fresh seed on the next request.

## Tech stack

- [Next.js](https://nextjs.org) (App Router) — UI + API in one app
- [TypeScript](https://www.typescriptlang.org)
- [Tailwind CSS](https://tailwindcss.com)
- [Zod](https://zod.dev) — request validation

## Status

Early internal release. Core flows are working: create agents, list them, and serve connector-ready payloads. Docker packaging and deployment guides are planned next.
