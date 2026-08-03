import type { SleeperTransaction } from '../types/transaction';
import type { SleeperRoster } from '../types/sleeper';
import type { PlayerSalary } from '../types/salary';

export function getWaiverOverrides(
  transactions: SleeperTransaction[],
  rosters: SleeperRoster[],
): Record<string, PlayerSalary> {
  const rosteredPlayers = new Set<string>();
  for (const roster of rosters) {
    for (const pid of roster.players ?? []) {
      rosteredPlayers.add(pid);
    }
  }

  const overrides: Record<string, PlayerSalary> = {};

  for (const txn of transactions) {
    if (txn.type !== 'waiver' && txn.type !== 'free_agent') continue;
    if (!txn.adds) continue;

    for (const playerId of Object.keys(txn.adds)) {
      if (rosteredPlayers.has(playerId)) {
        overrides[playerId] = {
          playerId,
          name: '',
          contractYears: 1,
          salary: 1,
        };
      }
    }
  }

  return overrides;
}
