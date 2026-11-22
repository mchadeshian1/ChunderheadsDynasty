/**
 * Checks that the IR ledger actually recorded the week just played.
 *
 * A missed week cannot be recovered: Sleeper reports who is on IR right now and
 * nothing about the past, so a Sunday that goes unrecorded is gone, and the
 * credit owed for it is gone with it. The snapshot job cannot raise that alarm
 * itself — the failure mode is the job never running, and GitHub drops scheduled
 * runs without a word. So this runs on Monday and fails if Sunday left no mark,
 * which surfaces as a failed workflow and an email.
 *
 * Sleeper does not roll the week over until Tuesday, so on Monday state.week is
 * still the week whose Sunday has just been played.
 *
 * Run with:  node scripts/audit-ir.mjs
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const LEDGER_PATH = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'data', 'irLedger.json');

async function getJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`);
  return res.json();
}

async function main() {
  const state = await getJSON('https://api.sleeper.app/v1/state/nfl');
  if (state.season_type !== 'regular') {
    console.log(`Season type is "${state.season_type}", not regular; nothing to audit.`);
    return;
  }

  const week = state.week;
  if (!week || week < 1) {
    console.log(`No active week (week=${week}); nothing to audit.`);
    return;
  }

  const ledger = JSON.parse(readFileSync(LEDGER_PATH, 'utf8'));
  const recorded = ledger.weeks[String(week)] ?? {};
  const rosters = Object.keys(recorded).length;

  if (rosters === 0) {
    console.error(
      `Week ${week} is missing from the IR ledger.\n` +
      `Sunday's snapshot did not run, or ran outside Sunday in New York. ` +
      `Anyone who is still on IR can be recorded by dispatching the Snapshot IR ` +
      `workflow before the week rolls over on Tuesday; after that the week is lost.`,
    );
    process.exit(1);
  }

  const players = Object.values(recorded).reduce((n, ids) => n + ids.length, 0);
  console.log(`Week ${week}: ${players} player-entries across ${rosters} rosters. Ledger is current.`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
