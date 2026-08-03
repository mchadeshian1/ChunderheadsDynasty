import { useState, useEffect, useRef, useCallback } from 'react';
import type { SleeperTransaction } from '../types/transaction';
import { fetchTransactions } from '../api/sleeper';

const POLL_INTERVAL = 5 * 60 * 1000;

export function useTransactions(currentWeek: number) {
  const [transactions, setTransactions] = useState<SleeperTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const weekCache = useRef<Map<number, SleeperTransaction[]>>(new Map());

  const load = useCallback(async (signal: AbortSignal) => {
    if (currentWeek <= 0) return;

    try {
      setLoading(true);
      const all: SleeperTransaction[] = [];

      for (let week = 1; week <= currentWeek; week++) {
        if (week < currentWeek && weekCache.current.has(week)) {
          all.push(...weekCache.current.get(week)!);
          continue;
        }

        const weekTxns = await fetchTransactions(week);
        if (signal.aborted) return;

        const completed = weekTxns.filter(t => t.status === 'complete');
        weekCache.current.set(week, completed);
        all.push(...completed);
      }

      if (!signal.aborted) {
        setTransactions(all);
        setError(null);
      }
    } catch {
      if (!signal.aborted) setError('Failed to load transactions');
    } finally {
      if (!signal.aborted) setLoading(false);
    }
  }, [currentWeek]);

  useEffect(() => {
    if (currentWeek <= 0) {
      setTransactions([]);
      return;
    }

    const controller = new AbortController();
    load(controller.signal);
    const interval = setInterval(() => load(controller.signal), POLL_INTERVAL);
    return () => {
      controller.abort();
      clearInterval(interval);
    };
  }, [load, currentWeek]);

  return { transactions, currentWeek, loading, error };
}
