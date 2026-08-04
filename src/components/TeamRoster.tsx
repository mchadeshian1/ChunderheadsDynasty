import { useState } from 'react';
import type { SleeperPlayer, EnrichedTeam, DraftPick } from '../types/sleeper';
import type { PlayerSalary } from '../types/salary';
import type { Mode } from './Layout';
import type { TeamIRCredits } from '../utils/irCredit';
import type { TeamDeadCap } from '../utils/deadCap';
import { getStarterSlotLabels } from '../utils/rosterSlots';
import { getEffectiveContract, getResignPrice, getDeadCapHit } from '../utils/contract';
import { TeamHeader } from './TeamHeader';
import { RosterSection } from './RosterSection';

interface TeamRosterProps {
  team: EnrichedTeam;
  playerDB: Record<string, SleeperPlayer>;
  salaryMap: Record<string, PlayerSalary>;
  refMap: Record<string, number>;
  draftPicks: DraftPick[];
  rosterPositions: string[];
  mode: Mode;
  irCredits?: TeamIRCredits;
  deadCap?: TeamDeadCap;
}

function sumSalary(
  ids: string[],
  salaryMap: Record<string, PlayerSalary>,
  refMap: Record<string, number>,
  mode: Mode,
): number {
  return ids.reduce((sum, id) => {
    const s = salaryMap[id];
    if (!s) return sum;
    return sum + getEffectiveContract(s, refMap[id], mode).salary;
  }, 0);
}

function sumCommitted(
  ids: string[],
  salaryMap: Record<string, PlayerSalary>,
  refMap: Record<string, number>,
  resigned: Set<string>,
  cut: Set<string>,
  amnesty: string | null,
  mode: Mode,
): number {
  return ids.reduce((sum, id) => {
    const s = salaryMap[id];
    if (!s) return sum;
    const eff = getEffectiveContract(s, refMap[id], mode);
    if (eff.contractYears > 0) {
      if (id === amnesty) return sum;
      if (cut.has(id)) return sum + getDeadCapHit(eff.salary, eff.contractYears);
      return sum + eff.salary;
    }
    // Offseason only: an expired deal counts once it is re-signed.
    if (resigned.has(id)) return sum + getResignPrice(refMap[id]);
    return sum;
  }, 0);
}

