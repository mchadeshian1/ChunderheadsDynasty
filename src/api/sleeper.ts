import type { SleeperLeague, SleeperUser, SleeperRoster, SleeperPlayer } from '../types/sleeper';

const BASE = 'https://api.sleeper.app/v1';
export const LEAGUE_ID = '1353095041182072832';

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
