# ADR 008: Dev Container as Primary Development Environment

## Status
Accepted

## Context
AllianceOps depends on PostgreSQL, Azure Storage (emulated via Azurite), Azure Functions Core Tools, Node.js 20, pnpm, and several VS Code extensions. Setting up this toolchain manually on macOS, Windows, or Linux is error-prone and time-consuming, especially for a volunteer FRC team with varying developer experience levels.

The project requires a "works out of the box" development experience where a new contributor can clone the repo and be productive within minutes.

## Decision
Use VS Code Dev Containers with Docker Compose as the sole supported development environment:

### Container Architecture
- **devcontainer** service: `mcr.microsoft.com/devcontainers/typescript-node:20` base image with features for Node.js 20, Azure CLI, and GitHub CLI
- **postgres** service: PostgreSQL 16 Alpine with persistent volume
- **azurite** service: Azure Storage emulator with persistent volume
- All three services run as sibling containers via Docker Compose (not Docker-in-Docker)

### Automated Setup (postCreateCommand)
1. `sudo corepack enable` — enables pnpm package manager
2. `corepack install` — pre-downloads pnpm without interactive prompts
3. `pnpm install` — installs all workspace dependencies
4. `sudo npm install -g azure-functions-core-tools@4 --unsafe-perm true` — installs func CLI globally
5. `pnpm db:generate` — generates Prisma client
6. Copies `local.settings.json.example` to `local.settings.json` if not present

### Environment Variables
- `COREPACK_ENABLE_AUTO_PIN=0` set in docker-compose to suppress corepack prompts
- `DATABASE_URL` and `AZURITE_CONNECTION_STRING` set in docker-compose with container hostnames
- `TBA_API_KEY` and other secrets loaded from `.env` (gitignored) via docker-compose `env_file`

### Port Forwarding
- 3000 (Next.js), 7071 (Azure Functions), 5432 (PostgreSQL), 10000-10002 (Azurite)

### MCP Servers
- TBA, Tailwind CSS, and Prisma MCP servers configured in devcontainer VS Code settings
- Next.js DevTools MCP configured via `.mcp.json` at repo root

## Alternatives Considered
- **Manual local setup with README instructions**: Fragile, OS-dependent, hard to keep consistent across team members.
- **Docker-in-Docker**: Adds complexity and build time. Not needed since Postgres/Azurite run as sibling containers.
- **GitHub Codespaces only**: Would work but requires internet access at all times — not guaranteed at FRC events. Dev Containers work offline after initial build.
- **Nix/devbox**: Powerful but steep learning curve for a volunteer team.

## Consequences
- New contributors need only Docker Desktop and VS Code to get started
- All developers share identical tooling versions and configuration
- The devcontainer image must be rebuilt when features or the base image change (takes 1-3 minutes)
- Azure Functions Core Tools are installed via npm (not apt) to avoid Debian package signing issues on newer base images
- The `node` user (non-root) is the default — global installs require `sudo`
- Offline development is supported after the initial container build and `pnpm install`
