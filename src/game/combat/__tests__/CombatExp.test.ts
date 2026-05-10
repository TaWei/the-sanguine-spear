import { describe, it, expect } from 'vitest';
import { Grid } from '../../map/Grid';
import { Unit } from '../../units/Unit';
import { createStats } from '../../units/Stats';
import { CombatEngine, calcCombatExp } from '../Engine';
import { WEAPON_DB } from '../Weapons';

function makeUnit(id: string, level: number, hp: number, str: number, spd: number) {
  return new Unit(
    id,
    id,
    'player',
    'lord',
    createStats({ hp, maxHp: hp, str, mag: 0, spd, def: 0, res: 0, skl: 10, luk: 10, mov: 5 }),
    0,
    0,
    { level },
  );
}

describe('combat EXP calculation', () => {
  it('awards ~30 EXP for a same-level kill (Lv1 vs Lv1)', () => {
    const grid = new Grid(3, 3);
    const attacker = makeUnit('att', 1, 20, 20, 10); // high str = kill
    const defender = makeUnit('def', 1, 1, 0, 0); // 1 hp = dies instantly
    grid.placeUnit(attacker, 0, 0);
    grid.placeUnit(defender, 1, 0);

    const engine = new CombatEngine(grid);
    const result = engine.resolveCombat(
      attacker,
      defender,
      WEAPON_DB['Iron Sword'],
      WEAPON_DB['Iron Sword'],
    );

    expect(result.defenderDied).toBe(true);
    expect(result.expAward).toBe(30); // floor(31/3)=10 hit + max(0,0+20)=20 kill = 30
  });

  it('awards more EXP when killing a higher-level enemy', () => {
    const grid = new Grid(3, 3);
    const attacker = makeUnit('att', 1, 20, 20, 10);
    const defender = makeUnit('def', 5, 1, 0, 0); // Lv5, dies instantly
    grid.placeUnit(attacker, 0, 0);
    grid.placeUnit(defender, 1, 0);

    const engine = new CombatEngine(grid);
    const result = engine.resolveCombat(
      attacker,
      defender,
      WEAPON_DB['Iron Sword'],
      WEAPON_DB['Iron Sword'],
    );

    expect(result.defenderDied).toBe(true);
    expect(result.expAward).toBe(43); // floor(35/3)=11 hit + max(0,12+20)=32 kill = 43
  });

  it('awards less EXP when a high-level unit kills a weak enemy', () => {
    const grid = new Grid(3, 3);
    const attacker = makeUnit('att', 10, 20, 20, 10);
    const defender = makeUnit('def', 1, 1, 0, 0);
    grid.placeUnit(attacker, 0, 0);
    grid.placeUnit(defender, 1, 0);

    const engine = new CombatEngine(grid);
    const result = engine.resolveCombat(
      attacker,
      defender,
      WEAPON_DB['Iron Sword'],
      WEAPON_DB['Iron Sword'],
    );

    expect(result.defenderDied).toBe(true);
    expect(result.expAward).toBe(7); // floor(22/3)=7 hit + max(0,-27+20)=0 kill = 7
  });

  it('awards hit EXP for a hit without kill', () => {
    const grid = new Grid(3, 3);
    const attacker = makeUnit('att', 1, 20, 5, 10);
    const defender = makeUnit('def', 1, 30, 0, 0); // 30 HP survives two 10-dmg hits
    grid.placeUnit(attacker, 0, 0);
    grid.placeUnit(defender, 1, 0);

    const engine = new CombatEngine(grid);
    const result = engine.resolveCombat(
      attacker,
      defender,
      WEAPON_DB['Iron Sword'],
      WEAPON_DB['Iron Sword'],
    );

    expect(result.defenderDied).toBe(false);
    expect(result.expAward).toBe(10); // floor(31/3)=10 hit, no kill
  });

  it('awards 0 EXP for a miss', () => {
    expect(calcCombatExp(1, 1, false, false)).toBe(0);
    expect(calcCombatExp(1, 5, false, false)).toBe(0);
    expect(calcCombatExp(10, 1, false, false)).toBe(0);
  });
});
