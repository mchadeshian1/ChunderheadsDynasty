import type { SleeperTransaction } from '../types/transaction';
import type { SleeperRoster } from '../types/sleeper';
import type { PlayerSalary } from '../types/salary';

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

function computeDeadCapHit(salary: number, contractYears: number): number {
  if (contractYears > 1) return Math.ceil(salary / contractYears);
  return Math.floor(salary / 2);
}

export function getPreSeasonDeadCap(
  transactions: SleeperTransaction[],
  rosters: SleeperRoster[],
  salaryMap: Record<string, PlayerSalary>,
): Record<number, TeamDeadCap> {
  const rosterPlayers: Record<number, Set<string>> = {};
  for (const r of rosters) {
    rosterPlayers[r.roster_id] = new Set(r.players ?? []);
  }

  const cutsByRoster: Record<number, DeadCapEntry[]> = {};

  for (const txn of transactions) {
    if (txn.type === 'trade') continue;
    if (txn.leg > 1) continue;
    if (!txn.drops) continue;

    for (const [playerId, rosterId] of Object.entries(txn.drops)) {
      if (rosterPlayers[rosterId]?.has(playerId)) continue;

      const salary = salaryMap[playerId];
      if (!salary || salary.contractYears <= 0 || salary.salary <= 0) continue;

      const dc = computeDeadCapHit(salary.salary, salary.contractYears);
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
