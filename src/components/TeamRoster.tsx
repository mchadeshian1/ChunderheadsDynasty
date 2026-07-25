import type { SleeperPlayer, EnrichedTeam } from '../types/sleeper';
import type { PlayerSalary } from '../types/salary';
import { getStarterSlotLabels } from '../utils/rosterSlots';
import { TeamHeader } from './TeamHeader';
import { RosterSection } from './RosterSection';

interface TeamRosterProps {
  team: EnrichedTeam;
  playerDB: Record<string, SleeperPlayer>;
  salaryMap: Record<string, PlayerSalary>;
  rosterPositions: string[];
}

function sumSalary(ids: string[], salaryMap: Record<string, PlayerSalary>): number {
  return ids.reduce((sum, id) => sum + (salaryMap[id]?.salary ?? 0), 0);
}

export function TeamRoster({ team, playerDB, salaryMap, rosterPositions }: TeamRosterProps) {
  const { roster, user } = team;

  const starters = roster.starters ?? [];
  const reserve = roster.reserve ?? [];
  const allPlayers = roster.players ?? [];

  const starterSet = new Set(starters);
  const reserveSet = new Set(reserve);
  const bench = allPlayers.filter(id => !starterSet.has(id) && !reserveSet.has(id));

  const slotLabels = getStarterSlotLabels(rosterPositions);
  const totalSalary = sumSalary(allPlayers, salaryMap);

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <TeamHeader user={user} />
        <div className="pb-4 text-right">
          <p className="text-2xl font-bold text-emerald-400">${totalSalary}</p>
          <p className="text-xs text-gray-500">Total Salary</p>
        </div>
      </div>
      <RosterSection
        title="Starters"
        playerIds={starters}
        playerDB={playerDB}
        salaryMap={salaryMap}
        slotLabels={slotLabels}
        sectionSalary={sumSalary(starters, salaryMap)}
      />
      <RosterSection
        title="Bench"
        playerIds={bench}
        playerDB={playerDB}
        salaryMap={salaryMap}
        sectionSalary={sumSalary(bench, salaryMap)}
      />
      <RosterSection
        title="IR"
        playerIds={reserve}
        playerDB={playerDB}
        salaryMap={salaryMap}
        sectionSalary={sumSalary(reserve, salaryMap)}
      />
    </div>
  );
}