export function TeamRoster({ team, playerDB, salaryMap, refMap, draftPicks, rosterPositions, mode, irCredits, deadCap }: TeamRosterProps) {
  const { roster, user } = team;
  const [resigned, setResigned] = useState<Set<string>>(new Set());
  const [cut, setCut] = useState<Set<string>>(new Set());
  const [amnesty, setAmnesty] = useState<string | null>(null);

  const starters = roster.starters ?? [];
  const reserve = roster.reserve ?? [];
  const allPlayers = roster.players ?? [];

  const starterSet = new Set(starters);
  const reserveSet = new Set(reserve);
  const bench = allPlayers.filter(id => !starterSet.has(id) && !reserveSet.has(id));

  const slotLabels = getStarterSlotLabels(rosterPositions);
  const draftCapHit = draftPicks.reduce((sum, p) => sum + p.salary, 0);
  const totalSalary = sumSalary(allPlayers, salaryMap, refMap, mode) + draftCapHit;
  const deadCapTotal = deadCap?.total ?? 0;
  const committedSalary = sumCommitted(allPlayers, salaryMap, refMap, resigned, cut, amnesty, mode) + draftCapHit + deadCapTotal;
  const irCreditTotal = irCredits?.total ?? 0;
  const effectiveCap = committedSalary - irCreditTotal;

  const toggleResign = (playerId: string) => {
    setResigned(prev => {
      const next = new Set(prev);
      if (next.has(playerId)) next.delete(playerId);
      else next.add(playerId);
      return next;
    });
  };

  const toggleCut = (playerId: string) => {
    if (amnesty === playerId) setAmnesty(null);
    setCut(prev => {
      const next = new Set(prev);
      if (next.has(playerId)) next.delete(playerId);
      else next.add(playerId);
      return next;
    });
  };

  const toggleAmnesty = (playerId: string) => {
    setAmnesty(prev => prev === playerId ? null : playerId);
    setCut(prev => {
      if (!prev.has(playerId)) return prev;
      const next = new Set(prev);
      next.delete(playerId);
      return next;
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <TeamHeader user={user} />
        <div className="flex gap-6 pb-4">
          {/* In-season every player is under contract, so Total and Committed
              would be the same number — only Committed is shown. */}
          {mode === 'offseason' && (
            <div className="text-right">
              <p className="text-2xl font-bold text-emerald-400">${totalSalary}</p>
              <p className="text-xs text-gray-500">Total Salary</p>
            </div>
          )}
          <div className="text-right">
            <p className="text-2xl font-bold text-blue-400">${mode === 'inseason' && irCreditTotal > 0 ? effectiveCap : committedSalary}</p>
            <p className="text-xs text-gray-500">{mode === 'inseason' && irCreditTotal > 0 ? 'Effective Cap' : 'Committed Salary'}</p>
          </div>
          {mode === 'inseason' && deadCapTotal > 0 && (
            <div className="text-right">
              <p className="text-2xl font-bold text-red-400">+${deadCapTotal}</p>
              <p className="text-xs text-gray-500">Dead Cap</p>
            </div>
          )}
          {mode === 'inseason' && irCreditTotal > 0 && (
            <div className="text-right">
              <p className="text-2xl font-bold text-cyan-400">-${irCreditTotal}</p>
              <p className="text-xs text-gray-500">IR Credit</p>
            </div>
          )}
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
        amnesty={amnesty}
        onToggleAmnesty={toggleAmnesty}
        slotLabels={slotLabels}
        sectionSalary={sumSalary(starters, salaryMap, refMap, mode)}
        mode={mode}
        irCredits={irCredits}
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
        amnesty={amnesty}
        onToggleAmnesty={toggleAmnesty}
        sectionSalary={sumSalary(bench, salaryMap, refMap, mode)}
        mode={mode}
        irCredits={irCredits}
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
        amnesty={amnesty}
        onToggleAmnesty={toggleAmnesty}
        sectionSalary={sumSalary(reserve, salaryMap, refMap, mode)}
        mode={mode}
        irCredits={irCredits}
      />
      {mode === 'inseason' && deadCap && deadCap.entries.length > 0 && (
        <div className="space-y-1">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
              Pre-Season Dead Cap ({deadCap.entries.length})
            </h3>
            <span className="text-xs font-semibold text-red-400">${deadCapTotal}</span>
          </div>
          <div className="space-y-1">
            {deadCap.entries.map(entry => {
              const player = playerDB[entry.playerId];
              const name = player
                ? (player.full_name ?? `${player.first_name} ${player.last_name}`)
                : entry.playerId;
              return (
                <div
                  key={entry.playerId}
                  className="flex items-center gap-2 rounded-lg bg-gray-800/50 px-3 py-2"
                >
                  {player && (
                    <span className={`inline-flex w-10 shrink-0 items-center justify-center rounded px-1.5 py-0.5 text-xs font-bold ${
                      player.position === 'QB' ? 'bg-red-500/20 text-red-400' :
                      player.position === 'RB' ? 'bg-emerald-500/20 text-emerald-400' :
                      player.position === 'WR' ? 'bg-blue-500/20 text-blue-400' :
                      player.position === 'TE' ? 'bg-amber-500/20 text-amber-400' :
                      'bg-gray-500/20 text-gray-400'
                    }`}>
                      {player.position}
                    </span>
                  )}
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-gray-100">
                    {name}
                  </span>
                  <span className="text-xs text-gray-500">
                    ${entry.salary} / {entry.contractYears}yr
                  </span>
                  {entry.isAmnesty ? (
                    <span className="text-sm font-semibold text-orange-400">$0 amnesty</span>
                  ) : (
                    <span className="text-sm font-semibold text-red-400">${entry.deadCap}</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
      {draftPicks.length > 0 && (
        <div className="space-y-1">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
              Draft Picks ({draftPicks.length})
            </h3>
            <span className="text-xs font-semibold text-gray-400">${draftCapHit}</span>
          </div>
          <div className="space-y-1">
            {draftPicks.map(pick => (
              <div
                key={`${pick.round}-${pick.originalRosterId}`}
                className="flex items-center gap-2 rounded-lg bg-gray-800/50 px-3 py-2"
              >
                <span className="inline-flex w-10 shrink-0 items-center justify-center rounded bg-violet-500/20 px-1.5 py-0.5 text-xs font-bold text-violet-400">
                  R{pick.round}
                </span>
                <span className="min-w-0 flex-1 text-sm font-medium text-gray-100">
                  {pick.round}.{String(pick.pickInRound).padStart(2, '0')}
                  {pick.originalRosterId !== roster.roster_id && (
                    <span className="ml-1 text-xs text-gray-500">(via trade)</span>
                  )}
                </span>
                <span className="text-sm font-semibold text-emerald-400">${pick.salary}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
