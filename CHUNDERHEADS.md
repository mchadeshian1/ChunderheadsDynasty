# Chunderheads Dynasty

Fantasy football salary cap league website for the 12-team "Chunderheads" Sleeper dynasty league.

## Project Overview

- **League ID**: `1353095041182072832`
- **Live site**: https://mchadeshian1.github.io/ChunderheadsDynasty/
- **Repo**: https://github.com/mchadeshian1/ChunderheadsDynasty
- **Repo on disk**: `/Users/hadeshian/Desktop/Chunderheads/ChunderheadsDynasty 2/`
- **Owner email**: mikaelhadeshian@gmail.com

## Tech Stack

- React 19 + Vite 8 + TypeScript 6 + Tailwind CSS v3 (dark theme)
- No router, no state library, no data-fetching library — fully client-side
- Deployed to GitHub Pages via `peaceiris/actions-gh-pages@v4` (pushes built `dist/` to `gh-pages` branch)
- Vite `base` set to `/ChunderheadsDynasty/` for subdirectory hosting

## Current Features

### Roster Viewer
- Fetches league data, users, rosters from Sleeper API (public, no auth, CORS-enabled)
- Tabbed interface showing all 12 teams
- Each team shows: avatar, team name, manager name, total salary, committed salary
- Players split into Starters (with slot labels like QB, RB1, WR2, SFLEX), Bench, IR sections
- Each player card shows: position badge (color-coded), name, NFL team, ref value, salary, contract years

### Salary System
- Salaries loaded from `src/data/salaries.csv` (parsed at build time via Vite `?raw` import)
- Name matching uses `src/utils/salaryMatch.ts` with ~75 `NAME_OVERRIDES` for misspellings
- Reference values in `src/data/referenceValues.ts` (hardcoded map of ~250 players, averaged from redraft + dynasty sheets)
- Shows "unmatched salary entries" and "rostered players without salary" diagnostics

### Offseason Mode (Cut / Re-sign Tools)
- **Under-contract players** (contractYears > 0): Cut checkbox available, Re-sign greyed out
  - Cutting a player: dead cap = `floor(salary / 2)`, shown in red font
- **Expired players** (contractYears === 0): Re-sign checkbox available
  - Re-signing a player: cost = `max(1, floor(refValue * 0.9))` (10% discount from ref)
  - Shown in green as the new salary
- **Committed Salary** reflects all cut/re-sign decisions in real-time
- Logic in `TeamRoster.tsx` `sumCommitted()` function

### Draft Picks
- Fetches traded picks and draft order from Sleeper API
- Computes pick ownership accounting for trades
- Draft pick cap hits: R1 picks 1-4=$8, 5-8=$6, 9-12=$4; R2=$2; R3=$1
- Shows "(via trade)" label for acquired picks
- Draft cap hit added to both Total Salary and Committed Salary

### Polling
- 5-minute interval for roster/trade data updates via `useCallback` + `setInterval` + `AbortController`
- "Last updated" timestamp shown at bottom

### Player DB Caching
- ~5MB NFL player database cached in localStorage with 24-hour TTL
- try/catch for QuotaExceededError

## File Structure

```
src/
  main.tsx                         # Entry point
  App.tsx                          # Root: fetches data, manages selected tab, wires everything
  index.css                        # Tailwind directives + dark theme
  api/sleeper.ts                   # API fetch functions (league, users, rosters, traded_picks, drafts, playerDB)
  types/sleeper.ts                 # SleeperLeague, SleeperUser, SleeperRoster, SleeperPlayer, SleeperTradedPick, SleeperDraft, DraftPick, EnrichedTeam
  types/salary.ts                  # SalaryEntry, PlayerSalary
  hooks/useLeagueData.ts           # Fetches + merges league data, computes draft pick ownership, 5-min polling
  hooks/usePlayerDB.ts             # Fetches + caches player DB in localStorage
  data/salaries.csv                # Raw salary/contract data (Name,,Length,Salary format)
  data/salaryData.ts               # CSV parser
  data/referenceValues.ts          # Reference value map + buildRefMap() + normalize()
  utils/salaryMatch.ts             # Name normalization, overrides, matching salaries to Sleeper player IDs
  utils/avatarUrl.ts               # Resolves user avatar URL from Sleeper CDN or metadata
  utils/rosterSlots.ts             # Derives slot labels (QB, RB1, RB2, SFLEX) from roster_positions
  components/Layout.tsx            # Header bar ("Chunderheads Dynasty") + content wrapper
  components/TeamTabs.tsx          # Horizontal scrollable tab bar for 12 teams
  components/TeamHeader.tsx        # Avatar + team name + manager name
  components/TeamRoster.tsx        # Full roster: starters/bench/IR/draft picks + salary totals + cut/re-sign state
  components/RosterSection.tsx     # Labeled section rendering PlayerCards with slot labels
  components/PlayerCard.tsx        # Player row: position badge, name, NFL team, ref, salary, cut/re-sign checkboxes
  components/MissingSalaries.tsx   # Diagnostic: rostered players without salary entries (grouped by team)
  components/UnmatchedPlayers.tsx  # Diagnostic: CSV salary entries that didn't match any Sleeper player
  components/LoadingSpinner.tsx
  components/ErrorMessage.tsx
.github/workflows/deploy.yml      # GitHub Pages deployment workflow
vite.config.ts                     # base: '/ChunderheadsDynasty/'
```

