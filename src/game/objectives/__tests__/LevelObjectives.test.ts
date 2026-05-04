import { describe, it, expect } from 'vitest';
import { LevelObjectives } from '../LevelObjectives';
import { Unit, Faction, UnitClass } from '../../units/Unit';
import { createStats } from '../../units/Stats';

describe('LevelObjectives', () => {
  const stats = createStats({
    hp: 20,
    str: 5,
    mag: 5,
    skl: 5,
    spd: 5,
    luk: 5,
    def: 5,
    res: 5,
    mov: 5,
  });

  it('returns victory when no live enemies remain', () => {
    const player = new Unit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, stats, 0, 0);
    const enemy = new Unit('e1', 'Bandit', Faction.ENEMY, UnitClass.BRIGAND, stats, 1, 1);
    enemy.takeDamage(999);

    const objectives = new LevelObjectives([player, enemy]);
    expect(objectives.check().victory).toBe(true);
    expect(objectives.check().defeat).toBe(false);
  });

  it('returns defeat when no live players remain', () => {
    const player = new Unit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, stats, 0, 0);
    player.takeDamage(999);
    const enemy = new Unit('e1', 'Bandit', Faction.ENEMY, UnitClass.BRIGAND, stats, 1, 1);

    const objectives = new LevelObjectives([player, enemy]);
    expect(objectives.check().defeat).toBe(true);
    expect(objectives.check().victory).toBe(false);
  });

  it('returns ongoing when both sides have live units', () => {
    const player = new Unit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, stats, 0, 0);
    const enemy = new Unit('e1', 'Bandit', Faction.ENEMY, UnitClass.BRIGAND, stats, 1, 1);

    const objectives = new LevelObjectives([player, enemy]);
    const result = objectives.check();
    expect(result.victory).toBe(false);
    expect(result.defeat).toBe(false);
    expect(result.ongoing).toBe(true);
  });

  it('ignores allies for defeat condition', () => {
    const ally = new Unit('a1', 'Ally', Faction.ALLY, UnitClass.LORD, stats, 0, 0);
    const enemy = new Unit('e1', 'Bandit', Faction.ENEMY, UnitClass.BRIGAND, stats, 1, 1);

    const objectives = new LevelObjectives([ally, enemy]);
    expect(objectives.check().defeat).toBe(true);
  });

  it('ignores allies for victory condition', () => {
    const player = new Unit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, stats, 0, 0);
    const ally = new Unit('a1', 'Ally', Faction.ALLY, UnitClass.LORD, stats, 1, 1);

    const objectives = new LevelObjectives([player, ally]);
    expect(objectives.check().victory).toBe(true);
  });
});
