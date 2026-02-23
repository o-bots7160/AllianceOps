# ADR 003: GameDefinition Adapter Pattern

## Status
Accepted

## Context
FRC changes its game every season. Score breakdowns, game-specific metrics, and strategy concepts differ each year. The dashboard must work across seasons without hardcoding game-specific logic in the UI or core strategy engine.

## Decision
Implement a `GameDefinition` adapter interface with per-year implementations.

Each adapter:
- Maps TBA `score_breakdown` into generic buckets: `auto_points`, `teleop_points`, `endgame_points`, `penalty_points`, `misc_points`
- Defines game-specific metrics (e.g., coral levels, algae counts for 2025)
- Defines duty slot labels and templates (safe/balanced/aggressive)
- Registers itself in a central adapter registry keyed by year

## Consequences
- Core UI and strategy logic operate on generic `GenericBreakdown` — no season-specific code
- Adding a new season requires only a new adapter file (< 200 lines typically)
- Simulation replay can use any past season with an adapter
- First adapter: 2025 Reefscape
