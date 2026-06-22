# AgentForge

**AgentForge** is an internal R&D tool that lets Sales Engineers spin up **synthetic AI agents** for identity governance demos — without connecting to real external AI infrastructure.

Create mock agents with **inbound** and **outbound** access, then expose them through Web Services APIs that a SailPoint **Web Services SaaS** connector and **Agent Identity Security** can aggregate.

**SailPoint integration:** [Setup Guide](/setup) (also in repo as [CONNECTOR_SETUP.md](./CONNECTOR_SETUP.md))

## What it does

- **Web UI** — create agents with outbound permissions and inbound callers; bulk-create 5/10/20 per platform
- **Web Services accounts API** — `accounts[]` with `outboundPermissions` and `inboundCallers` for ISC account aggregation
- **Web Services entitlements API** — entitlement catalog for group aggregation (`?type=outbound` / `?type=inbound`)
- **Machine identity** — reuse the accounts endpoint for machine identity aggregation (same `nativeIdentity` ARN)
- **Reference API** — optional cloud-native JSON shapes (Bedrock, Vertex, Foundry)

## Demo target in ISC

| Direction | AgentForge field | ISC demo screen |
|-----------|------------------|-----------------|
| Outbound | `outboundPermissions` | **AI Agent → Access** |
| Inbound | `inboundCallers` | **AI Agent → Access** |

See [CONNECTOR_SETUP.md](./CONNECTOR_SETUP.md) for the full ISC configuration and demo walkthrough.

## Quick start

```bash
cd ~/developments/agent-forge
npm install
npm run dev
```

Open [http://127.0.0.1:3000](http://127.0.0.1:3000).

### Bulk-create demo agents

1. Open the dashboard
2. **Quick bulk create** — pick platform (AWS / GCP / Azure) and **5, 10, or 20**
3. Run ISC aggregations per the [setup guide](./CONNECTOR_SETUP.md)

### Create a single agent via API

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
      "owner": "platform-ops@sailpoint.com",
      "department": "Engineering",
      "risk_level": "High"
    },
    "entitlements": ["S3:Read", "Jira:Admin"],
    "inbound_access": ["invoke:engineering-team", "invoke:service-now-workflow"]
  }' | jq
```

## Web Services endpoints (ISC)

| Platform | Accounts (`$.accounts[*]`) | Entitlements (`$.entitlements[*]`) |
|----------|------------------------------|-------------------------------------|
| AWS Bedrock | `/api/connectors/web-services/aws-bedrock/accounts` | `.../entitlements?type=outbound` or `?type=inbound` |
| GCP Vertex | `/api/connectors/web-services/gcp-vertex/accounts` | same pattern |
| Azure AI Foundry | `/api/connectors/web-services/azure-ai-foundry/accounts` | same pattern |

## API endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/health` | Health check |
| `GET` | `/api/agents` | List all agents (unified) |
| `POST` | `/api/agents` | Create a synthetic agent |
| `POST` | `/api/agents/bulk` | Bulk create 5, 10, or 20 random agents |
| `GET` | `/api/agents/{id}` | Get a single agent |
| `DELETE` | `/api/agents/{id}` | Remove an agent |
| `GET` | `/api/connectors/web-services/{platform}/accounts` | ISC account aggregation |
| `GET` | `/api/connectors/web-services/{platform}/entitlements` | ISC entitlement catalog |

## Configuration

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
