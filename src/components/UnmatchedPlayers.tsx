import type { SalaryEntry } from '../types/salary';

interface UnmatchedPlayersProps {
  entries: SalaryEntry[];
}

export function UnmatchedPlayers({ entries }: UnmatchedPlayersProps) {
  return (
    <div className="mt-3 space-y-1">
      <p className="text-xs text-gray-500">
        These salary entries could not be matched to a Sleeper player:
      </p>
      <div className="space-y-1">
        {entries.map((entry) => (
          <div
            key={entry.name}
            className="flex items-center justify-between rounded-lg bg-yellow-500/5 px-3 py-2"
          >
            <span className="text-sm text-gray-300">{entry.name}</span>
            <span className="flex items-center gap-1.5">
              <span className="text-sm font-semibold text-yellow-400">${entry.salary}</span>
              <span className="text-xs text-gray-500">{entry.contractYears}yr</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
