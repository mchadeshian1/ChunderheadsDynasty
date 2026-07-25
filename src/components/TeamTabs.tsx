import type { EnrichedTeam } from '../types/sleeper';

interface TeamTabsProps {
  teams: EnrichedTeam[];
  selectedIndex: number;
  onSelect: (index: number) => void;
}

export function TeamTabs({ teams, selectedIndex, onSelect }: TeamTabsProps) {
  return (
    <div className="scrollbar-hide overflow-x-auto border-b border-gray-800">
      <div className="flex min-w-max">
        {teams.map((team, i) => {
          const teamName = (team.user.metadata?.team_name ?? team.user.display_name).trim();
          const isActive = i === selectedIndex;
          return (
            <button
              key={team.roster.roster_id}
              onClick={() => onSelect(i)}
              className={`whitespace-nowrap px-4 py-3 text-sm font-medium transition-colors ${
                isActive
                  ? 'border-b-2 border-emerald-400 text-emerald-400'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              {teamName}
            </button>
          );
        })}
      </div>
    </div>
  );
}
