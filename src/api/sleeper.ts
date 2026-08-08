import type { SleeperLeague, SleeperUser, SleeperRoster, SleeperPlayer, SleeperTradedPick, SleeperDraft, SleeperNFLState } from '../types/sleeper';
import type { SleeperTransaction } from '../types/transaction';

const BASE = 'https://api.sleeper.app/v1';
export const LEAGUE_ID = '1353095041182072832';

/**
 * League-level `settings.leg` reads 1 even in the preseason, so it cannot be used
 * to tell whether games have started. This endpoint can: season_type is "pre"
 * until the regular season actually begins.
 */
export async function fetchNFLState(): Promise<SleeperNFLState> {
  const res = await fetch(`${BASE}/state/nfl`);
  if (!res.ok) throw new Error(`Failed to fetch NFL state: ${res.status}`);
  return res.json();
}

export async function fetchLeague(): Promise<SleeperLeague> {
  const res = await fetch(`${BASE}/league/${LEAGUE_ID}`);
  if (!res.ok) throw new Error(`Failed to fetch league: ${res.status}`);
  return res.json();
}

export async function fetchUsers(): Promise<SleeperUser[]> {
  const res = await fetch(`${BASE}/league/${LEAGUE_ID}/users`);
  if (!res.ok) throw new Error(`Failed to fetch users: ${res.status}`);
  return res.json();
}

export async function fetchRosters(): Promise<SleeperRoster[]> {
  const res = await fetch(`${BASE}/league/${LEAGUE_ID}/rosters`);
  if (!res.ok) throw new Error(`Failed to fetch rosters: ${res.status}`);
  return res.json();
}

export async function fetchPlayerDB(): Promise<Record<string, SleeperPlayer>> {
  const res = await fetch(`${BASE}/players/nfl`);
  if (!res.ok) throw new Error(`Failed to fetch player database: ${res.status}`);
  return res.json();
}

export async function fetchTradedPicks(): Promise<SleeperTradedPick[]> {
  const res = await fetch(`${BASE}/league/${LEAGUE_ID}/traded_picks`);
  if (!res.ok) throw new Error(`Failed to fetch traded picks: ${res.status}`);
  return res.json();
}

export async function fetchDrafts(): Promise<SleeperDraft[]> {
  const res = await fetch(`${BASE}/league/${LEAGUE_ID}/drafts`);
  if (!res.ok) throw new Error(`Failed to fetch drafts: ${res.status}`);
  return res.json();
}

export async function fetchTransactions(week: number): Promise<SleeperTransaction[]> {
  const res = await fetch(`${BASE}/league/${LEAGUE_ID}/transactions/${week}`);
  if (!res.ok) throw new Error(`Failed to fetch transactions for week ${week}: ${res.status}`);
  return res.json();
}
