import type { SleeperTransaction } from '../types/transaction';
import type { SleeperRoster, SleeperPlayer } from '../types/sleeper';
import type { PlayerSalary } from '../types/salary';

export interface PlayerIRCredit {
  playerId: string;
  weeks: number;
  credit: number;
}

export interface TeamIRCredits {
  total: number;
  players: PlayerIRCredit[];
}

function findIRPlacementWeek(
  playerId: string,
  rosterId: number,
  transactions: SleeperTransaction[],
): number | null {
  let earliestWeek: number | null = null;

  for (const txn of transactions) {
    if (txn.adds && txn.adds[playerId] === rosterId) {
      if (earliestWeek === null || txn.leg < earliestWeek) {
        earliestWeek = txn.leg;
      }
    }
  }

  return earliestWeek;
}

export function computeIRCredits(
  transactions: SleeperTransaction[],
  rosters: SleeperRoster[],
  playerDB: Record<string, SleeperPlayer>,
  salaryMap: Record<string, PlayerSalary>,
  currentWeek: number,
): Record<number, TeamIRCredits> {
  const result: Record<number, TeamIRCredits> = {};

  for (const roster of rosters) {
    const irPlayers = (roster.reserve ?? []).filter(pid => {
      const player = playerDB[pid];
      if (!player) return false;
      const status = player.injury_status;
      return status === 'IR' || status === 'PUP';
    });

    const players: PlayerIRCredit[] = [];
    let total = 0;

    for (const pid of irPlayers) {
      const salary = salaryMap[pid];
      if (!salary || salary.salary <= 0) continue;

      const placementWeek = findIRPlacementWeek(pid, roster.roster_id, transactions) ?? 1;
      const weeks = Math.max(0, currentWeek - placementWeek + 1);
      const credit = Math.floor(weeks * salary.salary / 17);

      if (credit > 0) {
        players.push({ playerId: pid, weeks, credit });
        total += credit;
      }
    }

    if (players.length > 0) {
      result[roster.roster_id] = { total, players };
    }
  }

  return result;
}