## Sleeper API Endpoints Used

- `GET /v1/league/1353095041182072832` — league info + roster_positions + total_rosters
- `GET /v1/league/1353095041182072832/users` — 12 managers (user_id, display_name, metadata.team_name)
- `GET /v1/league/1353095041182072832/rosters` — 12 rosters (owner_id, players[], starters[], reserve[])
- `GET /v1/players/nfl` — all NFL players (~5MB, cached in localStorage)
- `GET /v1/league/1353095041182072832/traded_picks` — traded picks for draft ownership computation
- `GET /v1/league/1353095041182072832/drafts` — draft order info (draft_order, settings.rounds)
- User avatars: `https://sleepercdn.com/avatars/thumbs/{avatar_id}`

## Key Implementation Details

### Salary Matching
CSV entries have human-typed names with many typos. `NAME_OVERRIDES` in `salaryMatch.ts` maps ~75 misspelled names to correct Sleeper API names. Name normalization strips punctuation, suffixes (Jr/Sr/II/III), lowercases, and collapses whitespace. When multiple players share a normalized name, `pickBestPlayer()` prefers active players on NFL teams.

### Draft Pick Ownership
Uses Sleeper's `traded_picks` endpoint. Creates a map of `"{round}-{roster_id}" -> owner_id` from trades. For each round/roster combo, checks if a trade entry exists; if so, assigns the pick to the new owner. Maps `roster_id -> user_id -> draft_order position` to determine pick-in-round numbering. Traded picks display "(via trade)" label.

### Committed Salary Calculation
```
sumCommitted = for each rostered player:
  if under contract AND cut:         floor(salary / 2)           # dead cap
  if under contract AND NOT cut:     salary                      # full salary  
  if expired AND re-signed:          max(1, floor(ref * 0.9))    # 10% discount
  if expired AND NOT re-signed:      0                           # not committed
  + sum of all draft pick cap hits
```

### Salary Recalculation Formula (already applied for 2025)
- Decrement contract years by 1
- If years > 0: `new_salary = floor(2/3 * current_salary + 1/3 * reference_value)`
- If years == 0: `new_salary = reference_value` (contract expired, reset to market)
- All $0 reference values treated as $1; minimum salary floor of $1

## Deployment

- GitHub Pages via `peaceiris/actions-gh-pages@v4` workflow (`.github/workflows/deploy.yml`)
- Workflow triggers on push to `main`, runs `npm ci && npm run build`, deploys `dist/` to `gh-pages` branch
- **IMPORTANT**: GitHub Pages source MUST be set to "Deploy from a branch" → `gh-pages` → `/ (root)`
- Do NOT use "GitHub Actions" as the Pages source — that caused blank page issues before
- Do NOT use "Deploy from main" — that serves the raw `index.html` which references `/src/main.tsx` and shows a blank page
- Manual deploy also possible: `npm run deploy` (uses `gh-pages` npm package directly)
- **Known recurring issue**: The Pages source sometimes gets reset (possibly by the user clicking "manually redeploy" in GitHub UI). If the site goes blank, check that Pages is still pointing to `gh-pages` branch, not `main`.

## Git History

```
8dc7c4f Chunderheads Dynasty roster viewer with salary integration
7f743bf Add offseason mode: reference values, committed salary, re-sign and cut tools
992f2f7 Add draft pick cap hits and 5-minute API polling
26b11af Add GitHub Pages deployment
70814d1 Trigger Pages redeploy
87360e3 Switch to gh-pages branch deployment
c4822de Add 10% re-sign discount
```

## Planned Future Work

### Email Notifications for Pending Trades
Send email to mikaelhadeshian@gmail.com when a trade is pending:
- List affected teams, players involved, projected salary impact
- Send updated email if implied roster changes while trade is still pending
- Clear when trade is completed/rejected
- Requires a backend (serverless function or cron job) — can't send emails client-side
- Poll `GET /v1/league/{id}/transactions/{week}` for `type === "trade"` and `status === "pending"`

### Manual Salary Input UI
After keeper/draft decisions:
- Form to enter salaries for rookies entering the league
- Form for players acquired through auction draft
- These players won't have existing CSV entries

### Pending Trade Indicators on Website
- "PENDING" badge on PlayerCard for players in pending trades
- Reflect projected post-trade salary for each team
- Cross-reference transaction log with roster player IDs

### Reference Sheet Notes
139 players in the salary CSV were not found in the 2025 reference value sheets. Most are expired contracts ($0 years remaining) set to $1 minimum. Some active contracts had no reference value and used $0 for the reference portion of the formula. These may need manual review.
