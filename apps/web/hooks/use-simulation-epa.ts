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
 * Fetch Statbotics site data for multiple teams and build a simulation-aware epaMap.
 * When simulation cursor is active, EPA values are scaled to pre-event levels.
 * When cursor is null, returns the original epaMap unchanged.
 */
export function useSimulationEpa(
  teams: EnrichedTeam[] | null,
  eventKey: string,
  year: number,
  activeCursor: number | null,
): Map<number, EnrichedTeam> {
  const [siteData, setSiteData] = useState<Map<number, TeamSiteEvent[]>>(new Map());
  const [fetched, setFetched] = useState<string>('');

  // Build the base epaMap
  const baseMap = new Map<number, EnrichedTeam>();
  if (teams) {
    for (const t of teams) {
      baseMap.set(t.team_number, t);
    }
  }

  // Determine which teams to fetch site data for
  const teamNumbers = teams?.map((t) => t.team_number).sort((a, b) => a - b) ?? [];
  const fetchKey = activeCursor !== null ? `${teamNumbers.join(',')}-${year}` : '';

  useEffect(() => {
    if (!fetchKey || fetchKey === fetched) return;

    const controller = new AbortController();

    async function fetchAll() {
      const base = getApiBase();
      const results = new Map<number, TeamSiteEvent[]>();

      const promises = teamNumbers.map(async (num) => {
        try {
          const res = await fetch(`${base}/team/${num}/site?year=${year}`, {
            signal: controller.signal,
          });
          if (!res.ok) return;
          const json = await res.json();
          results.set(num, json.data ?? []);
        } catch {
          // Ignore fetch errors for individual teams
        }
      });

      await Promise.all(promises);
      if (!controller.signal.aborted) {
        setSiteData(results);
        setFetched(fetchKey);
      }
    }

    fetchAll();
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
