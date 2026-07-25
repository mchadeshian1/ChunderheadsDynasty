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
  slotLabel?: string;
}

export function PlayerCard({ playerId, playerDB, salaryMap, slotLabel }: PlayerCardProps) {
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

  return (
    <div className="flex items-center gap-3 rounded-lg bg-gray-800/50 px-3 py-2">
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
      <span className="shrink-0 text-xs text-gray-500">
        {player.team ?? 'FA'}
      </span>
      {player.injury_status && (
        <span className="shrink-0 rounded bg-red-500/20 px-1.5 py-0.5 text-xs font-semibold text-red-400">
          {player.injury_status}
        </span>
      )}
      {salary ? (
        <span className="flex shrink-0 items-center gap-1.5">
          <span className="text-sm font-semibold text-emerald-400">${salary.salary}</span>
          <span className="text-xs text-gray-500">{salary.contractYears}yr</span>
        </span>
      ) : (
        <span className="shrink-0 rounded bg-yellow-500/20 px-1.5 py-0.5 text-xs font-semibold text-yellow-400">
          No salary
        </span>
      )}
    </div>
  );
}
