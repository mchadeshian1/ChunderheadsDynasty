import { useState, useEffect, useCallback, useRef } from 'react';
import type { SleeperLeague, EnrichedTeam, SleeperNFLState } from '../types/sleeper';
import { fetchLeague, fetchUsers, fetchRosters, fetchNFLState } from '../api/sleeper';

const POLL_INTERVAL = 5 * 60 * 1000;

export function useLeagueData() {
  const [league, setLeague] = useState<SleeperLeague | null>(null);
  const [nflState, setNflState] = useState<SleeperNFLState | null>(null);
  const [teams, setTeams] = useState<EnrichedTeam[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const initialLoad = useRef(true);

  const load = useCallback(async (signal: AbortSignal) => {
    try {
      const [leagueData, users, rosters, state] = await Promise.all([
        fetchLeague(),
        fetchUsers(),
        fetchRosters(),
        fetchNFLState(),
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

      setLeague(leagueData);
      setNflState(state);
      setTeams(enriched);
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

  // Games are actually being played, as opposed to the preseason. The league's
  // own settings.leg reads 1 year-round and cannot answer this.
  const seasonStarted = nflState?.season_type === 'regular';

  return { league, nflState, seasonStarted, teams, lastUpdated, loading, error };
}
