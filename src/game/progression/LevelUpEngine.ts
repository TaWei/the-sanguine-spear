import { UnitStats } from '../units/Stats';
import { GrowthRates } from './GrowthRates';
import { StatCaps } from './StatCaps';

export interface LevelUpResult {
  newStats: UnitStats;
  increases: string[];
}

export function levelUp(
  stats: UnitStats,
  growths: GrowthRates,
  caps: StatCaps,
  rng: () => number = Math.random,
): LevelUpResult {
  let increases: string[] = [];
  const newStats: UnitStats = { ...stats };

  const tryRoll = (): void => {
    increases = [];
    Object.assign(newStats, stats);
    for (const key of Object.keys(growths) as (keyof GrowthRates)[]) {
      const rate = growths[key];
      const current = newStats[key];
      const cap = caps[key];
      if (rate > 0 && current < cap) {
        if (rng() * 100 < rate) {
          increases.push(key);
          (newStats as Record<keyof GrowthRates, number>)[key] = current + 1;
          // When HP increases, maxHp must also increase
          if (key === 'hp') {
            newStats.maxHp = newStats.maxHp + 1;
          }
        }
      }
    }
  };

  tryRoll();

  // Fire Emblem guarantee: if no stats proc and at least one uncapped growth exists, reroll
  const hasUncappedGrowth = (Object.keys(growths) as (keyof GrowthRates)[]).some(
    (k) => growths[k] > 0 && newStats[k] < caps[k],
  );

  let rerollSafety = 0;
  while (increases.length === 0 && hasUncappedGrowth && rerollSafety < 10) {
    tryRoll();
    rerollSafety++;
  }

  // If hp increased, heal current hp by 1 as well (maxHp already bumped)
  if (increases.includes('hp')) {
    newStats.hp = Math.min(newStats.maxHp, newStats.hp + 1);
  }

  return { newStats, increases };
}
