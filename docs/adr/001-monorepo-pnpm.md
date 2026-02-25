# ADR 001: Monorepo with pnpm Workspaces + Turborepo

## Status
Accepted

## Context
AllianceOps has a frontend (Next.js), backend (Azure Functions), shared library, and infrastructure code. We need a repository structure that supports code sharing, unified tooling, and efficient CI.

## Decision
Use a pnpm workspace monorepo with Turborepo for task orchestration.

- `pnpm-workspace.yaml` defines `apps/*` and `packages/*`
- Turborepo provides cached, dependency-aware build/lint/test pipelines
- Shared types and utilities in `packages/shared` are consumed by both apps

## Consequences
- Single repo for all code — simpler CI/CD, atomic commits across packages
- pnpm provides fast installs with strict dependency isolation
- Turborepo caching speeds up repeated builds
- Developers need pnpm installed (enforced via `packageManager` field)
