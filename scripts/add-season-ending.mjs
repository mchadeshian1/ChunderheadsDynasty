/**
 * Lists a player as out for the rest of the season.
 *
 * Sleeper's injury status only says "IR", never how long, so season-ending
 * injuries are recorded by hand in src/data/seasonEndingInjuries.ts. This script
 * does that edit, and does the checking that is easy to skip when doing it by
 * hand: a player listed under the wrong id, or one who was never placed on IR,
 * is silently worth nothing, because credit only reaches a roster that actually
 * carried him in the ledger.
 *
 * A name is resolved against Sleeper's player list. An ambiguous name is
 * refused rather than guessed at — pass the player id instead. A player who is
 * not in the IR ledger is also refused, since listing him would do nothing;
 * --force records him anyway, for a designation made ahead of the next snapshot.
 *
 * Run with:  node scripts/add-season-ending.mjs "Cole Kmet" "Jake Tonges"
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const INJURIES_PATH = join(ROOT, 'src', 'data', 'seasonEndingInjuries.ts');
const LEDGER_PATH = join(ROOT, 'src', 'data', 'irLedger.json');

/** The last week credit can run through; see utils/irCredit.ts. */
const SEASON_WEEKS = 17;

async function getJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`);
  return res.json();
}

function fullName(player) {
  return player.full_name ?? `${player.first_name ?? ''} ${player.last_name ?? ''}`.trim();
}

/** Describes a player the way the refusal messages need him. */
function describe(id, player) {
  const where = [player.position, player.team ?? 'FA'].filter(Boolean).join(' ');
  return `${fullName(player)} (${where}, id ${id})`;
}

/**
 * The player a given argument names.
 *
 * An id is taken as given. A name matches on the full name first and falls back
 * to a substring, so a last name alone works as long as it is unambiguous once
 * players without a team are set aside.
 */
function resolve(query, playerDB) {
  if (playerDB[query]) return { id: query, player: playerDB[query] };

  const wanted = query.toLowerCase().trim();
  const entries = Object.entries(playerDB).filter(([, p]) => p.position && fullName(p));

  const exact = entries.filter(([, p]) => fullName(p).toLowerCase() === wanted);
  let matches = exact.length > 0
    ? exact
    : entries.filter(([, p]) => fullName(p).toLowerCase().includes(wanted));

  // Sleeper's list keeps everyone who has ever played, so a bare last name
  // drags in decades of retirees. Anyone on a team today is who was meant.
  const active = matches.filter(([, p]) => p.team);
  if (active.length > 0) matches = active;

  if (matches.length === 0) return { error: `No player matches "${query}".` };
  if (matches.length > 1) {
    const listed = matches.slice(0, 10).map(([id, p]) => `  ${describe(id, p)}`).join('\n');
    const more = matches.length > 10 ? `\n  ...and ${matches.length - 10} more` : '';
    return { error: `"${query}" matches ${matches.length} players; pass an id instead:\n${listed}${more}` };
  }

  const [id, player] = matches[0];
  return { id, player };
}

/** Every roster that has carried the player on IR, with his first week there. */
function ledgerStints(playerId, ledger) {
  const stints = {};
  for (const [weekKey, rostersInWeek] of Object.entries(ledger.weeks)) {
    const week = Number(weekKey);
    for (const [rosterId, playerIds] of Object.entries(rostersInWeek)) {
      if (!playerIds.includes(playerId)) continue;
      const stint = (stints[rosterId] ??= { weeks: 0, firstWeek: week });
      stint.weeks += 1;
      stint.firstWeek = Math.min(stint.firstWeek, week);
    }
  }
  return stints;
}

/** Single quotes to match the file, doubled only for a name like "De'Von". */
function quote(value) {
  return value.includes("'") ? `"${value}"` : `'${value}'`;
}

function addEntries(source, additions) {
  const close = source.indexOf('\n};', source.indexOf('SEASON_ENDING_INJURIES'));
  if (close < 0) throw new Error(`Could not find the end of SEASON_ENDING_INJURIES in ${INJURIES_PATH}`);
  const lines = additions.map(({ id, name }) => `  ${quote(id)}: ${quote(name)},`).join('\n');
  return `${source.slice(0, close)}\n${lines}${source.slice(close)}`;
}

async function main() {
  const args = process.argv.slice(2);
  const force = args.includes('--force');
  const queries = args.filter(a => a !== '--force');

  if (queries.length === 0) {
    console.error('Usage: node scripts/add-season-ending.mjs [--force] "<name or player id>" ...');
    process.exit(2);
  }

  const source = readFileSync(INJURIES_PATH, 'utf8');
  const ledger = JSON.parse(readFileSync(LEDGER_PATH, 'utf8'));
  const playerDB = await getJSON('https://api.sleeper.app/v1/players/nfl');

  const additions = [];
  const problems = [];

  for (const query of queries) {
    const { id, player, error } = resolve(query, playerDB);
    if (error) {
      problems.push(error);
      continue;
    }

    if (new RegExp(`['"]${id}['"]\\s*:`).test(source)) {
      console.log(`${describe(id, player)} is already listed; nothing to do.`);
      continue;
    }

    const stints = ledgerStints(id, ledger);
    const rosters = Object.entries(stints);

    if (rosters.length === 0) {
      const message = `${describe(id, player)} is not on IR in the ledger, so listing him would credit nobody.`;
      if (!force) {
        problems.push(`${message}\n  Re-run with --force to list him anyway.`);
        continue;
      }
      console.log(`${message} Listing anyway (--force).`);
    }

    for (const [rosterId, { weeks, firstWeek }] of rosters) {
      const credited = SEASON_WEEKS - firstWeek + 1;
      console.log(
        `${describe(id, player)}: roster ${rosterId}, on IR since week ${firstWeek} ` +
        `(${weeks} week${weeks === 1 ? '' : 's'} recorded) -> credited for ${credited} weeks.`,
      );
    }

    additions.push({ id, name: fullName(player) });
  }

  if (problems.length > 0) {
    for (const problem of problems) console.error(problem);
    process.exit(1);
  }

  if (additions.length === 0) return;

  writeFileSync(INJURIES_PATH, addEntries(source, additions));
  console.log(`Listed ${additions.length} player${additions.length === 1 ? '' : 's'} in ${INJURIES_PATH}.`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
