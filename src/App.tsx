import { useState, useMemo } from 'react';
import { useLeagueData } from './hooks/useLeagueData';
import { usePlayerDB } from './hooks/usePlayerDB';
import { parseSalaryCSV } from './data/salaryData';
import { matchSalaries } from './utils/salaryMatch';
import { buildRefMap } from './data/referenceValues';
import { Layout } from './components/Layout';
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
  const { league, teams, draftPicksByRoster, lastUpdated, loading: leagueLoading, error: leagueError } = useLeagueData();
  const { playerDB, loading: playersLoading, error: playersError } = usePlayerDB();

  const { matched: salaryMap, unmatched } = useMemo(() => {
    if (!playerDB) return { matched: {}, unmatched: salaryEntries };
    return matchSalaries(salaryEntries, playerDB);
  }, [playerDB]);

  const refMap = useMemo(() => {
    if (!playerDB) return {};
    return buildRefMap(playerDB);
  }, [playerDB]);

  const hasMissingSalaries = useMemo(() => {
    if (!teams.length) return false;
    return teams.some(t => (t.roster.players ?? []).some(pid => !salaryMap[pid]));
  }, [teams, salaryMap]);

  const loading = leagueLoading || playersLoading;
  const error = leagueError || playersError;

  return (
    <Layout>
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
              salaryMap={salaryMap}
              refMap={refMap}
              draftPicks={draftPicksByRoster[teams[selectedIndex].roster.roster_id] ?? []}
              rosterPositions={league.roster_positions}
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
                <MissingSalaries teams={teams} playerDB={playerDB} salaryMap={salaryMap} />
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
