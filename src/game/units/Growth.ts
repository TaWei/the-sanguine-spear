export function rollLevelUp(
  growthRates: Partial<Record<string, number>>,
  rng: () => number = Math.random,
): string[] {
  const increases: string[] = [];
  for (const [stat, rate] of Object.entries(growthRates)) {
    if (rate !== undefined && rate > 0 && rng() * 100 < rate) {
      increases.push(stat);
    }
  }
  return increases;
}
