# AllianceOps

AllianceOps turns the quals schedule into a live match strategy dashboard for FRC teams. Powered by [The Blue Alliance](https://www.thebluealliance.com/) and [Statbotics](https://www.statbotics.io/) — no manual scouting required.

## Features

- **Next Match Briefing** — Alliance vs opponents with team cards, win conditions, and risks
- **Our Path Through Quals** — Difficulty ratings, swing matches, and rest time analysis
- **Duty Planner** — Assign roles with Safe/Balanced/Aggressive templates
- **Picklist** — Multi-signal draft ordering with filters, tags, and CSV export
- **Simulation Replay** — Time-travel through past events for practice and analysis

## Tech Stack

| Layer          | Technology                              |
| -------------- | --------------------------------------- |
| Frontend       | Next.js (static export) + Tailwind CSS  |
| Backend        | Azure Functions v4 (Node.js/TypeScript) |
| Database       | PostgreSQL (Prisma ORM)                 |
| Infrastructure | Azure (Bicep IaC)                       |
| CI/CD          | GitHub Actions                          |

## Getting Started

### Prerequisites

- [Node.js 22+](https://nodejs.org/)
- [pnpm 9+](https://pnpm.io/)
- [Docker](https://www.docker.com/) (for local Postgres + Azurite)
- [Azure Functions Core Tools v4](https://learn.microsoft.com/en-us/azure/azure-functions/functions-run-local)

### Quick Start

```bash
# Clone the repo
git clone https://github.com/o-bots7160/AllianceOps.git
cd AllianceOps

# Copy environment variables
cp .env.example .env
# Edit .env with your TBA API key

# Install dependencies
pnpm install

# Start local services (Postgres + Azurite)
docker compose up -d

# Run database migrations
pnpm db:migrate

# Start development servers
pnpm dev
```

The web app runs at `http://localhost:3000` and the API at `http://localhost:7071`.

### Dev Container

Open in VS Code with the Dev Containers extension for a fully configured environment including:

- Node.js, pnpm, Azure Functions Core Tools
- PostgreSQL and Azurite running automatically
- MCP servers for AI-assisted development (TBA, Tailwind CSS, Prisma, Next.js DevTools, Bicep)

#### SSH Authentication

The Dev Container forwards your host SSH agent so `git push/pull` works inside the container. Ensure your host SSH agent is running and has your GitHub key loaded:

```bash
# macOS — keys in Keychain are loaded automatically
ssh-add -l  # verify keys are listed

# If no keys are listed
ssh-add ~/.ssh/id_ed25519  # or your key path
```

> **Note:** This uses Docker Desktop's SSH agent socket (`/run/host-services/ssh-auth.sock`). Linux users not using Docker Desktop may need to adjust the socket path in `docker-compose.yml`.

### Scripts

| Script            | Description             |
| ----------------- | ----------------------- |
| `pnpm dev`        | Start all dev servers   |
| `pnpm build`      | Build all packages      |
| `pnpm lint`       | Lint all packages       |
| `pnpm typecheck`  | Type-check all packages |
| `pnpm test`       | Run all tests           |
| `pnpm db:migrate` | Apply Prisma migrations |
| `pnpm db:reset`   | Reset database          |
| `pnpm seed:sim`   | Seed simulation data    |

## Project Structure

```
apps/web/        → Next.js frontend (static export + Tailwind)
apps/api/        → Azure Functions backend
packages/shared/ → Shared types, clients, adapters, strategy engines
infra/           → Bicep IaC (main + modules + parameters)
docs/            → Architecture docs and ADRs
```

## Documentation

- [Architecture](docs/architecture.md)
- [ADR 001: Monorepo + pnpm](docs/adr/001-monorepo-pnpm.md)
- [ADR 002: Static Next.js](docs/adr/002-static-nextjs.md)
- [ADR 003: GameDefinition Adapters](docs/adr/003-game-definition-adapters.md)
- [ADR 004: Caching Strategy](docs/adr/004-caching-strategy.md)
- [ADR 005: Pluggable Auth](docs/adr/005-auth-pluggable.md)
- [ADR 006: Secrets via Key Vault](docs/adr/006-secrets-key-vault.md)
- [ADR 007: Observability with App Insights](docs/adr/007-observability-app-insights.md)
- [ADR 008: Dev Container Workflow](docs/adr/008-dev-container-workflow.md)
- [ADR 009: CI/CD with GitHub Actions](docs/adr/009-cicd-github-actions-oidc.md)
- [ADR 010: Statbotics Integration](docs/adr/010-statbotics-integration.md)
- [ADR 011: Simulation Play-by-Play](docs/adr/011-simulation-play-by-play.md)

## License

[MIT](LICENSE)
