import { describe, it, expect, beforeEach } from 'vitest';
import { DefendObjective } from '../DefendObjective';
import { Unit, Faction } from '../../units/Unit';
import { createStats } from '../../units/Stats';

function createTestUnit(
  id: string,
  name: string,
  faction: Faction,
  unitClass: string,
  x: number,
  y: number,
  hp?: number,
  maxHp?: number,
): Unit {
  const max = maxHp ?? 20;
  return new Unit(id, name, faction, unitClass, createStats({
    hp: hp ?? max, maxHp: max, str: 8, mag: 2, skl: 7, spd: 8, luk: 6, def: 6, res: 2, mov: 5,
  }), x, y);
}

describe('DefendObjective', () => {
  it('returns victory after surviving the required number of turns', () => {
    const npc = createTestUnit('npc1', 'NPC', Faction.ALLY, 'soldier', 5, 5);
    const objective = new DefendObjective('npc1', 7);

    // Turn 7 — survived all required turns
    const result = objective.check([npc], 7);

    expect(result.victory).toBe(true);
    expect(result.defeat).toBe(false);
    expect(result.ongoing).toBe(false);
  });

  it('returns defeat when the defend target dies', () => {
    const npc = createTestUnit('npc1', 'NPC', Faction.ALLY, 'soldier', 5, 5, 0, 20);
    const objective = new DefendObjective('npc1', 7);

    const result = objective.check([npc], 3);

    expect(result.victory).toBe(false);
    expect(result.defeat).toBe(true);
    expect(result.ongoing).toBe(false);
  });

  it('returns ongoing before the turn limit', () => {
    const npc = createTestUnit('npc1', 'NPC', Faction.ALLY, 'soldier', 5, 5);
    const objective = new DefendObjective('npc1', 7);

    const result = objective.check([npc], 3);

    expect(result.victory).toBe(false);
    expect(result.defeat).toBe(false);
    expect(result.ongoing).toBe(true);
  });

  it('returns ongoing on exactly the turn before the limit', () => {
    const npc = createTestUnit('npc1', 'NPC', Faction.ALLY, 'soldier', 5, 5);
    const objective = new DefendObjective('npc1', 7);

    // Turn 6 — not yet survived 7
    const result = objective.check([npc], 6);

    expect(result.ongoing).toBe(true);
  });

  it('returns victory when defending a player unit', () => {
    const player = createTestUnit('p1', 'Hero', Faction.PLAYER, 'lord', 5, 5);
    const objective = new DefendObjective('p1', 5);

    const result = objective.check([player], 5);

    expect(result.victory).toBe(true);
  });

  it('returns defeat when target is not found (dead or removed)', () => {
    const npc = createTestUnit('npc1', 'NPC', Faction.ALLY, 'soldier', 5, 5);
    const objective = new DefendObjective('npc1', 7);

    // Target not in the units list
    const result = objective.check([], 5);

    expect(result.defeat).toBe(true);
  });

  it('returns ongoing when surviving beyond the required turns', () => {
    const npc = createTestUnit('npc1', 'NPC', Faction.ALLY, 'soldier', 5, 5);
    const objective = new DefendObjective('npc1', 7);

    const result = objective.check([npc], 10);

    expect(result.victory).toBe(true);
  });
});
