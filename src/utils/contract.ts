import type { PlayerSalary } from '../types/salary';
import type { Mode } from '../components/Layout';

/** Years added to a deal when an expired contract is re-signed. */
export const RESIGN_YEARS = 3;

/** Re-signing costs 10% under the reference value, never less than $1. */
export function getResignPrice(refValue: number | undefined): number {
  return Math.max(1, Math.round((refValue ?? 1) * 0.9));
}

export interface EffectiveContract {
  salary: number;
  contractYears: number;
  /** True when in-season auto re-signing produced these terms. */
  isAutoResigned: boolean;
}

/**
 * The contract a player is actually playing under.
 *
 * In-season there are no expired deals: anyone still rostered with 0 years left
 * has been re-signed, so he carries the discounted reference price on a fresh
 * 3-year term. Offseason keeps the raw contract, since expiring players are
 * still pending decisions.
 */
export function getEffectiveContract(
  salary: PlayerSalary,
  refValue: number | undefined,
  mode: Mode,
): EffectiveContract {
  if (mode === 'inseason' && salary.contractYears === 0) {
    return {
      salary: getResignPrice(refValue),
      contractYears: RESIGN_YEARS,
      isAutoResigned: true,
    };
  }
  return {
    salary: salary.salary,
    contractYears: salary.contractYears,
    isAutoResigned: false,
  };
}

/** Dead cap owed on a cut: multi-year deals spread, single-year deals halve. */
export function getDeadCapHit(salary: number, contractYears: number): number {
  if (contractYears > 1) return Math.ceil(salary / contractYears);
  return Math.floor(salary / 2);
}
