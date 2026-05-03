import { describe, it, expect } from 'vitest';
import { CombatEngine } from '../Engine';
import { Unit, Faction, UnitClass } from '../../units/Unit';
import { createStats } from '../../units/Stats';
import { WEAPON_DB } from '../Weapons';
import { Grid } from '../../map/Grid';

function makeRng(sequence: number[]): () => number {
  let i = 0;
  return () => sequence[i++] ?? 50; // default to 50 (mid-range)
}

describe('CombatEngine', () => {
  // Rowan-style attacker: str=8, skl=7, spd=8, luk=6, def=6, res=2
  const attackerStats = createStats({
    hp: 22,
    str: 8,
    mag: 2,
    skl: 7,
    spd: 8,
    luk: 6,
    def: 6,
    res: 2,
    mov: 5,
  });
  // Bandit-style defender: str=9, skl=4, spd=5, luk=3, def=5, res=1
  const defenderStats = createStats({
    hp: 26,
    str: 9,
    mag: 0,
    skl: 4,
    spd: 5,
    luk: 3,
    def: 5,
    res: 1,
    mov: 5,
  });

  it('resolves a single attack round (defender cannot counter at range 2)', () => {
    const attacker = new Unit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, attackerStats, 2, 5);
    const defender = new Unit(
      'e1',
      'Bandit',
      Faction.ENEMY,
      UnitClass.BRIGAND,
      defenderStats,
      4,
      5,
    );
    const grid = new Grid(10, 10);

    const engine = new CombatEngine(grid);
    // Attacker uses bow at range 2, defender has axe (range 1) so cannot counter
    const result = engine.resolveCombat(
      attacker,
      defender,
      WEAPON_DB['Iron Bow'],
      WEAPON_DB['Iron Axe'],
    );

    expect(result.log).toHaveLength(1); // one attack, no counter
    expect(result.log[0].attacker).toBe(attacker);
    expect(result.log[0].defender).toBe(defender);
  });

  it('defender counterattacks when in range and alive', () => {
    const attacker = new Unit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, attackerStats, 2, 5);
    const defender = new Unit(
      'e1',
      'Bandit',
      Faction.ENEMY,
      UnitClass.BRIGAND,
      defenderStats,
      3,
      5,
    );
    const grid = new Grid(10, 10);

    const engine = new CombatEngine(grid);
    // Both 1-range weapons, adjacent → counter possible
    // Use RNG that ensures hits
    const rng = makeRng([0, 0, 0, 0]); // all rolls 0 → always hit
    const result = engine.resolveCombat(
      attacker,
      defender,
      WEAPON_DB['Iron Sword'],
      WEAPON_DB['Iron Axe'],
      rng,
    );

    expect(result.log.length).toBe(2);
    expect(result.log[0].attacker).toBe(attacker); // first: attacker hits
    expect(result.log[1].attacker).toBe(defender); // second: defender counters
  });

  it('defender does not counter if killed', () => {
    // Make attacker do enough damage to kill in one hit
    const killerStats = createStats({
      hp: 30,
      str: 99,
      mag: 0,
      skl: 10,
      spd: 10,
      luk: 10,
      def: 10,
      res: 10,
      mov: 5,
    });
    const attacker = new Unit('p1', 'Killer', Faction.PLAYER, UnitClass.LORD, killerStats, 2, 5);
    const defender = new Unit(
      'e1',
      'Bandit',
      Faction.ENEMY,
      UnitClass.BRIGAND,
      defenderStats,
      3,
      5,
    );
    const grid = new Grid(10, 10);

    const engine = new CombatEngine(grid);
    const rng = makeRng([0, 0]); // hit
    const result = engine.resolveCombat(
      attacker,
      defender,
      WEAPON_DB['Iron Sword'],
      WEAPON_DB['Iron Axe'],
      rng,
    );

    expect(result.log).toHaveLength(1); // only attacker's attack, defender dead
    expect(defender.isAlive).toBe(false);
  });

  it('misses do not deal damage', () => {
    const attacker = new Unit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, attackerStats, 2, 5);
    const defender = new Unit(
      'e1',
      'Bandit',
      Faction.ENEMY,
      UnitClass.BRIGAND,
      defenderStats,
      3,
      5,
    );
    const initialHp = defenderStats.hp;
    const grid = new Grid(10, 10);

    const engine = new CombatEngine(grid);
    // RNs: 99, 99 → avg 99, display hit for Iron Sword is ~107-13=94 clamped to 100
    // Wait, 99 < 100 so it would hit. Let me use 100, 100 → avg 100 → miss at display 100 or lower
    const rng = makeRng([100, 100]);
    const result = engine.resolveCombat(
      attacker,
      defender,
      WEAPON_DB['Iron Sword'],
      WEAPON_DB['Iron Axe'],
      rng,
    );

    expect(result.log[0].hit).toBe(false);
    expect(defender.stats.hp).toBe(initialHp); // no damage
  });

  it('deals correct damage on hit', () => {
    const attacker = new Unit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, attackerStats, 2, 5);
    const defender = new Unit(
      'e1',
      'Bandit',
      Faction.ENEMY,
      UnitClass.BRIGAND,
      defenderStats,
      3,
      5,
    );
    const initialHp = defender.stats.hp;
    const grid = new Grid(10, 10);

    const engine = new CombatEngine(grid);
    const rng = makeRng([0, 0]); // always hit
    const result = engine.resolveCombat(
      attacker,
      defender,
      WEAPON_DB['Iron Sword'],
      WEAPON_DB['Iron Axe'],
      rng,
    );

    expect(result.log[0].hit).toBe(true);
    // str(8) + mt(5) + triangle(1) - def(5) = 9 damage
    expect(result.log[0].damage).toBe(9);
    expect(defender.stats.hp).toBe(initialHp - 9);
  });

  it('criticals deal 3x damage', () => {
    const critStats = createStats({
      hp: 30,
      str: 10,
      mag: 0,
      skl: 99,
      spd: 10,
      luk: 10,
      def: 10,
      res: 10,
      mov: 5,
    });
    const attacker = new Unit('p1', 'Critter', Faction.PLAYER, UnitClass.LORD, critStats, 2, 5);
    const defender = new Unit(
      'e1',
      'Bandit',
      Faction.ENEMY,
      UnitClass.BRIGAND,
      defenderStats,
      3,
      5,
    );
    const grid = new Grid(10, 10);

    const engine = new CombatEngine(grid);
    // RN 0 for hit (always hits), RN 0 for crit
    const rng = makeRng([0, 0, 0]);
    const result = engine.resolveCombat(
      attacker,
      defender,
      WEAPON_DB['Iron Sword'],
      WEAPON_DB['Iron Axe'],
      rng,
    );

    expect(result.log[0].critical).toBe(true);
    // str(10) + mt(5) + triangle(1) - def(5) = 11 * 3 = 33
    expect(result.log[0].damage).toBe(33);
  });
});
