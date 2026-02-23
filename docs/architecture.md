# AllianceOps Architecture

## Overview

AllianceOps is an FRC match-ops and alliance strategy dashboard. It provides match briefings, qualification path analysis, duty planning, and picklist management — all powered by data from The Blue Alliance (TBA) and Statbotics with zero manual scouting required.

## System Architecture

```
┌─────────────────────────┐     ┌──────────────────────────────┐
│   Next.js Static Web    │────▶│   Azure Functions API        │
│   (Azure Static Web     │     │   (Node.js / TypeScript)     │
│    Apps)                │     │                              │
│                         │     │  ┌─────────┐  ┌───────────┐ │
│  • Event Setup          │     │  │ Caching  │  │ Prisma    │ │
│  • Match Briefing       │     │  │ Layer    │  │ ORM       │ │
│  • Path Analysis        │     │  └────┬────┘  └─────┬─────┘ │
│  • Duty Planner         │     │       │             │       │
│  • Picklist             │     └───────┼─────────────┼───────┘
│  • Simulation Replay    │             │             │
└─────────────────────────┘             │             │
                                        ▼             ▼
                              ┌──────────────┐  ┌──────────┐
                              │  TBA API     │  │ Postgres │
                              │  Statbotics  │  │ (Azure)  │
                              └──────────────┘  └──────────┘
```

## Tech Stack

| Layer        | Technology                                          |
| ------------ | --------------------------------------------------- |
| Frontend     | Next.js (static export) + Tailwind CSS + TypeScript |
| Backend      | Azure Functions v4 (Node.js / TypeScript)           |
| Database     | PostgreSQL (Azure Flexible Server)                  |
| ORM          | Prisma                                              |
| IaC          | Bicep                                               |
| CI/CD        | GitHub Actions                                      |
| Data Sources | TBA API v3, Statbotics API v3                       |
| Hosting      | Azure Static Web Apps + Azure Functions             |

## Monorepo Structure

- `apps/web` — Next.js frontend (static export)
- `apps/api` — Azure Functions backend
- `packages/shared` — Shared types, API clients, GameDefinition adapters, strategy engines
- `infra` — Bicep IaC (main + modules + parameters)
- `docs` — Architecture docs and ADRs

## Data Flow

1. **TBA API** provides: event schedule, team lists, match results, score breakdowns, rankings
2. **Statbotics API** provides: EPA ratings, match predictions, team performance metrics
3. **Azure Functions** proxy these APIs with TTL-based caching:
   - Static data (schedule, teams): 1 hour TTL
   - Semi-static (rankings): 5 minute TTL
   - Live (match results): 60 second TTL
4. **Frontend** consumes the Functions API for all data
5. **PostgreSQL** stores user-created data: match plans, duty assignments, picklists, notes

## Season Adaptability

The `GameDefinition` adapter pattern ensures season-agnostic core logic:

- Each adapter maps TBA `score_breakdown` into generic buckets: `auto_points`, `teleop_points`, `endgame_points`, `penalty_points`, `misc_points`
- Adapters define duty slot labels and templates (safe/balanced/aggressive)
- Adapters can expose game-specific metrics for team cards and briefings
- UI renders based on adapter metadata — no season-specific UI code

## Authentication

- Pluggable `AuthProvider` abstraction
- MVP: Azure Static Web Apps built-in auth (EasyAuth)
- Roles: `viewer` (read-only) and `editor` (read-write)
- Target SSO providers: Google, GitHub, Facebook, Apple
- Future: Microsoft Entra External ID for CIAM

## Local Development

Full dev environment runs in a Dev Container with:

- pnpm workspace + Turborepo
- PostgreSQL 16 (Docker)
- Azurite (Azure Storage emulator)
- Azure Functions Core Tools
- MCP servers for AI-assisted development (TBA, Tailwind CSS, Prisma, Next.js DevTools, Bicep)
