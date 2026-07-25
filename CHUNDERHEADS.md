# Chunderheads Dynasty

Fantasy football salary cap league website for the 12-team "Chunderheads" Sleeper league.

## What's Built (Step 1)

**Roster Viewer** — A React + Vite + TypeScript web app that queries the Sleeper API and displays each team's roster in a tabbed interface.

- Tabs for all 12 teams with team name, manager, and avatar
- Rosters split into Starters, Bench, and IR sections
- Position-colored badges (QB/RB/WR/TE/K/DEF)
- Injury status indicators from Sleeper
- Salary and contract length displayed per player
- Team salary totals and section subtotals
- Player database cached in localStorage (24h TTL, ~5MB)

**Salary Integration** — Player salaries imported from `src/data/salaries.csv` and matched to Sleeper player IDs.

- Fuzzy name matching via normalization (lowercase, strip punctuation, collapse whitespace)
- ~70 manual name overrides in `src/utils/salaryMatch.ts` for CSV misspellings and nicknames
- Duplicate player name resolution (prefers active players on NFL teams)
- "Show rostered players without salary" toggle at bottom of page
- "Show unmatched salary entries" toggle for CSV entries that couldn't be matched

**Salary Recalculation** — Applied 2025 offseason salary updates using two reference value sheets (redraft + dynasty cheatsheets, averaged). All `$0` values in the reference sheets are treated as `$1`.

- Formula: decrement contract years by 1
- If years > 0: `new_salary = floor(2/3 * current_salary + 1/3 * avg_reference_value)`
- If years == 0: `new_salary = reference_value` (contract expired, reset to market value)
- All results are rounded down (`Math.floor`)
- Players not in either reference sheet use $1 as their reference value
- Minimum salary floor of $1

## Tech Stack

- React 18 + Vite + TypeScript
- Tailwind CSS v3 (dark theme)
- Sleeper API (public, no auth, CORS-enabled)
- No backend — fully client-side

## Key Files

| File | Purpose |
|------|---------|
| `src/App.tsx` | Root component, data fetching orchestration |
| `src/api/sleeper.ts` | Sleeper API fetch functions, league ID constant |
| `src/data/salaries.csv` | Player salary/contract data (Name,,Length,Salary) |
| `src/data/salaryData.ts` | CSV parser |
| `src/utils/salaryMatch.ts` | Name matching with overrides, normalization |
| `src/utils/rosterSlots.ts` | Derives slot labels from league config |
| `src/hooks/useLeagueData.ts` | Fetches league + users + rosters |
| `src/hooks/usePlayerDB.ts` | Fetches + caches player database |
| `src/components/TeamRoster.tsx` | Full roster view with salary totals |
| `src/components/PlayerCard.tsx` | Individual player row with salary display |
| `src/components/MissingSalaries.tsx` | Lists rostered players without salary entries |

## Sleeper API Endpoints

- `GET /v1/league/1353095041182072832` — league info + roster positions
- `GET /v1/league/1353095041182072832/users` — 12 managers
- `GET /v1/league/1353095041182072832/rosters` — 12 rosters
- `GET /v1/players/nfl` — all NFL players (~5MB)
- `GET /v1/league/{id}/transactions/{week}` — transactions (for future use)

## What's Left To Do

### Step 2: Pending Trade Email Notifications

Send an email to mikaelhadeshian@gmail.com whenever there is a pending trade:
- List affected teams, players involved, and projected salary impact
- If the implied roster changes while a trade is pending, send an updated email
- When a trade is completed or rejected, clear the pending status
- Requires a backend component (Node.js server, serverless functions, or polling cron job)
- Poll `GET /v1/league/{id}/transactions/{week}` for `type === "trade"` and `status === "pending"`

### Manual Salary Input

After keeper/draft decisions are made:
- UI form to manually enter salaries for rookies entering the league
- UI form for players acquired through the auction draft
- These players won't have existing CSV entries

### Pending Trade Indicators on Website

- Show "PENDING" badge on PlayerCard for players involved in pending trades
- Reflect projected post-trade salary for each team
- Cross-reference transaction log with roster player IDs

### Reference Sheet Notes

139 players in the salary CSV were not found in the 2025 reference value sheets. Most are expired contracts ($0 years remaining) set to $1 minimum. Some active contracts had no reference value and used $0 for the reference portion of the formula. These may need manual review.
