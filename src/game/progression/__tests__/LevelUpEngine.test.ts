import { describe, it, expect } from 'vitest';
import { levelUp, LevelUpResult } from '../LevelUpEngine';
import { UnitStats, createStats } from '../../units/Stats';
import { GrowthRates, createGrowthRates } from '../GrowthRates';
import { StatCaps } from '../StatCaps';

function makeRng(sequence: number[]): () => number {
  let i = 0;
  return () => sequence[i++] ?? 0.99;
}

describe('LevelUpEngine', () => {
  const baseStats = createStats({
    hp: 20,
    str: 8,
    mag: 2,
    skl: 7,
    spd: 8,
    luk: 6,
    def: 6,
    res: 2,
    mov: 5,
  });
  const caps: StatCaps = {
    hp: 60,
    str: 27,
    mag: 20,
    skl: 28,
    spd: 30,
    luk: 30,
    def: 22,
    res: 22,
    mov: 6,
  };

  it('increases stats where RNG rolls below growth rate', () => {
    const growths = createGrowthRates({ hp: 100, str: 0, skl: 100 });
    const rng = makeRng([0, 0]); // both proc
    const result = levelUp(baseStats, growths, caps, rng);
    expect(result.increases).toContain('hp');
    expect(result.increases).toContain('skl');
    expect(result.increases).not.toContain('str');
    expect(result.newStats.hp).toBe(baseStats.hp + 1);
    expect(result.newStats.maxHp).toBe(baseStats.maxHp + 1);
    expect(result.newStats.skl).toBe(baseStats.skl + 1);
  });

  it('does not increase stats at cap', () => {
    const maxedStats = createStats({
      hp: 60,
      str: 27,
      mag: 20,
      skl: 28,
      spd: 30,
      luk: 30,
      def: 22,
      res: 22,
      mov: 6,
    });
    const growths = createGrowthRates({ hp: 100, str: 100 });
    const rng = makeRng([0, 0]);
    const result = levelUp(maxedStats, growths, caps, rng);
    expect(result.increases).toEqual([]);
    expect(result.newStats.hp).toBe(maxedStats.hp);
  });

  it('guarantees at least one stat increase if any uncapped growth > 0', () => {
    const growths = createGrowthRates({ hp: 1 });
    // First roll misses, second roll hits (guaranteed reroll)
    const rng = makeRng([0.99, 0]);
    const result = levelUp(baseStats, growths, caps, rng);
    expect(result.increases.length).toBeGreaterThanOrEqual(1);
  });

  it('does not reroll if all applicable stats are capped', () => {
    const cappedStats = createStats({
      hp: 60,
      str: 8,
      mag: 2,
      skl: 7,
      spd: 8,
      luk: 6,
      def: 6,
      res: 2,
      mov: 5,
    });
    const growths = createGrowthRates({ hp: 100 }); // hp capped, nothing else grows
    const rng = makeRng([0]);
    const result = levelUp(cappedStats, growths, caps, rng);
    expect(result.increases).toEqual([]);
  });

  it('does not modify original stats object', () => {
    const growths = createGrowthRates({ hp: 100 });
    const rng = makeRng([0]);
    levelUp(baseStats, growths, caps, rng);
    expect(baseStats.hp).toBe(20);
    expect(baseStats.maxHp).toBe(20);
  });
});
