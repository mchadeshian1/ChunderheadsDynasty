/**
 * Records which players are on IR, one snapshot per run.
 *
 * Sleeper does not report when a player was placed on IR: moving a player to the
 * reserve slot is a roster-settings change, not a transaction, so it never shows
 * up in the transactions feed. The only way to know how long someone sat on IR is
 * to observe it while it is happening, which is what this script is for.
 *
 * The ledger is keyed week -> rosterId -> playerIds, so a player's time on IR is
 * simply the number of weeks he appears under that roster. Re-recording the same
 * week is a no-op, which makes the script safe to run as often as you like.
 * Because it is keyed by roster, credit does not follow a traded player.
 *
 * Run locally with:  node scripts/snapshot-ir.mjs
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const LEAGUE_ID = '1353095041182072832';
const LEDGER_PATH = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'data', 'irLedger.json');

/** Sleeper injury designations that earn salary relief. */
const CREDITED_STATUSES = new Set(['IR', 'PUP']);

async function getJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`);
  return res.json();
}

async function main() {
  // The league's own settings.leg reads 1 even in the preseason, so the NFL
  // state endpoint is what tells us whether games have actually started.
  const state = await getJSON('https://api.sleeper.app/v1/state/nfl');
  if (state.season_type !== 'regular') {
    console.log(`Season type is "${state.season_type}", not regular; nothing to record.`);
    return;
  }

  const week = state.week;
  if (!week || week < 1) {
    console.log(`No active week (week=${week}); nothing to record.`);
    return;
  }

  const [rosters, playerDB] = await Promise.all([
    getJSON(`https://api.sleeper.app/v1/league/${LEAGUE_ID}/rosters`),
    getJSON('https://api.sleeper.app/v1/players/nfl'),
  ]);

  const ledger = existsSync(LEDGER_PATH)
    ? JSON.parse(readFileSync(LEDGER_PATH, 'utf8'))
    : { updated: null, weeks: {} };

  const weekKey = String(week);
  const before = JSON.stringify(ledger.weeks[weekKey] ?? null);
  const thisWeek = { ...(ledger.weeks[weekKey] ?? {}) };

  let recorded = 0;
  for (const roster of rosters) {
    const onIR = (roster.reserve ?? []).filter(pid => {
      const player = playerDB[pid];
      return player && CREDITED_STATUSES.has(player.injury_status);
    });
    if (onIR.length === 0) continue;

    // Union with anything already recorded, so a player who is activated
    // mid-week still keeps credit for the week he was hurt.
    const merged = new Set([...(thisWeek[roster.roster_id] ?? []), ...onIR]);
    thisWeek[roster.roster_id] = [...merged].sort();
    recorded += onIR.length;

    for (const pid of onIR) {
      const p = playerDB[pid];
      console.log(`  week ${week}  roster ${roster.roster_id}  ${p.full_name} (${p.injury_status})`);
    }
  }

  if (Object.keys(thisWeek).length > 0) ledger.weeks[weekKey] = thisWeek;

  if (JSON.stringify(ledger.weeks[weekKey] ?? null) === before) {
    console.log(`Week ${week}: no change (${recorded} players on IR already recorded).`);
    return;
  }

  ledger.updated = new Date().toISOString();
  writeFileSync(LEDGER_PATH, JSON.stringify(ledger, null, 2) + '\n');
  console.log(`Week ${week}: ledger updated with ${recorded} player-entries.`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
