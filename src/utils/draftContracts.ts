import type { SleeperDraft, SleeperDraftPick, SleeperPlayer } from '../types/sleeper';
import type { PlayerSalary } from '../types/salary';

/** Rookie deals run three years at the salary fixed by where the pick landed. */
export const ROOKIE_CONTRACT_YEARS = 3;

/** Free agents bought at auction sign for a single year at the winning bid. */
export const AUCTION_CONTRACT_YEARS = 1;

/**
 * Rookie salary by draft position. First round is tiered by slot; later rounds
 * are flat.
 */
export function getRookieSalary(round: number, draftSlot: number): number {
  if (round === 1) {
    if (draftSlot <= 4) return 8;
    if (draftSlot <= 8) return 6;
    return 4;
  }
  if (round === 2) return 2;
  return 1;
}

function playerName(pick: SleeperDraftPick, playerDB: Record<string, SleeperPlayer>): string {
  const player = playerDB[pick.player_id];
  if (player) return player.full_name ?? `${player.first_name} ${player.last_name}`;
  const meta = pick.metadata;
  return meta ? `${meta.first_name ?? ''} ${meta.last_name ?? ''}`.trim() : pick.player_id;
}

/**
 * Contracts created by a draft.
 *
 * A drafted player is under contract from the moment he is picked, so the draft
 * itself is no longer a cap charge — the resulting contracts are. Only completed
 * drafts count; a draft still pending has produced no contracts.
 *
 * Salaries are locked for this season only. Next year these become the prior-year
 * figure and re-price through the usual blend like any other contract.
 */
/** A contract taking effect at a point in time, used to price a cut correctly. */
export interface ContractEvent {
  playerId: string;
  /** Epoch ms at which these terms took effect. */
  at: number;
  salary: number;
  contractYears: number;
}

/**
 * Draft contracts stamped with when the draft finished.
 *
 * Dead cap has to be priced against the contract a player held on the day he was
 * cut, so a deal signed after that cut must not be allowed to reach back and
 * change it.
 */
export function getDraftContractEvents(
  drafts: SleeperDraft[],
  picksByDraft: Record<string, SleeperDraftPick[]>,
  playerDB: Record<string, SleeperPlayer>,
): ContractEvent[] {
  const events: ContractEvent[] = [];

  for (const draft of drafts) {
    if (draft.status !== 'complete') continue;
    const at = draft.last_picked ?? draft.start_time;
    if (at == null) continue;

    const contracts = getDraftContracts([draft], picksByDraft, playerDB);
    for (const contract of Object.values(contracts)) {
      events.push({
        playerId: contract.playerId,
        at,
        salary: contract.salary,
        contractYears: contract.contractYears,
      });
    }
  }

  return events;
}

export function getDraftContracts(
  drafts: SleeperDraft[],
  picksByDraft: Record<string, SleeperDraftPick[]>,
  playerDB: Record<string, SleeperPlayer>,
): Record<string, PlayerSalary> {
  const contracts: Record<string, PlayerSalary> = {};

  for (const draft of drafts) {
    if (draft.status !== 'complete') continue;
    const picks = picksByDraft[draft.draft_id];
    if (!picks) continue;

    const isAuction = draft.type === 'auction';

    for (const pick of picks) {
      if (!pick.player_id) continue;

      let salary: number;
      let contractYears: number;

      if (isAuction) {
        const bid = Number(pick.metadata?.amount);
        // A bid of $0 is still a real contract, but a missing one is not usable.
        if (!Number.isFinite(bid)) continue;
        salary = Math.max(1, bid);
        contractYears = AUCTION_CONTRACT_YEARS;
      } else {
        salary = getRookieSalary(pick.round, pick.draft_slot);
        contractYears = ROOKIE_CONTRACT_YEARS;
      }

      contracts[pick.player_id] = {
        playerId: pick.player_id,
        name: playerName(pick, playerDB),
        contractYears,
        salary,
      };
    }
  }

  return contracts;
}
