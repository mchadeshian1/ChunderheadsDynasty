import { useState } from 'react';
import type { SleeperPlayer, EnrichedTeam } from '../types/sleeper';
import type { PlayerSalary } from '../types/salary';
import { getStarterSlotLabels } from '../utils/rosterSlots';
import { TeamHeader } from './TeamHeader';
import { RosterSection } from './RosterSection';

interface TeamRosterProps {
  team: EnrichedTeam;
  playerDB: Record<string, SleeperPlayer>;
  salaryMap: Record<string, PlayerSalary>;
  refMap: Record<string, number>;
  rosterPositions: string[];
}

function sumSalary(ids: string[], salaryMap: Record<string, PlayerSalary>): number {
  return ids.reduce((sum, id) => sum + (salaryMap[id]?.salary ?? 0), 0);
}

function sumCommitted(
  ids: string[],
  salaryMap: Record<string, PlayerSalary>,
  refMap: Record<string, number>,
  resigned: Set<string>,
  cut: Set<string>,
): number {
  return ids.reduce((sum, id) => {
    const s = salaryMap[id];
    if (!s) return sum;
    if (s.contractYears > 0) {
      if (cut.has(id)) return sum + Math.floor(s.salary / 2);
      return sum + s.salary;
    }
    if (resigned.has(id)) return sum + (refMap[id] ?? 1);
    return sum;
  }, 0);
}

export function TeamRoster({ team, playerDB, salaryMap, refMap, rosterPositions }: TeamRosterProps) {
  const { roster, user } = team;
  const [resigned, setResigned] = useState<Set<string>>(new Set());
  const [cut, setCut] = useState<Set<string>>(new Set());

  const starters = roster.starters ?? [];
  const reserve = roster.reserve ?? [];
  const allPlayers = roster.players ?? [];

  const starterSet = new Set(starters);
  const reserveSet = new Set(reserve);
  const bench = allPlayers.filter(id => !starterSet.has(id) && !reserveSet.has(id));

  const slotLabels = getStarterSlotLabels(rosterPositions);
  const totalSalary = sumSalary(allPlayers, salaryMap);
  const committedSalary = sumCommitted(allPlayers, salaryMap, refMap, resigned, cut);

  const toggleResign = (playerId: string) => {
    setResigned(prev => {
      const next = new Set(prev);
      if (next.has(playerId)) next.delete(playerId);
      else next.add(playerId);
      return next;
    });
  };

  const toggleCut = (playerId: string) => {
    setCut(prev => {
      const next = new Set(prev);
      if (next.has(playerId)) next.delete(playerId);
      else next.add(playerId);
      return next;
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <TeamHeader user={user} />
        <div className="flex gap-6 pb-4">
          <div className="text-right">
            <p className="text-2xl font-bold text-emerald-400">${totalSalary}</p>
            <p className="text-xs text-gray-500">Total Salary</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-blue-400">${committedSalary}</p>
            <p className="text-xs text-gray-500">Committed Salary</p>
          </div>
        </div>
      </div>
      <RosterSection
        title="Starters"
        playerIds={starters}
        playerDB={playerDB}
        salaryMap={salaryMap}
        refMap={refMap}
        resigned={resigned}
        onToggleResign={toggleResign}
        cut={cut}
        onToggleCut={toggleCut}
        slotLabels={slotLabels}
        sectionSalary={sumSalary(starters, salaryMap)}
      />
      <RosterSection
        title="Bench"
        playerIds={bench}
        playerDB={playerDB}
        salaryMap={salaryMap}
        refMap={refMap}
        resigned={resigned}
        onToggleResign={toggleResign}
        cut={cut}
        onToggleCut={toggleCut}
        sectionSalary={sumSalary(bench, salaryMap)}
      />
      <RosterSection
        title="IR"
        playerIds={reserve}
        playerDB={playerDB}
        salaryMap={salaryMap}
        refMap={refMap}
        resigned={resigned}
        onToggleResign={toggleResign}
        cut={cut}
        onToggleCut={toggleCut}
        sectionSalary={sumSalary(reserve, salaryMap)}
      />
    </div>
  );
}
