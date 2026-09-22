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
  /** Epoch ms of the cut. */
  cutAt: number;
  isAmnesty: boolean;
}

export interface TeamDeadCap {
  total: number;
  entries: DeadCapEntry[];
}

/**
 * Dead cap from every cut this season, with each team's amnesty applied.
 *
 * The amnesty forgives one cut per team: the largest hit among cuts made before
 * the supplemental draft. Cuts after that deadline still cost dead cap but are
 * not eligible. Until the deadline is known every cut is a candidate.
 */
export function getDeadCap(
  transactions: SleeperTransaction[],
  rosters: SleeperRoster[],
  salaryMap: Record<string, PlayerSalary>,
  draftEvents: ContractEvent[] = [],
  amnestyDeadline?: number,
): Record<number, TeamDeadCap> {
  const rosterPlayers: Record<number, Set<string>> = {};
  for (const r of rosters) {
    rosterPlayers[r.roster_id] = new Set(r.players ?? []);
  }

  const events = [...draftEvents, ...getWaiverContractEvents(transactions)];
  const cutsByRoster: Record<number, DeadCapEntry[]> = {};

  // Oldest first, so a player cut, re-signed, and cut again is charged for the
  // original cut rather than whichever one Sleeper happened to list first.
  const chronological = [...transactions].sort((a, b) => a.created - b.created);

  for (const txn of chronological) {
    // Trades move a contract rather than ending it, so nothing is owed. Cuts
    // count in every week, not just the preseason: `leg` is the week a
    // transaction landed in, and an in-season cut owes dead cap like any other.
    if (txn.type === 'trade') continue;
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
        cutAt: txn.created,
        isAmnesty: false,
      });
    }
  }

  const result: Record<number, TeamDeadCap> = {};
  for (const [rosterIdStr, entries] of Object.entries(cutsByRoster)) {
    const rosterId = Number(rosterIdStr);

    let maxIdx = -1;
    for (let i = 0; i < entries.length; i++) {
      if (amnestyDeadline != null && entries[i].cutAt >= amnestyDeadline) continue;
      if (maxIdx < 0 || entries[i].deadCap > entries[maxIdx].deadCap) maxIdx = i;
    }
    if (maxIdx >= 0) entries[maxIdx].isAmnesty = true;

    const total = entries.reduce((sum, e) => sum + (e.isAmnesty ? 0 : e.deadCap), 0);
    result[rosterId] = { total, entries };
  }

  return result;
}
