import type { PlayerSalary } from '../types/salary';
import irLedger from '../data/irLedger.json';

export interface PlayerIRCredit {
  playerId: string;
  weeks: number;
  credit: number;
}

export interface TeamIRCredits {
  total: number;
  players: PlayerIRCredit[];
}

/** week -> rosterId -> player ids on IR that week */
interface IRLedger {
  updated: string | null;
  weeks: Record<string, Record<string, string[]>>;
}

/** A full season of relief is one full salary, so each week is worth 1/17th. */
const SEASON_WEEKS = 17;

/**
 * Landing on IR pays the first four weeks immediately, rather than a week at a
 * time. Past week four the credit accrues normally for as long as the player
 * stays on IR, so a short stint is still worth the full four weeks.
 */
const MINIMUM_WEEKS = 4;

/**
 * Weeks each player spent on IR, per roster.
 *
 * Sleeper cannot answer this: placing a player on IR is a roster-settings change
 * rather than a transaction, so it never appears in the transactions feed, and
 * once a player is activated there is nothing left to read. The ledger is written
 * by scripts/snapshot-ir.mjs on a daily schedule; see that file for details.
 *
 * Counting from the ledger rather than from live roster state means credit
 * survives activation, resumes correctly if a player is hurt again, and stays
 * with the roster that carried him rather than following him in a trade.
 */
function weeksOnIRByRoster(): Record<number, Record<string, number>> {
  const ledger = irLedger as IRLedger;
  const weeks: Record<number, Record<string, number>> = {};

  for (const rostersInWeek of Object.values(ledger.weeks)) {
    for (const [rosterId, playerIds] of Object.entries(rostersInWeek)) {
      const rid = Number(rosterId);
      const forRoster = (weeks[rid] ??= {});
      for (const playerId of playerIds) {
        forRoster[playerId] = (forRoster[playerId] ?? 0) + 1;
      }
    }
  }

  return weeks;
}

/**
 * IR credit per roster.
 *
 * `seasonStarted` gates the whole calculation: nothing is credited until the
 * regular season is under way, so preseason IR designations are worth nothing.
 */
export function computeIRCredits(
  salaryMap: Record<string, PlayerSalary>,
  seasonStarted: boolean,
): Record<number, TeamIRCredits> {
  const result: Record<number, TeamIRCredits> = {};
  if (!seasonStarted) return result;

  for (const [rosterId, playerWeeks] of Object.entries(weeksOnIRByRoster())) {
    const players: PlayerIRCredit[] = [];
    let total = 0;

    for (const [playerId, weeks] of Object.entries(playerWeeks)) {
      const salary = salaryMap[playerId];
      if (!salary || salary.salary <= 0) continue;

      const creditedWeeks = Math.max(MINIMUM_WEEKS, weeks);
      const credit = Math.floor((creditedWeeks * salary.salary) / SEASON_WEEKS);
      if (credit <= 0) continue;

      players.push({ playerId, weeks: creditedWeeks, credit });
      total += credit;
    }

    if (players.length > 0) {
      result[Number(rosterId)] = { total, players };
    }
  }

  return result;
}
