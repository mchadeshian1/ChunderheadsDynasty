import { useState, useMemo, useCallback } from 'react';
import { useLeagueData } from './hooks/useLeagueData';
import { usePlayerDB } from './hooks/usePlayerDB';
import { useTransactions } from './hooks/useTransactions';
import { parseSalaryCSV } from './data/salaryData';
import { matchSalaries } from './utils/salaryMatch';
import { buildRefMap } from './data/referenceValues';
import { getWaiverOverrides } from './utils/transactions';
import { computeIRCredits } from './utils/irCredit';
import { getPreSeasonDeadCap } from './utils/deadCap';
import { Layout } from './components/Layout';
import type { Mode } from './components/Layout';
import { TeamTabs } from './components/TeamTabs';
import { TeamRoster } from './components/TeamRoster';
import { UnmatchedPlayers } from './components/UnmatchedPlayers';
import { MissingSalaries } from './components/MissingSalaries';
import { LoadingSpinner } from './components/LoadingSpinner';
import { ErrorMessage } from './components/ErrorMessage';

const salaryEntries = parseSalaryCSV();

function App() {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [showUnmatched, setShowUnmatched] = useState(false);
  const [showMissing, setShowMissing] = useState(false);
  const [mode, setMode] = useState<Mode>('offseason');
  const toggleMode = useCallback(() => setMode(m => m === 'offseason' ? 'inseason' : 'offseason'), []);
  const { league, teams, draftPicksByRoster, lastUpdated, loading: leagueLoading, error: leagueError } = useLeagueData();
  const { playerDB, loading: playersLoading, error: playersError } = usePlayerDB();

  const currentWeek = league?.settings?.leg ?? 0;
  const { transactions } = useTransactions(currentWeek);

  const { matched: salaryMap, unmatched } = useMemo(() => {
    if (!playerDB) return { matched: {}, unmatched: salaryEntries };
    return matchSalaries(salaryEntries, playerDB);
  }, [playerDB]);

  const refMap = useMemo(() => {
    if (!playerDB) return {};
    return buildRefMap(playerDB);
  }, [playerDB]);

  const waiverOverrides = useMemo(() => {
    if (!transactions.length || !teams.length) return {};
    return getWaiverOverrides(transactions, teams.map(t => t.roster));
  }, [transactions, teams]);

  const effectiveSalaryMap = useMemo(() => {
    if (!Object.keys(waiverOverrides).length) return salaryMap;
    return { ...salaryMap, ...waiverOverrides };
  }, [salaryMap, waiverOverrides]);

  const irCredits = useMemo(() => {
    if (mode !== 'inseason' || !teams.length || !playerDB || !currentWeek) return {};
    return computeIRCredits(transactions, teams.map(t => t.roster), playerDB, effectiveSalaryMap, currentWeek);
  }, [mode, transactions, teams, playerDB, effectiveSalaryMap, currentWeek]);

  const preSeasonDeadCap = useMemo(() => {
    if (mode !== 'inseason' || !transactions.length || !teams.length) return {};
    return getPreSeasonDeadCap(transactions, teams.map(t => t.roster), salaryMap);
  }, [mode, transactions, teams, salaryMap]);

  const activeSalaryMap = effectiveSalaryMap;

  const hasMissingSalaries = useMemo(() => {
    if (!teams.length) return false;
    return teams.some(t => (t.roster.players ?? []).some(pid => !activeSalaryMap[pid]));
  }, [teams, activeSalaryMap]);

  const loading = leagueLoading || playersLoading;
  const error = leagueError || playersError;

  return (
    <Layout mode={mode} onToggleMode={toggleMode}>
      {loading && <LoadingSpinner />}
      {error && <ErrorMessage message={error} onRetry={() => window.location.reload()} />}
      {!loading && !error && league && playerDB && teams.length > 0 && (
        <>
          <TeamTabs
            teams={teams}
            selectedIndex={selectedIndex}
            onSelect={setSelectedIndex}
          />
          <div className="px-4 py-6">
            <TeamRoster
              team={teams[selectedIndex]}
              playerDB={playerDB}
              salaryMap={activeSalaryMap}
              refMap={refMap}
              draftPicks={draftPicksByRoster[teams[selectedIndex].roster.roster_id] ?? []}
              rosterPositions={league.roster_positions}
              mode={mode}
              irCredits={irCredits[teams[selectedIndex].roster.roster_id]}
              deadCap={preSeasonDeadCap[teams[selectedIndex].roster.roster_id]}
            />
          </div>
          {hasMissingSalaries && (
            <div className="border-t border-gray-800 px-4 py-4">
              <button
                onClick={() => setShowMissing(!showMissing)}
                className="text-sm font-medium text-yellow-400 hover:text-yellow-300"
              >
                {showMissing ? 'Hide' : 'Show'} rostered players without salary
              </button>
              {showMissing && (
                <MissingSalaries teams={teams} playerDB={playerDB} salaryMap={activeSalaryMap} />
              )}
            </div>
          )}
          {lastUpdated && (
            <div className="border-t border-gray-800 px-4 py-2 text-right text-xs text-gray-600">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </div>
          )}
          {unmatched.length > 0 && (
            <div className="border-t border-gray-800 px-4 py-4">
              <button
                onClick={() => setShowUnmatched(!showUnmatched)}
                className="text-sm font-medium text-yellow-400 hover:text-yellow-300"
              >
                {showUnmatched ? 'Hide' : 'Show'} unmatched salary entries ({unmatched.length})
              </button>
              {showUnmatched && <UnmatchedPlayers entries={unmatched} />}
            </div>
          )}
        </>
      )}
    </Layout>
  );
}

export default App;
