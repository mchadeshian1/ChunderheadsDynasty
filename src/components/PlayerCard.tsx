import type { SleeperPlayer } from '../types/sleeper';
import type { PlayerSalary } from '../types/salary';

const POSITION_COLORS: Record<string, string> = {
  QB: 'bg-red-500/20 text-red-400',
  RB: 'bg-emerald-500/20 text-emerald-400',
  WR: 'bg-blue-500/20 text-blue-400',
  TE: 'bg-amber-500/20 text-amber-400',
  K: 'bg-purple-500/20 text-purple-400',
  DEF: 'bg-gray-500/20 text-gray-400',
};

interface PlayerCardProps {
  playerId: string;
  playerDB: Record<string, SleeperPlayer>;
  salaryMap: Record<string, PlayerSalary>;
  refValue?: number;
  resigned: boolean;
  onToggleResign: () => void;
  isCut: boolean;
  onToggleCut: () => void;
  slotLabel?: string;
}

export function PlayerCard({ playerId, playerDB, salaryMap, refValue, resigned, onToggleResign, isCut, onToggleCut, slotLabel }: PlayerCardProps) {
  const player = playerDB[playerId];
  const salary = salaryMap[playerId];

  if (!player) {
    return (
      <div className="flex items-center gap-3 rounded-lg bg-gray-800/50 px-3 py-2">
        {slotLabel && (
          <span className="w-14 shrink-0 text-center text-xs font-semibold text-gray-500">
            {slotLabel}
          </span>
        )}
        <span className="text-sm text-gray-500">Unknown Player ({playerId})</span>
      </div>
    );
  }

  const posColor = POSITION_COLORS[player.position] ?? 'bg-gray-500/20 text-gray-400';
  const displayRef = refValue ?? 1;
  const isUnderContract = salary != null && salary.contractYears > 0;
  const isExpired = salary != null && salary.contractYears === 0;

  return (
    <div className="flex items-center gap-2 rounded-lg bg-gray-800/50 px-3 py-2">
      {slotLabel && (
        <span className="w-14 shrink-0 text-center text-xs font-semibold text-gray-500">
          {slotLabel}
        </span>
      )}
      <span className={`inline-flex w-10 shrink-0 items-center justify-center rounded px-1.5 py-0.5 text-xs font-bold ${posColor}`}>
        {player.position}
      </span>
      <span className="min-w-0 flex-1 truncate text-sm font-medium text-gray-100">
        {player.full_name ?? `${player.first_name} ${player.last_name}`}
      </span>
      <span className="w-8 shrink-0 text-right text-xs text-gray-500">
        {player.team ?? 'FA'}
      </span>
      <span className="w-12 shrink-0 text-right text-xs text-gray-500">
        ref ${displayRef}
      </span>
      {salary ? (
        <span className="flex w-20 shrink-0 items-center justify-end gap-1">
          {isCut ? (
            <span className="text-sm font-semibold text-red-400">${Math.floor(salary.salary / 2)}</span>
          ) : (
            <span className="text-sm font-semibold text-emerald-400">${salary.salary}</span>
          )}
          <span className="w-6 text-right text-xs text-gray-500">{salary.contractYears}yr</span>
        </span>
      ) : (
        <span className="w-20 shrink-0 text-right rounded bg-yellow-500/20 px-1.5 py-0.5 text-xs font-semibold text-yellow-400">
          No salary
        </span>
      )}
      {isUnderContract ? (
        <div className="flex w-28 shrink-0 items-center justify-end gap-2">
          <label className="flex cursor-pointer items-center gap-1">
            <input
              type="checkbox"
              checked={isCut}
              onChange={onToggleCut}
              className="h-3.5 w-3.5 accent-red-500"
            />
            <span className={`text-xs ${isCut ? 'text-red-400' : 'text-gray-500'}`}>Cut</span>
          </label>
          <label className="flex items-center gap-1 opacity-40">
            <input type="checkbox" checked disabled className="h-3.5 w-3.5 accent-gray-600" />
            <span className="text-xs text-gray-600">Re-sign</span>
          </label>
        </div>
      ) : isExpired ? (
        <div className="flex w-28 shrink-0 items-center justify-end gap-2">
          <label className="flex cursor-pointer items-center gap-1">
            <input
              type="checkbox"
              checked={resigned}
              onChange={onToggleResign}
              className="h-3.5 w-3.5 accent-emerald-500"
            />
            <span className={`text-xs ${resigned ? 'text-emerald-400' : 'text-gray-500'}`}>Re-sign</span>
          </label>
        </div>
      ) : (
        <span className="w-28 shrink-0" />
      )}
    </div>
  );
}
