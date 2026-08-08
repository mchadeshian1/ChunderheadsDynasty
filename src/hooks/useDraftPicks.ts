import { useState, useEffect } from 'react';
import type { SleeperDraft, SleeperDraftPick } from '../types/sleeper';
import { fetchDrafts, fetchDraftPicks } from '../api/sleeper';

/**
 * Results of every completed draft, keyed by draft id.
 *
 * Only completed drafts are fetched: a pending draft has no picks to read, and
 * a completed one never changes, so this loads once rather than polling.
 */
export function useDraftPicks() {
  const [drafts, setDrafts] = useState<SleeperDraft[]>([]);
  const [picksByDraft, setPicksByDraft] = useState<Record<string, SleeperDraftPick[]>>({});

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const allDrafts = await fetchDrafts();
        if (cancelled) return;
        setDrafts(allDrafts);

        const completed = allDrafts.filter(d => d.status === 'complete');
        const results = await Promise.all(
          completed.map(async d => [d.draft_id, await fetchDraftPicks(d.draft_id)] as const),
        );
        if (cancelled) return;

        setPicksByDraft(Object.fromEntries(results));
      } catch {
        // Draft data is supplementary; the roster view still works without it.
      }
    })();

    return () => { cancelled = true; };
  }, []);

  return { drafts, picksByDraft };
}
