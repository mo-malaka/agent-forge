# AgentForge

**AgentForge** is an internal R&D tool that lets Sales Engineers spin up **synthetic AI agents** for identity governance demos — without connecting to real external AI infrastructure.

Create mock agents with custom metadata and IAM entitlements, then expose them through REST API endpoints that SailPoint connectors can poll and ingest like a real SaaS platform.

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

List endpoint supports `?page=`, `?limit=`, `?status=`, and `?archetype=` query parameters.

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

## Tech stack

- [Next.js](https://nextjs.org) (App Router) — UI + API in one app
- [TypeScript](https://www.typescriptlang.org)
- [Tailwind CSS](https://tailwindcss.com)
- [Zod](https://zod.dev) — request validation

## Status

Early internal release. Core flows are working: create agents, list them, and serve connector-ready payloads. Docker packaging and deployment guides are planned next.
