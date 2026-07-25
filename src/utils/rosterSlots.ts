export function getStarterSlotLabels(rosterPositions: string[]): string[] {
  const starterSlots = rosterPositions.filter(pos => pos !== 'BN' && pos !== 'IR');

  const totals: Record<string, number> = {};
  for (const pos of starterSlots) {
    totals[pos] = (totals[pos] ?? 0) + 1;
  }

  const counts: Record<string, number> = {};
  return starterSlots.map(pos => {
    counts[pos] = (counts[pos] ?? 0) + 1;
    const label = pos === 'SUPER_FLEX' ? 'SFLEX' : pos;
    if (totals[pos] > 1) {
      return `${label}${counts[pos]}`;
    }
    return label;
  });
}
