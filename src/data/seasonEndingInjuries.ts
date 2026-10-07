/**
 * Players ruled out for the rest of the season.
 *
 * Sleeper's injury status only says "IR", never how long, so season-ending
 * injuries are recorded by hand. A listed player is credited up front for every
 * week from his first recorded week on IR through the end of the season, rather
 * than accruing a week at a time. See utils/irCredit.ts.
 *
 * Credit still goes only to a roster that actually had him on IR in the ledger,
 * so listing a player who was never placed on IR does nothing.
 *
 * Keys are Sleeper player IDs; values are names for readability only.
 */
export const SEASON_ENDING_INJURIES: Record<string, string> = {
  '9226': "De'Von Achane",
  '12508': 'Jaxson Dart',
  '10222': 'Jayden Reed',
  '12484': 'Jayden Higgins',
};

export function isOutForSeason(playerId: string): boolean {
  return playerId in SEASON_ENDING_INJURIES;
}
