/**
 * Players who have retired.
 *
 * Sleeper exposes no retirement flag — a retired player still reads
 * status "Active" with a null team, which is indistinguishable from any
 * free agent — so these are recorded by hand.
 *
 * A retired player's contract is voided: dropping him carries no dead cap.
 *
 * Keys are Sleeper player IDs; values are names for readability only.
 */
export const RETIRED_PLAYERS: Record<string, string> = {
  '11619': "Ja'Lynn Polk",
};

export function isRetired(playerId: string): boolean {
  return playerId in RETIRED_PLAYERS;
}
