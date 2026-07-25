import { useState, useEffect } from 'react';
import type { SleeperPlayer } from '../types/sleeper';
import { fetchPlayerDB } from '../api/sleeper';

const CACHE_KEY = 'sleeper_players_nfl';
const CACHE_TTL = 24 * 60 * 60 * 1000;

export function usePlayerDB() {
  const [playerDB, setPlayerDB] = useState<Record<string, SleeperPlayer> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
          const { data, timestamp } = JSON.parse(cached);
          if (Date.now() - timestamp < CACHE_TTL) {
            if (!cancelled) {
              setPlayerDB(data);
              setLoading(false);
            }
            return;
          }
        }
      } catch {
        // Cache read failed, fetch fresh
      }

      try {
        const data = await fetchPlayerDB();
        if (cancelled) return;
        setPlayerDB(data);
        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify({ data, timestamp: Date.now() }));
        } catch {
          // QuotaExceededError - proceed without caching
        }
      } catch {
        if (!cancelled) setError('Failed to load player database');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  return { playerDB, loading, error };
}
