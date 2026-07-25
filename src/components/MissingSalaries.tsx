import type { SleeperPlayer, EnrichedTeam } from '../types/sleeper';
import type { PlayerSalary } from '../types/salary';

const POSITION_COLORS: Record<string, string> = {
  QB: 'bg-red-500/20 text-red-400',
  RB: 'bg-emerald-500/20 text-emerald-400',
  WR: 'bg-blue-500/20 text-blue-400',
  TE: 'bg-amber-500/20 text-amber-400',
  K: 'bg-purple-500/20 text-purple-400',
  DEF: 'bg-gray-500/20 text-gray-400',
};

interface MissingSalariesProps {
  teams: EnrichedTeam[];
  playerDB: Record<string, SleeperPlayer>;
  salaryMap: Record<string, PlayerSalary>;
}

interface MissingPlayer {
  playerId: string;
  name: string;
  position: string;
  nflTeam: string;
  fantasyTeam: string;
}

export function MissingSalaries({ teams, playerDB, salaryMap }: MissingSalariesProps) {
  const missing: MissingPlayer[] = [];

  for (const team of teams) {
    const teamName = (team.user.metadata?.team_name ?? team.user.display_name).trim();
    for (const pid of team.roster.players ?? []) {
      if (!salaryMap[pid]) {
        const p = playerDB[pid];
        missing.push({
          playerId: pid,
          name: p ? (p.full_name ?? `${p.first_name} ${p.last_name}`) : `Unknown (${pid})`,
          position: p?.position ?? '?',
          nflTeam: p?.team ?? 'FA',
          fantasyTeam: teamName,
        });
      }
    }
  }

  if (missing.length === 0) return null;

  const byTeam = new Map<string, MissingPlayer[]>();
  for (const p of missing) {
    const list = byTeam.get(p.fantasyTeam) ?? [];
    list.push(p);
    byTeam.set(p.fantasyTeam, list);
  }

  return (
    <div className="mt-3 space-y-4">
      <p className="text-xs text-gray-500">
        {missing.length} rostered player{missing.length !== 1 ? 's' : ''} without a salary entry:
      </p>
      {Array.from(byTeam.entries()).map(([teamName, players]) => (
        <div key={teamName}>
          <h4 className="mb-1 text-sm font-semibold text-gray-300">{teamName}</h4>
          <div className="space-y-1">
            {players.map((p) => {
              const posColor = POSITION_COLORS[p.position] ?? 'bg-gray-500/20 text-gray-400';
              return (
                <div
                  key={p.playerId}
                  className="flex items-center gap-3 rounded-lg bg-yellow-500/5 px-3 py-2"
                >
                  <span className={`inline-flex w-10 shrink-0 items-center justify-center rounded px-1.5 py-0.5 text-xs font-bold ${posColor}`}>
                    {p.position}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm text-gray-300">
                    {p.name}
                  </span>
                  <span className="shrink-0 text-xs text-gray-500">{p.nflTeam}</span>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
