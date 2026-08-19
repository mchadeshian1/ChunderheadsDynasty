import type { SleeperTransaction } from '../types/transaction';
import type { SleeperRoster } from '../types/sleeper';
import type { PlayerSalary } from '../types/salary';
import { isRetired } from '../data/retiredPlayers';
import { getDeadCapHit } from './contract';
import type { ContractEvent } from './draftContracts';

/**
 * The contract a player was playing under at a given moment.
 *
 * A cut is charged against the deal the player actually held that day. Signing
 * elsewhere later — at auction, or off waivers — must not reach back and change
 * what the cut cost, so only events at or before the cut are considered.
 */
function contractAsOf(
  playerId: string,
  at: number,
  salaryMap: Record<string, PlayerSalary>,
  events: ContractEvent[],
): { salary: number; contractYears: number } | undefined {
  let current = salaryMap[playerId]
    ? { salary: salaryMap[playerId].salary, contractYears: salaryMap[playerId].contractYears }
    : undefined;
  let currentAt = -Infinity;

  for (const event of events) {
    if (event.playerId !== playerId) continue;
    if (event.at > at) continue;
    if (event.at < currentAt) continue;
    current = { salary: event.salary, contractYears: event.contractYears };
    currentAt = event.at;
  }

  return current;
}

/** Waiver and free agent pickups sign for $1 on a one-year deal. */
function getWaiverContractEvents(transactions: SleeperTransaction[]): ContractEvent[] {
  const events: ContractEvent[] = [];
  for (const txn of transactions) {
    if (txn.type !== 'waiver' && txn.type !== 'free_agent') continue;
    if (!txn.adds) continue;
    for (const playerId of Object.keys(txn.adds)) {
      events.push({ playerId, at: txn.created, salary: 1, contractYears: 1 });
    }
  }
  return events;
}

export interface DeadCapEntry {
  playerId: string;
  salary: number;
  contractYears: number;
  deadCap: number;
  isAmnesty: boolean;
}

export interface TeamDeadCap {
  total: number;
  entries: DeadCapEntry[];
}

export function getPreSeasonDeadCap(
  transactions: SleeperTransaction[],
  rosters: SleeperRoster[],
  salaryMap: Record<string, PlayerSalary>,
  draftEvents: ContractEvent[] = [],
): Record<number, TeamDeadCap> {
  const rosterPlayers: Record<number, Set<string>> = {};
  for (const r of rosters) {
    rosterPlayers[r.roster_id] = new Set(r.players ?? []);
  }

  const events = [...draftEvents, ...getWaiverContractEvents(transactions)];
  const cutsByRoster: Record<number, DeadCapEntry[]> = {};

  for (const txn of transactions) {
    if (txn.type === 'trade') continue;
    if (txn.leg > 1) continue;
    if (!txn.drops) continue;

    for (const [playerId, rosterId] of Object.entries(txn.drops)) {
      if (rosterPlayers[rosterId]?.has(playerId)) continue;

      // A retired player's contract is voided, so no dead cap follows him.
      if (isRetired(playerId)) continue;

      // Priced against the deal he held on the day he was cut, not whatever he
      // signed somewhere else afterwards.
      const salary = contractAsOf(playerId, txn.created, salaryMap, events);
      if (!salary || salary.contractYears <= 0 || salary.salary <= 0) continue;

      const dc = getDeadCapHit(salary.salary, salary.contractYears);
      if (dc <= 0) continue;

      if (!cutsByRoster[rosterId]) cutsByRoster[rosterId] = [];
      if (cutsByRoster[rosterId].some(e => e.playerId === playerId)) continue;

      cutsByRoster[rosterId].push({
        playerId,
        salary: salary.salary,
        contractYears: salary.contractYears,
        deadCap: dc,
        isAmnesty: false,
      });
    }
  }

  const result: Record<number, TeamDeadCap> = {};
  for (const [rosterIdStr, entries] of Object.entries(cutsByRoster)) {
    const rosterId = Number(rosterIdStr);

    let maxIdx = 0;
    for (let i = 1; i < entries.length; i++) {
      if (entries[i].deadCap > entries[maxIdx].deadCap) maxIdx = i;
    }
    entries[maxIdx].isAmnesty = true;

    const total = entries.reduce((sum, e) => sum + (e.isAmnesty ? 0 : e.deadCap), 0);
    result[rosterId] = { total, entries };
  }

  return result;
}
