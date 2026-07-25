import { useState, useEffect, useCallback, useRef } from 'react';
import type { SleeperLeague, EnrichedTeam, DraftPick } from '../types/sleeper';
import { fetchLeague, fetchUsers, fetchRosters, fetchTradedPicks, fetchDrafts } from '../api/sleeper';

const POLL_INTERVAL = 5 * 60 * 1000;

function pickSalary(round: number, pickInRound: number): number {
  if (round === 1) {
    if (pickInRound <= 4) return 8;
    if (pickInRound <= 8) return 6;
    return 4;
  }
  if (round === 2) return 2;
  return 1;
}

export function useLeagueData() {
  const [league, setLeague] = useState<SleeperLeague | null>(null);
  const [teams, setTeams] = useState<EnrichedTeam[]>([]);
  const [draftPicksByRoster, setDraftPicksByRoster] = useState<Record<number, DraftPick[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const initialLoad = useRef(true);

  const load = useCallback(async (signal: AbortSignal) => {
    try {
      const [leagueData, users, rosters, tradedPicks, drafts] = await Promise.all([
        fetchLeague(),
        fetchUsers(),
        fetchRosters(),
        fetchTradedPicks(),
        fetchDrafts(),
      ]);
      if (signal.aborted) return;

      const userMap = new Map(users.map(u => [u.user_id, u]));
      const enriched: EnrichedTeam[] = rosters
        .map(roster => {
          const user = userMap.get(roster.owner_id);
          if (!user) return null;
          return { roster, user };
        })
        .filter((t): t is EnrichedTeam => t !== null)
        .sort((a, b) => a.roster.roster_id - b.roster.roster_id);

      const season = leagueData.season;
      const draft = drafts.find(d => d.season === season);
      const draftOrder = draft?.draft_order ?? {};

      const rosterToPickPosition: Record<number, number> = {};
      for (const roster of rosters) {
        const pos = draftOrder[roster.owner_id];
        if (pos != null) rosterToPickPosition[roster.roster_id] = pos;
      }

      const totalRosters = leagueData.total_rosters;
      const rounds = draft?.settings?.rounds ?? 3;
      const seasonTrades = tradedPicks.filter(p => p.season === season);

      const tradeMap = new Map<string, number>();
      for (const t of seasonTrades) {
        tradeMap.set(`${t.round}-${t.roster_id}`, t.owner_id);
      }

      const picksByRoster: Record<number, DraftPick[]> = {};
      for (let round = 1; round <= rounds; round++) {
        for (let rosterId = 1; rosterId <= totalRosters; rosterId++) {
          const ownerRosterId = tradeMap.get(`${round}-${rosterId}`) ?? rosterId;
          const pickInRound = rosterToPickPosition[rosterId] ?? rosterId;
          const pick: DraftPick = {
            round,
            pickInRound,
            originalRosterId: rosterId,
            salary: pickSalary(round, pickInRound),
          };
          if (!picksByRoster[ownerRosterId]) picksByRoster[ownerRosterId] = [];
          picksByRoster[ownerRosterId].push(pick);
        }
      }

      for (const picks of Object.values(picksByRoster)) {
        picks.sort((a, b) => a.round - b.round || a.pickInRound - b.pickInRound);
      }

      setLeague(leagueData);
      setTeams(enriched);
      setDraftPicksByRoster(picksByRoster);
      setLastUpdated(new Date());
    } catch {
      if (!signal.aborted) setError('Failed to load league data');
    } finally {
      if (!signal.aborted && initialLoad.current) {
        setLoading(false);
        initialLoad.current = false;
      }
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    const interval = setInterval(() => load(controller.signal), POLL_INTERVAL);
    return () => {
      controller.abort();
      clearInterval(interval);
    };
  }, [load]);

  return { league, teams, draftPicksByRoster, lastUpdated, loading, error };
}
