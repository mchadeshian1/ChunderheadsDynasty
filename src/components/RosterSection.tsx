import type { SleeperPlayer } from '../types/sleeper';
import type { PlayerSalary } from '../types/salary';
import { PlayerCard } from './PlayerCard';

interface RosterSectionProps {
  title: string;
  playerIds: string[];
  playerDB: Record<string, SleeperPlayer>;
  salaryMap: Record<string, PlayerSalary>;
  refMap: Record<string, number>;
  resigned: Set<string>;
  onToggleResign: (playerId: string) => void;
  cut: Set<string>;
  onToggleCut: (playerId: string) => void;
  slotLabels?: string[];
  sectionSalary?: number;
}

export function RosterSection({ title, playerIds, playerDB, salaryMap, refMap, resigned, onToggleResign, cut, onToggleCut, slotLabels, sectionSalary }: RosterSectionProps) {
  if (playerIds.length === 0) return null;

  return (
    <div className="space-y-1">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
          {title} ({playerIds.length})
        </h3>
        {sectionSalary !== undefined && (
          <span className="text-xs font-semibold text-gray-400">${sectionSalary}</span>
        )}
      </div>
      <div className="space-y-1">
        {playerIds.map((id, i) => (
          <PlayerCard
            key={id}
            playerId={id}
            playerDB={playerDB}
            salaryMap={salaryMap}
            refValue={refMap[id]}
            resigned={resigned.has(id)}
            onToggleResign={() => onToggleResign(id)}
            isCut={cut.has(id)}
            onToggleCut={() => onToggleCut(id)}
            slotLabel={slotLabels?.[i]}
          />
        ))}
      </div>
    </div>
  );
}
