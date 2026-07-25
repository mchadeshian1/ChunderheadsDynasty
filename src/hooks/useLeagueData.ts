import { useState, useEffect } from 'react';
import type { SleeperLeague, EnrichedTeam } from '../types/sleeper';
import { fetchLeague, fetchUsers, fetchRosters } from '../api/sleeper';

export function useLeagueData() {
  const [league, setLeague] = useState<SleeperLeague | null>(null);
  const [teams, setTeams] = useState<EnrichedTeam[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [leagueData, users, rosters] = await Promise.all([
          fetchLeague(),
          fetchUsers(),
          fetchRosters(),
        ]);
        if (cancelled) return;

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
        setTeams(enriched);
      } catch {
        if (!cancelled) setError('Failed to load league data');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  return { league, teams, loading, error };
}
