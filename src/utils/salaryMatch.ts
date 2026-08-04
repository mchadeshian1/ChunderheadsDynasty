import type { SleeperPlayer } from '../types/sleeper';
import type { SalaryEntry, PlayerSalary } from '../types/salary';

const NAME_OVERRIDES: Record<string, string> = {
  "De'andre Swift": "D'Andre Swift",
  "Russel Wilson": "Russell Wilson",
  "JJ Mcarthy": "J.J. McCarthy",
  "Jonathan Metchie": "John Metchie",
  "Garret Wilson": "Garrett Wilson",
  "Kenneth Gainwell": "Kenny Gainwell",
  "Zack Ertz": "Zach Ertz",
  "Jaalen Guyton": "Jalen Guyton",
  "Jalen McMilan": "Jalen McMillan",
  "Marshawn Loyd": "Marshawn Lloyd",
  "Dalton Shultz": "Dalton Schultz",
  "Rome Adunze": "Rome Odunze",
  "Jonathan Brooks": "Jonathon Brooks",
  "Rasheed Shaheed": "Rashid Shaheed",
  "Frank Gore Jr": "Frank Gore",
  "Isaiah Hodgens": "Isaiah Hodgins",
  "Luke Shoonmaker": "Luke Schoonmaker",
  "Christian McCaffery": "Christian McCaffrey",
  "Jimmy Garappolo": "Jimmy Garoppolo",
  "Ricky Pearshall": "Ricky Pearsall",
  "Brendan Rice": "Brenden Rice",
  "Jermain Burton": "Jermaine Burton",
  "Ray Ray Mcloud": "Ray-Ray McCloud",
  "Mason Rudolf": "Mason Rudolph",
  "Jackson Smith-Njiba": "Jaxon Smith-Njigba",
  "Ezekiel Elliot": "Ezekiel Elliott",
  "Ben Sinnot": "Ben Sinnott",
  "Cordarelle Patterson": "Cordarrelle Patterson",
  "Will Dissley": "Will Dissly",
  "Mike Geseki": "Mike Gesicki",
  "Ryan Tanehill": "Ryan Tannehill",
  "Jaleel McLoughlin": "Jaleel McLaughlin",
  "Odell Beckham Jr": "Odell Beckham",
  "Clyde Edwards Helare": "Clyde Edwards-Helaire",
  "D'onte Foreman": "D'Onta Foreman",
  "Juju Smith-Shuster": "JuJu Smith-Schuster",
  "Jacoby Brisset": "Jacoby Brissett",
  "Emmanual Wilson": "Emanuel Wilson",
  "Dallas Goddert": "Dallas Goedert",
  "Xavier Lagette": "Xavier Legette",
  "Wan'dale Robinson": "Wan'Dale Robinson",
  "Ja'Tavion Sanders": "Ja'Tavion Sanders",
  "Travis Ettiene": "Travis Etienne",
  "Aiden O'Connel": "Aidan O'Connell",
  "Marques Valdes-Scantling": "Marquez Valdes-Scantling",
  "Chigoziem Okonkwo": "Chig Okonkwo",
  "Jailen Nailor": "Jalen Nailor",
  "Mattew Stafford": "Matthew Stafford",
  "MitchellTinsley": "Mitch Tinsley",
  "Tyquan Thorton": "Tyquan Thornton",
  "Phil Mufah": "Phil Mafah",
  "Justice Hell": "Justice Hill",
  "Adam Theilan": "Adam Thielen",
  "Kayshon Butte": "Kayshon Boutte",
  "Hollywood Brown": "Marquise Brown",
  "Trevor Ettiene": "Trevor Etienne",
  "Jakoby Brisset": "Jacoby Brissett",
  "Rusell Wilson": "Russell Wilson",
  "Juaun Jennings": "Jauan Jennings",
  "Tyler Shlough": "Tyler Shough",
  "Emari Demarcado": "Emari Demercado",
  "Auric Estime": "Audric Estime",
  "Rashid Shaheed": "Rashid Shaheed",
  "Dont'e Thornton": "Dont'e Thornton",
  "Jayden Higgens": "Jayden Higgins",
  "Harold Fannin": "Harold Fannin",
  "Orande Gadsden": "Oronde Gadsden",
  "Cameron Ward": "Cam Ward",
  "KaVante Turpin": "KaVontae Turpin",
  "Bam Knight": "Zonovan Knight",
};

function normalize(name: string): string {
  return name
    .toLowerCase()
    .replace(/[''`.]/g, '')
    .replace(/[-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildNormalizedMap(playerDB: Record<string, SleeperPlayer>): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const [id, player] of Object.entries(playerDB)) {
    if (!player.full_name && !player.first_name) continue;
    const fullName = player.full_name ?? `${player.first_name} ${player.last_name}`;
    const key = normalize(fullName);
    const existing = map.get(key);
    if (existing) {
      existing.push(id);
    } else {
      map.set(key, [id]);
    }
  }
  return map;
}

function pickBestPlayer(ids: string[], playerDB: Record<string, SleeperPlayer>): string {
  // Prefer active player on an NFL team
  for (const id of ids) {
    const p = playerDB[id];
    if (p?.team && p.active) return id;
  }
  // Fallback: prefer any with a team
  for (const id of ids) {
    if (playerDB[id]?.team) return id;
  }
  return ids[0];
}

export function matchSalaries(
  entries: SalaryEntry[],
  playerDB: Record<string, SleeperPlayer>
): { matched: Record<string, PlayerSalary>; unmatched: SalaryEntry[] } {
  const normalizedMap = buildNormalizedMap(playerDB);
  const matched: Record<string, PlayerSalary> = {};
  const unmatched: SalaryEntry[] = [];

  for (const entry of entries) {
    const correctedName = NAME_OVERRIDES[entry.name] ?? entry.name;
    const key = normalize(correctedName);
    const playerIds = normalizedMap.get(key);
    const playerId = playerIds ? pickBestPlayer(playerIds, playerDB) : undefined;

    if (playerId) {
      matched[playerId] = {
        playerId,
        name: entry.name,
        contractYears: entry.contractYears,
        salary: entry.salary,
        refValue: entry.refValue,
      };
    } else {
      unmatched.push(entry);
    }
  }

  return { matched, unmatched };
}
