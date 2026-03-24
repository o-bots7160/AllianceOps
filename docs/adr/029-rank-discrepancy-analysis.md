# ADR 029: Rank Discrepancy Analysis

## Status

Accepted

## Context

In FRC competitions, a team's TBA qualification rank (based on Ranking Points — wins plus bonus RPs) can diverge significantly from their EPA rank (Statbotics' Expected Points Added, which isolates individual contribution). This discrepancy is a critical signal for alliance selection:

- **Team 9541 example**: TBA Rank #7, EPA Rank #15 — strong alliance partners carried their ranking via "strength of schedule"
- **Team 4004 example**: TBA Rank #21, EPA Rank #12 — performing well but held back by weaker pairings

No existing open-source FRC tool computes this per-team partner/opponent strength analysis. Understanding *why* a rank diverges is essential for making informed alliance picks.

## Decision

Add a **Rank Discrepancy Analysis** feature consisting of:

1. **Pure-function strategy engine** (`packages/shared/src/strategy/rank-analysis.ts`) that computes partner strength, opponent strength, and classifies the discrepancy cause for each team
2. **Collapsible UI in TeamCard** that transforms the rank metadata line into an expandable section showing the analysis
3. **Client-side computation** via `useMemo` in parent pages — no API endpoint needed

### Algorithm

For each team at an event:
- Compute `partnerStrength = avgPartnerEpa / fieldAvgEpa` (excluding self, across all qual matches)
- Compute `opponentStrength = avgOpponentEpa / fieldAvgEpa`
- Track win-loss split between strong-partner and weak-partner matches
- Classify into one of seven determinations based on rank delta (±3 threshold) and strength ratios (0.9/1.1 thresholds):
  - **accurate** — ranking aligns with performance
  - **carried** — strong partners elevated ranking
  - **easy_schedule** — weak opponents inflated record
  - **favorable** — average schedule but lucky outcomes
  - **underrated** — strong performer with weak partners
  - **tough_schedule** — faced above-average opponents
  - **unlucky** — average schedule but poor outcomes

### Client-Side Architecture

The analysis runs in a `useMemo` in the Briefing and Planner pages, using the same teams and matches data already fetched by `useApi`. This was chosen over an API endpoint because:
- The computation is trivial (~360 iterations for 30 teams × 12 matches)
- Both parent pages already have the required data loaded
- Simulation cursor-awareness comes free — cursor-filtered matches flow in, analysis reflects point-in-time state
- Eliminates an extra API round-trip and server-side caching complexity

## Alternatives Considered

1. **API endpoint with server-side caching**: Would add a `GET /api/event/{eventKey}/rank-analysis` endpoint using `cached()` with SEMI_STATIC TTL. Rejected because the input data is already available client-side, the computation is lightweight, and simulation cursor filtering would require either duplicating the logic server-side or losing cursor-awareness.

2. **OPR-based analysis**: Use Offensive Power Rating (linear algebra decomposition) instead of EPA. Rejected because EPA is already available via Statbotics and provides a more accurate Bayesian estimate of individual contribution, while OPR would require additional computation and is less reliable with small sample sizes.

3. **Only show for large discrepancies (±4+)**: Skip the section entirely for teams with ±3 or less delta. Rejected in favor of always showing with an "Accurate" label, which provides positive confirmation and helps users understand what the section means.

## Consequences

- TeamCard gains a new optional `rankAnalysis` prop — backward compatible (non-collapsible when absent)
- Briefing and Planner pages add a `useMemo` computation — negligible performance impact
- New strategy engine follows existing patterns (`analyzePath`, `generateBriefing`, `generatePicklist`)
- 12 unit tests cover all seven determination categories plus edge cases
- Future enhancement: per-match drill-down, RP-specific attribution, EPA trend overlay
