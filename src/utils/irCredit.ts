import type { PlayerSalary } from '../types/salary';
import irLedger from '../data/irLedger.json';
import { isOutForSeason } from '../data/seasonEndingInjuries';
import { getEffectiveContract } from './contract';

export interface PlayerIRCredit {
  playerId: string;
  weeks: number;
  credit: number;
  /** Credited through the end of the season; see data/seasonEndingInjuries.ts. */
  outForSeason: boolean;
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

interface IRStint {
  /** Weeks recorded on IR. */
  weeks: number;
  /** Earliest week recorded on IR. */
  firstWeek: number;
}

/**
 * Weeks each player spent on IR, and the first of them, per roster.
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
function stintsOnIRByRoster(): Record<number, Record<string, IRStint>> {
  const ledger = irLedger as IRLedger;
  const stints: Record<number, Record<string, IRStint>> = {};

  for (const [weekKey, rostersInWeek] of Object.entries(ledger.weeks)) {
    const week = Number(weekKey);
    for (const [rosterId, playerIds] of Object.entries(rostersInWeek)) {
      const rid = Number(rosterId);
      const forRoster = (stints[rid] ??= {});
      for (const playerId of playerIds) {
        const stint = (forRoster[playerId] ??= { weeks: 0, firstWeek: week });
        stint.weeks += 1;
        stint.firstWeek = Math.min(stint.firstWeek, week);
      }
    }
  }

  return stints;
}

/**
 * IR credit per roster.
 *
 * `seasonStarted` gates the whole calculation: nothing is credited until the
 * regular season is under way, so preseason IR designations are worth nothing.
 *
 * A player listed as out for the season is credited for every week from his
 * first week on IR through week 17, whether or not those weeks have happened yet.
 *
 * Credit is figured on the salary actually being paid, so an expired deal that
 * was auto re-signed in-season is credited at its re-sign price.
 */
export function computeIRCredits(
  salaryMap: Record<string, PlayerSalary>,
  refMap: Record<string, number>,
  seasonStarted: boolean,
): Record<number, TeamIRCredits> {
  const result: Record<number, TeamIRCredits> = {};
  if (!seasonStarted) return result;

  for (const [rosterId, playerStints] of Object.entries(stintsOnIRByRoster())) {
    const players: PlayerIRCredit[] = [];
    let total = 0;

    for (const [playerId, { weeks, firstWeek }] of Object.entries(playerStints)) {
      const contract = salaryMap[playerId];
      if (!contract) continue;
      const salary = getEffectiveContract(contract, refMap[playerId], 'inseason').salary;
      if (salary <= 0) continue;

      const outForSeason = isOutForSeason(playerId);
      const weeksMissed = outForSeason ? SEASON_WEEKS - firstWeek + 1 : weeks;
      const creditedWeeks = Math.min(SEASON_WEEKS, Math.max(MINIMUM_WEEKS, weeks, weeksMissed));
      const credit = Math.floor((creditedWeeks * salary) / SEASON_WEEKS);
      if (credit <= 0) continue;

      players.push({ playerId, weeks: creditedWeeks, credit, outForSeason });
      total += credit;
    }

    if (players.length > 0) {
      result[Number(rosterId)] = { total, players };
    }
  }

  return result;
}
