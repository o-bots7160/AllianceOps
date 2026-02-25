'use client';

import { useState, useEffect } from 'react';
import { getApiBase } from '../lib/api-base';
import { scaleEpaToStart } from '../lib/simulation-filters';

interface TeamSiteEvent {
  eventKey: string;
  epa: {
    total: number;
    auto: number;
    teleop: number;
    endgame: number;
    breakdown?: Record<string, number>;
  };
  startEpa: number;
  preElimEpa: number;
  record: { wins: number; losses: number; ties: number };
}

interface EnrichedTeam {
  team_number: number;
  nickname: string;
  epa: {
    total: number;
    auto: number;
    teleop: number;
    endgame: number;
    breakdown?: Record<string, number>;
  } | null;
  eventRecord: { wins: number; losses: number; ties: number } | null;
  winrate: number | null;
}

/**
 * Fetch Statbotics site data for match-relevant teams and build a simulation-aware epaMap.
 * When simulation cursor is active, EPA values are scaled to pre-event levels.
 * When cursor is null, returns the original epaMap unchanged.
 *
 * @param relevantTeamNumbers - Only these teams will be fetched via the batch endpoint.
 *   Pass the team numbers from the current match (typically 6) instead of all event teams.
 *   When empty or undefined, the fetch is skipped until match teams are known.
 */
export function useSimulationEpa(
  teams: EnrichedTeam[] | null,
  eventKey: string,
  year: number,
  activeCursor: number | null,
  relevantTeamNumbers?: number[],
): Map<number, EnrichedTeam> {
  const [siteData, setSiteData] = useState<Map<number, TeamSiteEvent[]>>(new Map());
  const [fetched, setFetched] = useState<string>('');

  // Build the base epaMap from all event teams (used for EPA lookups)
  const baseMap = new Map<number, EnrichedTeam>();
  if (teams) {
    for (const t of teams) {
      baseMap.set(t.team_number, t);
    }
  }

  // Only fetch site data for the relevant (match) teams, not all event teams
  const fetchTeams = relevantTeamNumbers?.slice().sort((a, b) => a - b) ?? [];
  const fetchKey =
    activeCursor !== null && fetchTeams.length > 0 ? `${fetchTeams.join(',')}-${year}` : '';

  useEffect(() => {
    if (!fetchKey || fetchKey === fetched) return;

    const controller = new AbortController();

    async function fetchBatch() {
      const base = getApiBase();
      const results = new Map<number, TeamSiteEvent[]>();

      try {
        const res = await fetch(`${base}/teams/site-batch`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ teamNumbers: fetchTeams, year }),
          signal: controller.signal,
        });
        if (res.ok) {
          const json = await res.json();
          const data = json.data as Record<string, TeamSiteEvent[]>;
          for (const [num, events] of Object.entries(data)) {
            results.set(parseInt(num, 10), events ?? []);
          }
        }
      } catch {
        // Ignore fetch errors (abort or network failure)
      }

      if (!controller.signal.aborted) {
        setSiteData(results);
        setFetched(fetchKey);
      }
    }

    fetchBatch();
    return () => controller.abort();
  }, [fetchKey]);

  // If simulation is not active, return base map
  if (activeCursor === null) return baseMap;

  // Build adjusted map using start-of-event EPA
  const adjustedMap = new Map<number, EnrichedTeam>();
  for (const [num, team] of baseMap) {
    const events = siteData.get(num);
    const eventData = events?.find((e) => e.eventKey === eventKey);

    if (eventData && team.epa) {
      const scaledEpa = scaleEpaToStart(team.epa, eventData.startEpa);
      adjustedMap.set(num, {
        ...team,
        epa: {
          total: scaledEpa.total,
          auto: scaledEpa.auto,
          teleop: scaledEpa.teleop,
          endgame: scaledEpa.endgame,
          breakdown: scaledEpa.breakdown,
        },
        eventRecord: eventData.record,
        winrate: null,
      });
    } else {
      adjustedMap.set(num, team);
    }
  }

  return adjustedMap;
}
