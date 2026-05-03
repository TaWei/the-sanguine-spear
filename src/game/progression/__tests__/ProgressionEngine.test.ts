import { describe, it, expect } from 'vitest';
import { ProgressionEngine } from '../ProgressionEngine';
import { Unit, Faction, UnitClass } from '../../units/Unit';
import { createStats } from '../../units/Stats';
import { createGrowthRates } from '../GrowthRates';

function makeRng(sequence: number[]): () => number {
  let i = 0;
  return () => sequence[i++] ?? 0.99;
}

describe('ProgressionEngine', () => {
  const stats = createStats({ hp: 20, str: 8, mag: 2, skl: 7, spd: 8, luk: 6, def: 6, res: 2, mov: 5 });
  const growths = createGrowthRates({ hp: 100, str: 0, skl: 100 });

  it('grants exp without leveling up when below threshold', () => {
    const unit = new Unit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, stats, 0, 0, { growthRates: growths });
    const engine = new ProgressionEngine();
    const result = engine.grantExp(unit, 50);
    expect(result.leveledUp).toBe(false);
    expect(unit.exp).toBe(50);
    expect(unit.level).toBe(1);
  });

  it('levels up when exp reaches 100', () => {
    const unit = new Unit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, stats, 0, 0, { growthRates: growths });
    const engine = new ProgressionEngine();
    const rng = makeRng([0, 0]);
    const result = engine.grantExp(unit, 100, rng);
    expect(result.leveledUp).toBe(true);
    expect(result.levelUpResult).toBeDefined();
    expect(result.levelUpResult!.increases).toContain('hp');
    expect(result.levelUpResult!.increases).toContain('skl');
    expect(unit.level).toBe(2);
    expect(unit.exp).toBe(0);
    expect(unit.stats.hp).toBe(21);
  });

  it('carries over excess exp after level up', () => {
    const unit = new Unit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, stats, 0, 0, { growthRates: growths });
    const engine = new ProgressionEngine();
    const rng = makeRng([0, 0]);
    const result = engine.grantExp(unit, 130, rng);
    expect(result.leveledUp).toBe(true);
    expect(unit.exp).toBe(30);
  });

  it('does not grant exp when at max level', () => {
    const unit = new Unit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, stats, 0, 0, { level: 20, growthRates: growths });
    const engine = new ProgressionEngine();
    const result = engine.grantExp(unit, 100);
    expect(result.leveledUp).toBe(false);
    expect(unit.exp).toBe(0);
    expect(unit.level).toBe(20);
  });

  it('does not level up past max level', () => {
    const unit = new Unit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, stats, 0, 0, { level: 19, exp: 50, growthRates: growths });
    const engine = new ProgressionEngine();
    const rng = makeRng([0, 0]);
    engine.grantExp(unit, 100, rng); // should cap at level 20
    expect(unit.level).toBe(20);
    expect(unit.exp).toBe(0); // exp resets on level-up; no overflow kept at max level
  });
});
