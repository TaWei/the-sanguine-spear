import { describe, it, expect } from 'vitest';
import { CombatEngine } from '../Engine';
import { Unit, Faction, UnitClass } from '../../units/Unit';
import { createStats } from '../../units/Stats';
import { WEAPON_DB } from '../Weapons';
import { Grid } from '../../map/Grid';
import { createDurabilityTracker } from '../DurabilityTracker';

function makeRng(sequence: number[]): () => number {
  let i = 0;
  return () => sequence[i++] ?? 50;
}

// Per-attack RNG consumption in 2RN system:
//   - 2 RNs for true-hit (rollTrueHit)
//   - 1 RN for crit (rollCrit)
// When both hit/crit RNs are 0: always hit + crit.
// For guaranteed hit + NO crit: use [0, 0, 99] (crit RN 99 > any displayCrit).
// For guaranteed miss: use [100, 100] (avg 100 >= displayHit).

function stats(overrides: Record<string, number> = {}) {
  const hp = overrides.hp ?? 20;
  const maxHp = overrides.maxHp ?? hp;
  return createStats({
    hp, maxHp, str: 8, mag: 0, skl: 8, spd: 8, luk: 3, def: 5, res: 2, mov: 5,
    ...overrides,
  });
}

describe('CombatEngine', () => {
  const attackerStats = createStats({
    hp: 22, str: 8, mag: 2, skl: 7, spd: 8, luk: 6, def: 6, res: 2, mov: 5,
  });
  const defenderStats = createStats({
    hp: 26, str: 9, mag: 0, skl: 4, spd: 5, luk: 3, def: 5, res: 1, mov: 5,
  });

  it('resolves a single attack round (defender cannot counter at range 2)', () => {
    const attacker = new Unit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, attackerStats, 2, 5);
    const defender = new Unit('e1', 'Bandit', Faction.ENEMY, UnitClass.BRIGAND, defenderStats, 4, 5);
    const grid = new Grid(10, 10);
    const engine = new CombatEngine(grid);

    const result = engine.resolveCombat(
      attacker, defender, WEAPON_DB['Iron Bow'], WEAPON_DB['Iron Axe'],
    );
    expect(result.log).toHaveLength(1);
    expect(result.log[0].attacker).toBe(attacker);
    expect(result.log[0].defender).toBe(defender);
  });

  it('defender counterattacks when in range and alive', () => {
    const attacker = new Unit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, attackerStats, 2, 5);
    const defender = new Unit('e1', 'Bandit', Faction.ENEMY, UnitClass.BRIGAND, defenderStats, 3, 5);
    const grid = new Grid(10, 10);
    const engine = new CombatEngine(grid);

    const rng = makeRng([0, 0, 99, 0, 0, 99]);
    const result = engine.resolveCombat(
      attacker, defender, WEAPON_DB['Iron Sword'], WEAPON_DB['Iron Axe'], rng,
    );
    expect(result.log.length).toBe(2);
    expect(result.log[0].attacker).toBe(attacker);
    expect(result.log[1].attacker).toBe(defender);
  });

  it('defender does not counter if killed', () => {
    const killerStats = createStats({
      hp: 30, str: 99, mag: 0, skl: 10, spd: 10, luk: 10, def: 10, res: 10, mov: 5,
    });
    const attacker = new Unit('p1', 'Killer', Faction.PLAYER, UnitClass.LORD, killerStats, 2, 5);
    const defender = new Unit('e1', 'Bandit', Faction.ENEMY, UnitClass.BRIGAND, defenderStats, 3, 5);
    const grid = new Grid(10, 10);
    const engine = new CombatEngine(grid);

    const rng = makeRng([0, 0, 99]);
    const result = engine.resolveCombat(
      attacker, defender, WEAPON_DB['Iron Sword'], WEAPON_DB['Iron Axe'], rng,
    );
    expect(result.log).toHaveLength(1);
    expect(defender.isAlive).toBe(false);
  });

  it('misses do not deal damage', () => {
    const attacker = new Unit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, attackerStats, 2, 5);
    const defender = new Unit('e1', 'Bandit', Faction.ENEMY, UnitClass.BRIGAND, defenderStats, 3, 5);
    const initialHp = defenderStats.hp;
    const grid = new Grid(10, 10);
    const engine = new CombatEngine(grid);

    const rng = makeRng([100, 100]);
    const result = engine.resolveCombat(
      attacker, defender, WEAPON_DB['Iron Sword'], WEAPON_DB['Iron Axe'], rng,
    );
    expect(result.log[0].hit).toBe(false);
    expect(defender.stats.hp).toBe(initialHp);
  });

  it('deals correct damage on hit', () => {
    const attacker = new Unit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, attackerStats, 2, 5);
    const defender = new Unit('e1', 'Bandit', Faction.ENEMY, UnitClass.BRIGAND, defenderStats, 3, 5);
    const initialHp = defender.stats.hp;
    const grid = new Grid(10, 10);
    const engine = new CombatEngine(grid);

    const rng = makeRng([0, 0, 99]);
    const result = engine.resolveCombat(
      attacker, defender, WEAPON_DB['Iron Sword'], WEAPON_DB['Iron Axe'], rng,
    );
    expect(result.log[0].hit).toBe(true);
    expect(result.log[0].damage).toBe(9);
    expect(defender.stats.hp).toBe(initialHp - 9);
  });

  it('criticals deal 3x damage', () => {
    const critStats = createStats({
      hp: 30, str: 10, mag: 0, skl: 99, spd: 10, luk: 10, def: 10, res: 10, mov: 5,
    });
    const attacker = new Unit('p1', 'Critter', Faction.PLAYER, UnitClass.LORD, critStats, 2, 5);
    const defender = new Unit('e1', 'Bandit', Faction.ENEMY, UnitClass.BRIGAND, defenderStats, 3, 5);
    const grid = new Grid(10, 10);
    const engine = new CombatEngine(grid);

    const rng = makeRng([0, 0, 0]); // 0 for hit, 0 for crit
    const result = engine.resolveCombat(
      attacker, defender, WEAPON_DB['Iron Sword'], WEAPON_DB['Iron Axe'], rng,
    );
    expect(result.log[0].critical).toBe(true);
    expect(result.log[0].damage).toBe(33);
  });

  it('previewCombat returns hit/crit/damage without rolling or applying damage', () => {
    const attacker = new Unit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, attackerStats, 2, 5);
    const defender = new Unit('e1', 'Bandit', Faction.ENEMY, UnitClass.BRIGAND, defenderStats, 3, 5);
    const grid = new Grid(10, 10);
    const engine = new CombatEngine(grid);

    const preview = engine.previewCombat(
      attacker, defender, WEAPON_DB['Iron Sword'], WEAPON_DB['Iron Axe'],
    );
    expect(preview.attacker.hit).toBeGreaterThan(0);
    expect(preview.attacker.damage).toBe(9);
    expect(preview.attacker.doubleAttack).toBe(false);
    expect(preview.defender).not.toBeNull();
    expect(preview.defender!.hit).toBeGreaterThan(0);
    expect(defender.stats.hp).toBe(defenderStats.hp);
    expect(attacker.stats.hp).toBe(attackerStats.hp);
  });

  it('previewCombat defender is null when out of range', () => {
    const attacker = new Unit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, attackerStats, 2, 5);
    const defender = new Unit('e1', 'Bandit', Faction.ENEMY, UnitClass.BRIGAND, defenderStats, 4, 5);
    const grid = new Grid(10, 10);
    const engine = new CombatEngine(grid);

    const preview = engine.previewCombat(
      attacker, defender, WEAPON_DB['Iron Bow'], WEAPON_DB['Iron Axe'],
    );
    expect(preview.defender).toBeNull();
  });

  describe('follow-up attacks', () => {
    // Pattern: [0, 0, 99] = guaranteed hit + no crit (99 > any displayCrit).
    // Each attack consumes 3 RNs (2 hit + 1 crit).

    it('attacker performs follow-up when speed diff >= 4', () => {
      const grid = new Grid(8, 8);
      grid.setTerrain(3, 3, 'plains');
      grid.setTerrain(4, 3, 'plains');

      const fast = new Unit('a1', 'Swordmaster', Faction.PLAYER, UnitClass.SWORDMASTER,
        stats({ hp: 30, str: 10, skl: 10, spd: 16, luk: 5, def: 5, res: 3 }),
        3, 3);
      grid.placeUnit(fast, 3, 3);

      const slow = new Unit('e1', 'Brigand', Faction.ENEMY, UnitClass.BRIGAND,
        stats({ hp: 25, str: 8, skl: 5, spd: 4, luk: 2, def: 4, res: 1 }),
        4, 3);
      grid.placeUnit(slow, 4, 3);

      const engine = new CombatEngine(grid);
      // 3 attacks: attacker, counter, follow-up → 9 RNs
      const rng = makeRng([0,0,99, 0,0,99, 0,0,99]);
      const result = engine.resolveCombat(
        fast, slow, WEAPON_DB['Iron Sword'], WEAPON_DB['Iron Axe'], rng,
      );

      expect(result.log.length).toBe(3);
      expect(result.log[0].attacker).toBe(fast);
      expect(result.log[1].attacker).toBe(slow);  // counter
      expect(result.log[2].attacker).toBe(fast);  // follow-up
    });

    it('defender performs follow-up counter when speed diff >= 4', () => {
      const grid = new Grid(8, 8);
      grid.setTerrain(3, 3, 'plains');
      grid.setTerrain(4, 3, 'plains');

      const slow = new Unit('a1', 'Brigand', Faction.PLAYER, UnitClass.BRIGAND,
        stats({ hp: 30, str: 10, skl: 5, spd: 4, luk: 2, def: 5, res: 1 }),
        3, 3);
      grid.placeUnit(slow, 3, 3);

      const fast = new Unit('e1', 'Swordmaster', Faction.ENEMY, UnitClass.SWORDMASTER,
        stats({ hp: 30, str: 10, skl: 10, spd: 16, luk: 5, def: 5, res: 3 }),
        4, 3);
      grid.placeUnit(fast, 4, 3);

      const engine = new CombatEngine(grid);
      // 3 attacks → 9 RNs
      const rng = makeRng([0,0,99, 0,0,99, 0,0,99]);
      const result = engine.resolveCombat(
        slow, fast, WEAPON_DB['Iron Axe'], WEAPON_DB['Iron Sword'], rng,
      );

      expect(result.log.length).toBe(3);
      expect(result.log[0].attacker).toBe(slow);
      expect(result.log[1].attacker).toBe(fast);   // counter 1
      expect(result.log[2].attacker).toBe(fast);   // counter 2 (follow-up)
    });

    it('does not follow-up if first hit kills the defender', () => {
      const grid = new Grid(8, 8);
      grid.setTerrain(3, 3, 'plains');
      grid.setTerrain(4, 3, 'plains');

      // Berserker str 25 + Killer Axe mt 9 = 34 atk, -1 def = 33 dmg, mage 8 HP → kill
      const fast = new Unit('a1', 'Berserker', Faction.PLAYER, UnitClass.BERSERKER,
        stats({ hp: 30, str: 25, skl: 10, spd: 16, luk: 5, def: 5, res: 3 }),
        3, 3);
      grid.placeUnit(fast, 3, 3);

      const fragile = new Unit('e1', 'Mage', Faction.ENEMY, UnitClass.MAGE,
        stats({ hp: 8, str: 1, mag: 5, skl: 5, spd: 4, luk: 2, def: 1, res: 5 }),
        4, 3);
      grid.placeUnit(fragile, 4, 3);

      const engine = new CombatEngine(grid);
      // 1 attack → 3 RNs
      const rng = makeRng([0, 0, 99]);
      const result = engine.resolveCombat(
        fast, fragile, WEAPON_DB['Killer Axe'], WEAPON_DB.Fire, rng,
      );

      expect(result.log.length).toBe(1);
      expect(result.defenderDied).toBe(true);
    });

    it('no follow-up when speed diff < 4', () => {
      const grid = new Grid(8, 8);
      grid.setTerrain(3, 3, 'plains');
      grid.setTerrain(4, 3, 'plains');

      const a = new Unit('a1', 'Mercenary', Faction.PLAYER, UnitClass.MERCENARY,
        stats({ hp: 20, str: 8, skl: 8, spd: 8, luk: 3, def: 5, res: 2 }),
        3, 3);
      grid.placeUnit(a, 3, 3);

      const b = new Unit('e1', 'Soldier', Faction.ENEMY, UnitClass.SOLDIER,
        stats({ hp: 20, str: 8, skl: 6, spd: 7, luk: 2, def: 5, res: 2 }),
        4, 3);
      grid.placeUnit(b, 4, 3);

      const engine = new CombatEngine(grid);
      // 2 attacks → 6 RNs
      const rng = makeRng([0, 0, 99, 0, 0, 99]);
      const result = engine.resolveCombat(
        a, b, WEAPON_DB['Iron Sword'], WEAPON_DB['Iron Lance'], rng,
      );

      expect(result.log.length).toBe(2);
      expect(result.log[0].attacker).toBe(a);
      expect(result.log[1].attacker).toBe(b);
    });

    it('attacker does not follow-up if killed by defender counter', () => {
      const grid = new Grid(8, 8);
      grid.setTerrain(3, 3, 'plains');
      grid.setTerrain(4, 3, 'plains');

      // Attacker: Swordmaster, spd 16, hp 10, def 2, str 8
      // Damage vs Brigand (def 5): 8+5+1(tri)-5 = 9 → hp 20→11 (not kill)
      const fast = new Unit('a1', 'Swordmaster', Faction.PLAYER, UnitClass.SWORDMASTER,
        stats({ hp: 10, str: 8, skl: 10, spd: 16, luk: 5, def: 2, res: 1 }),
        3, 3);
      grid.placeUnit(fast, 3, 3);

      // Defender: Brigand str 18, Iron Axe mt 8, triangle disadv -1 vs sword
      // Damage vs Swordmaster (def 2): 18+8-1-2 = 23 → hp 10→dead
      const strong = new Unit('e1', 'Brigand', Faction.ENEMY, UnitClass.BRIGAND,
        stats({ hp: 20, str: 18, skl: 5, spd: 4, luk: 2, def: 5, res: 1 }),
        4, 3);
      grid.placeUnit(strong, 4, 3);

      const engine = new CombatEngine(grid);
      // Attacker doubles → 2 attacks before counter → 9 RNs total
      const rng = makeRng([0, 0, 99, 0, 0, 99, 0, 0, 99]);
      const result = engine.resolveCombat(
        fast, strong, WEAPON_DB['Iron Sword'], WEAPON_DB['Iron Axe'], rng,
      );

      expect(result.attackerDied).toBe(true);
      const attackerEntries = result.log.filter((e) => e.attacker === fast);
      expect(attackerEntries.length).toBe(1); // only first attack, no follow-up
    });

    it('bow attacker doubles against melee enemy who cannot counter', () => {
      const grid = new Grid(8, 8);
      grid.setTerrain(3, 3, 'plains');
      grid.setTerrain(5, 3, 'plains');

      // Archer spd 14 vs Soldier spd 8 → diff 6 → double!
      const archer = new Unit('a1', 'Archer', Faction.PLAYER, UnitClass.ARCHER,
        stats({ hp: 20, str: 10, skl: 10, spd: 14, luk: 5, def: 5, res: 3 }),
        3, 3);
      grid.placeUnit(archer, 3, 3);

      // Soldier with Lance (range 1) at range 2 → cannot counter
      const soldier = new Unit('e1', 'Soldier', Faction.ENEMY, UnitClass.SOLDIER,
        stats({ hp: 30, str: 8, skl: 6, spd: 8, luk: 2, def: 5, res: 2 }),
        5, 3);
      grid.placeUnit(soldier, 5, 3);

      const engine = new CombatEngine(grid);
      // 2 attacks from archer → 6 RNs
      const rng = makeRng([0, 0, 99, 0, 0, 99]);
      const result = engine.resolveCombat(
        archer, soldier, WEAPON_DB['Iron Bow'], WEAPON_DB['Iron Lance'], rng,
      );

      expect(result.log.length).toBe(2);
      expect(result.log.every((e) => e.attacker === archer)).toBe(true);
    });
  });

  describe('weapon durability', () => {
    it('consumes 1 weapon use per attack round (hit + counter)', () => {
      const grid = new Grid(8, 8);
      grid.setTerrain(3, 3, 'plains');
      grid.setTerrain(4, 3, 'plains');

      const att = new Unit('a1', 'Mercenary', Faction.PLAYER, UnitClass.MERCENARY,
        stats({ hp: 20, str: 8, skl: 8, spd: 8, luk: 3, def: 5, res: 2 }),
        3, 3);
      grid.placeUnit(att, 3, 3);

      const def = new Unit('e1', 'Soldier', Faction.ENEMY, UnitClass.SOLDIER,
        stats({ hp: 20, str: 8, skl: 6, spd: 7, luk: 2, def: 5, res: 2 }),
        4, 3);
      grid.placeUnit(def, 4, 3);

      const engine = new CombatEngine(grid);
      const rng = makeRng([0, 0, 99, 0, 0, 99]);
      const attTracker = createDurabilityTracker(45);
      const defTracker = createDurabilityTracker(40);

      const result = engine.resolveCombat(
        att, def, WEAPON_DB['Iron Sword'], WEAPON_DB['Iron Lance'],
        rng, attTracker, defTracker,
      );

      expect(attTracker.uses).toBe(44); // 1 use consumed
      expect(defTracker.uses).toBe(39); // 1 use consumed
      expect(result.attackerWeaponUsed).toBe(true);
      expect(result.defenderWeaponUsed).toBe(true);
    });

    it('stops attacking when weapon breaks (uses reaches 0)', () => {
      const grid = new Grid(8, 8);
      grid.setTerrain(3, 3, 'plains');
      grid.setTerrain(4, 3, 'plains');

      const fast = new Unit('a1', 'Swordmaster', Faction.PLAYER, UnitClass.SWORDMASTER,
        stats({ hp: 30, str: 8, skl: 10, spd: 16, luk: 5, def: 5, res: 3 }),
        3, 3);
      grid.placeUnit(fast, 3, 3);

      const slow = new Unit('e1', 'Brigand', Faction.ENEMY, UnitClass.BRIGAND,
        stats({ hp: 30, str: 8, skl: 5, spd: 4, luk: 2, def: 4, res: 1 }),
        4, 3);
      grid.placeUnit(slow, 4, 3);

      const engine = new CombatEngine(grid);
      const rng = makeRng([0, 0, 99, 0, 0, 99, 0, 0, 99]);
      const attTracker = createDurabilityTracker(1); // breaks after 1 use
      const defTracker = createDurabilityTracker(40);

      const result = engine.resolveCombat(
        fast, slow, WEAPON_DB['Iron Sword'], WEAPON_DB['Iron Axe'],
        rng, attTracker, defTracker,
      );

      // Attacker should only get 1 attack (weapon broke, no follow-up)
      const attEntries = result.log.filter((e) => e.attacker === fast);
      expect(attEntries.length).toBe(1);
      expect(attTracker.isBroken).toBe(true);
      expect(attTracker.uses).toBe(0);
    });

    it('defender follow-up stopped when defender weapon breaks on first counter', () => {
      const grid = new Grid(8, 8);
      grid.setTerrain(3, 3, 'plains');
      grid.setTerrain(4, 3, 'plains');

      const att = new Unit('a1', 'Brigand', Faction.PLAYER, UnitClass.BRIGAND,
        stats({ hp: 30, str: 8, skl: 5, spd: 4, luk: 2, def: 5, res: 1 }),
        3, 3);
      grid.placeUnit(att, 3, 3);

      const fastDef = new Unit('e1', 'Swordmaster', Faction.ENEMY, UnitClass.SWORDMASTER,
        stats({ hp: 30, str: 8, skl: 10, spd: 16, luk: 5, def: 5, res: 3 }),
        4, 3);
      grid.placeUnit(fastDef, 4, 3);

      const engine = new CombatEngine(grid);
      const rng = makeRng([0, 0, 99, 0, 0, 99, 0, 0, 99]);
      const attTracker = createDurabilityTracker(45);
      const defTracker = createDurabilityTracker(1); // breaks after 1 use

      const result = engine.resolveCombat(
        att, fastDef, WEAPON_DB['Iron Axe'], WEAPON_DB['Iron Sword'],
        rng, attTracker, defTracker,
      );

      // Defender should only counter once (weapon broke, no follow-up)
      const defEntries = result.log.filter((e) => e.attacker === fastDef);
      expect(defEntries.length).toBe(1);
      expect(defTracker.isBroken).toBe(true);
    });

    it('consumes weapon use even on miss (weapon was swung)', () => {
      const grid = new Grid(8, 8);
      grid.setTerrain(3, 3, 'plains');
      grid.setTerrain(4, 3, 'plains');

      const att = new Unit('a1', 'Mercenary', Faction.PLAYER, UnitClass.MERCENARY,
        stats({ hp: 20, str: 8, skl: 0, spd: 8, luk: 0, def: 5, res: 2 }),
        3, 3);
      grid.placeUnit(att, 3, 3);

      const def = new Unit('e1', 'Soldier', Faction.ENEMY, UnitClass.SOLDIER,
        stats({ hp: 20, str: 8, skl: 6, spd: 20, luk: 20, def: 5, res: 2 }),
        4, 3);
      grid.placeUnit(def, 4, 3);

      const engine = new CombatEngine(grid);
      const rng = makeRng([99, 99]); // very high RN → miss
      const attTracker = createDurabilityTracker(45);

      const result = engine.resolveCombat(
        att, def, WEAPON_DB['Iron Sword'], WEAPON_DB['Iron Lance'],
        rng, attTracker,
      );

      expect(attTracker.uses).toBe(44); // consumed even on miss
      expect(result.log[0].hit).toBe(false);
    });

    it('no durability consumed when no tracker provided (backward compat)', () => {
      const grid = new Grid(8, 8);
      grid.setTerrain(3, 3, 'plains');
      grid.setTerrain(4, 3, 'plains');

      const att = new Unit('a1', 'Mercenary', Faction.PLAYER, UnitClass.MERCENARY,
        stats({ hp: 20, str: 8, skl: 8, spd: 8, luk: 3, def: 5, res: 2 }),
        3, 3);
      grid.placeUnit(att, 3, 3);

      const def = new Unit('e1', 'Soldier', Faction.ENEMY, UnitClass.SOLDIER,
        stats({ hp: 20, str: 8, skl: 6, spd: 7, luk: 2, def: 5, res: 2 }),
        4, 3);
      grid.placeUnit(def, 4, 3);

      const engine = new CombatEngine(grid);
      const rng = makeRng([0, 0, 99, 0, 0, 99]);

      const result = engine.resolveCombat(
        att, def, WEAPON_DB['Iron Sword'], WEAPON_DB['Iron Lance'],
        rng,
      );

      expect(result.log.length).toBe(2);
      expect(result.attackerWeaponUsed).toBe(false);
      expect(result.defenderWeaponUsed).toBe(false);
    });
  });

  describe('ranged physical weapons', () => {
    it('Javelin at range 2 cannot be countered by 1-range weapon', () => {
      const grid = new Grid(8, 8);
      grid.setTerrain(3, 3, 'plains');
      grid.setTerrain(5, 3, 'plains'); // 2 tiles apart

      const soldier = new Unit('a1', 'Soldier', Faction.PLAYER, UnitClass.SOLDIER,
        stats({ hp: 20, str: 10, skl: 8, spd: 8, luk: 3, def: 5, res: 2 }),
        3, 3);
      grid.placeUnit(soldier, 3, 3);

      const brigand = new Unit('e1', 'Brigand', Faction.ENEMY, UnitClass.BRIGAND,
        stats({ hp: 20, str: 8, skl: 5, spd: 5, luk: 2, def: 4, res: 1 }),
        5, 3);
      grid.placeUnit(brigand, 5, 3);

      const engine = new CombatEngine(grid);
      const rng = makeRng([0, 0, 99]);

      const result = engine.resolveCombat(
        soldier, brigand, WEAPON_DB['Javelin'], WEAPON_DB['Iron Axe'], rng,
      );

      // Only 1 entry: soldier attacks. Brigand cannot counter (range 1 weapon at range 2).
      expect(result.log.length).toBe(1);
      expect(result.log[0].attacker).toBe(soldier);
    });

    it('Javelin at range 1 allows defender counterattack (unlike bows)', () => {
      const grid = new Grid(8, 8);
      grid.setTerrain(3, 3, 'plains');
      grid.setTerrain(4, 3, 'plains'); // adjacent

      const soldier = new Unit('a1', 'Soldier', Faction.PLAYER, UnitClass.SOLDIER,
        stats({ hp: 20, str: 10, skl: 8, spd: 8, luk: 3, def: 5, res: 2 }),
        3, 3);
      grid.placeUnit(soldier, 3, 3);

      const brigand = new Unit('e1', 'Brigand', Faction.ENEMY, UnitClass.BRIGAND,
        stats({ hp: 20, str: 8, skl: 5, spd: 5, luk: 2, def: 4, res: 1 }),
        4, 3);
      grid.placeUnit(brigand, 4, 3);

      const engine = new CombatEngine(grid);
      const rng = makeRng([0, 0, 99, 0, 0, 99]);

      const result = engine.resolveCombat(
        soldier, brigand, WEAPON_DB['Javelin'], WEAPON_DB['Iron Axe'], rng,
      );

      // Both get at least one attack (attacker + defender counter)
      expect(result.log.length).toBeGreaterThanOrEqual(2);
      const defEntries = result.log.filter((e) => e.attacker === brigand);
      expect(defEntries.length).toBeGreaterThanOrEqual(1);
    });

    it('Hand Axe can attack at range 2', () => {
      const grid = new Grid(8, 8);
      grid.setTerrain(3, 3, 'plains');
      grid.setTerrain(5, 3, 'plains');

      const brigand = new Unit('a1', 'Brigand', Faction.PLAYER, UnitClass.BRIGAND,
        stats({ hp: 20, str: 10, skl: 8, spd: 8, luk: 3, def: 5, res: 2 }),
        3, 3);
      grid.placeUnit(brigand, 3, 3);

      const soldier = new Unit('e1', 'Soldier', Faction.ENEMY, UnitClass.SOLDIER,
        stats({ hp: 20, str: 8, skl: 6, spd: 5, luk: 2, def: 4, res: 1 }),
        5, 3);
      grid.placeUnit(soldier, 5, 3);

      const engine = new CombatEngine(grid);
      const rng = makeRng([0, 0, 99]);

      const result = engine.resolveCombat(
        brigand, soldier, WEAPON_DB['Hand Axe'], WEAPON_DB['Iron Lance'], rng,
      );

      // Brigand hits from range 2, soldier cannot counter (Iron Lance is range 1)
      expect(result.log.length).toBe(1);
      expect(result.log[0].attacker).toBe(brigand);
    });
  });

  describe('Effective damage', () => {
    it('Armorslayer does 3x mt vs General', () => {
      const grid = new Grid(8, 8);
      grid.setTerrain(3, 3, 'plains');
      grid.setTerrain(4, 3, 'plains');
      const engine = new CombatEngine(grid);
      const attacker = new Unit('a1', 'Seth', Faction.PLAYER, UnitClass.MERCENARY,
        createStats({ hp: 30, maxHp: 30, str: 10, mag: 0, skl: 10, spd: 10, luk: 5, def: 5, res: 2, mov: 5 }),
        3, 3);
      const defender = new Unit('d1', 'General', Faction.ENEMY, UnitClass.GENERAL,
        createStats({ hp: 30, maxHp: 30, str: 10, mag: 0, skl: 5, spd: 5, luk: 0, def: 12, res: 2, mov: 4 }),
        4, 3);
      const weapon = WEAPON_DB['Armorslayer'];
      const defWeapon = WEAPON_DB['Iron Lance'];

      // Use RNG that guarantees hit, no crit: [0, 0, 99]
      const rng = makeRng([0, 0, 99]);
      const result = engine.resolveCombat(attacker, defender, weapon, defWeapon, rng);
      // Armorslayer: mt 8 × 3 = 24 + str 10 - triangle 1 - def 12 = 21 damage
      const hitEntry = result.log.find(e => e.hit);
      expect(hitEntry!.damage).toBe(21);
    });

    it('Iron Bow does 3x mt vs Pegasus Knight', () => {
      const grid = new Grid(8, 8);
      grid.setTerrain(3, 3, 'plains');
      grid.setTerrain(5, 3, 'plains');
      const engine = new CombatEngine(grid);
      const attacker = new Unit('a1', 'Archer', Faction.PLAYER, UnitClass.ARCHER,
        createStats({ hp: 25, maxHp: 25, str: 8, mag: 0, skl: 10, spd: 8, luk: 5, def: 5, res: 2, mov: 5 }),
        3, 3);
      const defender = new Unit('d1', 'Peg', Faction.ENEMY, UnitClass.PEGASUS_KNIGHT,
        createStats({ hp: 20, maxHp: 20, str: 6, mag: 0, skl: 8, spd: 10, luk: 5, def: 4, res: 5, mov: 7 }),
        5, 3);
      const weapon = WEAPON_DB['Iron Bow'];
      const defWeapon = WEAPON_DB['Iron Lance'];

      // Iron Bow range 2—Pegasus can't counter with range 1 lance
      const rng = makeRng([0, 0, 99]);
      const result = engine.resolveCombat(attacker, defender, weapon, defWeapon, rng);
      // Iron Bow: mt 6 × 3 = 18 + str 8 - def 4 = 22 damage
      const hitEntry = result.log.find(e => e.hit);
      expect(hitEntry!.damage).toBe(22);
    });

    it('Armorslayer does NOT get bonus vs non-armored', () => {
      const grid = new Grid(8, 8);
      grid.setTerrain(3, 3, 'plains');
      grid.setTerrain(4, 3, 'plains');
      const engine = new CombatEngine(grid);
      const attacker = new Unit('a1', 'Merc', Faction.PLAYER, UnitClass.MERCENARY,
        createStats({ hp: 30, maxHp: 30, str: 10, mag: 0, skl: 10, spd: 10, luk: 5, def: 5, res: 2, mov: 5 }),
        3, 3);
      const defender = new Unit('d1', 'Cav', Faction.ENEMY, UnitClass.CAVALRY,
        createStats({ hp: 25, maxHp: 25, str: 8, mag: 0, skl: 8, spd: 8, luk: 3, def: 8, res: 2, mov: 7 }),
        4, 3);
      const weapon = WEAPON_DB['Armorslayer'];
      const defWeapon = WEAPON_DB['Iron Lance'];

      const rng = makeRng([0, 0, 99]);
      const result = engine.resolveCombat(attacker, defender, weapon, defWeapon, rng);
      // No bonus: mt 8 + str 10 - triangle 1 - def 8 = 9
      const hitEntry = result.log.find(e => e.hit);
      expect(hitEntry!.damage).toBe(9);
    });
  });

  describe('Brave weapons', () => {
    it('Brave Sword attacks twice before counter', () => {
      const grid = new Grid(8, 8);
      grid.setTerrain(3, 3, 'plains');
      grid.setTerrain(4, 3, 'plains');
      const engine = new CombatEngine(grid);
      // Equal speed to prevent follow-up doubling
      const attacker = new Unit('a1', 'Hero', Faction.PLAYER, UnitClass.MERCENARY,
        createStats({ hp: 40, maxHp: 40, str: 12, mag: 0, skl: 15, spd: 10, luk: 5, def: 10, res: 5, mov: 6 }),
        3, 3);
      const defender = new Unit('d1', 'Bandit', Faction.ENEMY, UnitClass.BRIGAND,
        createStats({ hp: 30, maxHp: 30, str: 10, mag: 0, skl: 5, spd: 10, luk: 0, def: 5, res: 2, mov: 5 }),
        4, 3);
      const weapon = WEAPON_DB['Brave Sword'];
      const defWeapon = WEAPON_DB['Iron Axe'];

      // Guarantee attacker hits, no crit: 2 attacks × 3 RNs = 6 RNG values
      const rng = makeRng([0, 0, 99, 0, 0, 99, 100, 100]);
      const result = engine.resolveCombat(attacker, defender, weapon, defWeapon, rng);
      // Should have 2 attacker attacks before any defender attack
      const attackerEntries = result.log.filter(e => e.attacker === attacker);
      expect(attackerEntries.length).toBe(2);
    });

    it('Brave weapon consumes 2 durability per round', () => {
      const grid = new Grid(8, 8);
      grid.setTerrain(3, 3, 'plains');
      grid.setTerrain(4, 3, 'plains');
      const engine = new CombatEngine(grid);
      const attacker = new Unit('a1', 'Hero', Faction.PLAYER, UnitClass.MERCENARY,
        createStats({ hp: 40, maxHp: 40, str: 12, mag: 0, skl: 15, spd: 10, luk: 5, def: 10, res: 5, mov: 6 }),
        3, 3);
      const defender = new Unit('d1', 'Bandit', Faction.ENEMY, UnitClass.BRIGAND,
        createStats({ hp: 30, maxHp: 30, str: 10, mag: 0, skl: 5, spd: 10, luk: 0, def: 5, res: 2, mov: 5 }),
        4, 3);
      const weapon = WEAPON_DB['Brave Sword'];
      const defWeapon = WEAPON_DB['Iron Axe'];

      const attTracker = createDurabilityTracker(5);
      const rng = makeRng([0, 0, 99, 0, 0, 99, 100, 100]);
      const result = engine.resolveCombat(attacker, defender, weapon, defWeapon, rng, attTracker);
      expect(result.attackerWeaponUsed).toBe(true);
      // 2 attacks consumed 2 durability
      expect(attTracker.uses).toBe(3);
    });
  });

  describe('Constitution and weapon weight', () => {
    it('heavy weapon can prevent doubling', () => {
      const grid = new Grid(8, 8);
      grid.setTerrain(3, 3, 'plains');
      grid.setTerrain(4, 3, 'plains');
      const engine = new CombatEngine(grid);
      // Brigand: Spd 10, Con 12. Steel Axe: Wt 15. AS = 10 - max(0, 15-12) = 10 - 3 = 7
      // Merc: Spd 12, Con 9. Iron Sword: Wt undefined (0). AS = 12
      // Diff = 12 - 7 = 5 >= 4 -> Merc doubles, Brigand doesn't
      const brigand = new Unit('b1', 'Brigand', Faction.ENEMY, UnitClass.BRIGAND,
        createStats({ hp: 30, maxHp: 30, str: 12, mag: 0, skl: 5, spd: 10, luk: 0, def: 8, res: 2, mov: 5 }),
        4, 3);
      const merc = new Unit('m1', 'Merc', Faction.PLAYER, UnitClass.MERCENARY,
        createStats({ hp: 25, maxHp: 25, str: 8, mag: 0, skl: 12, spd: 12, luk: 5, def: 6, res: 2, mov: 5 }),
        3, 3);
      const wpn = WEAPON_DB['Iron Sword'];
      const defWpn = WEAPON_DB['Steel Axe'];

      const preview = engine.previewCombat(merc, brigand, wpn, defWpn);
      expect(preview.attacker.doubleAttack).toBe(true);
      expect(preview.defender?.doubleAttack ?? false).toBe(false);
    });

    it('high-Con unit is not weighed down by heavy weapon', () => {
      const grid = new Grid(8, 8);
      grid.setTerrain(3, 3, 'plains');
      grid.setTerrain(4, 3, 'plains');
      const engine = new CombatEngine(grid);
      // General: Spd 8, Con 15. Steel Axe Wt 15. AS = 8 - 0 = 8
      const general = new Unit('g1', 'General', Faction.ENEMY, UnitClass.GENERAL,
        createStats({ hp: 35, maxHp: 35, str: 15, mag: 0, skl: 8, spd: 8, luk: 2, def: 18, res: 5, mov: 5 }),
        4, 3);
      const merc = new Unit('m1', 'Merc', Faction.PLAYER, UnitClass.MERCENARY,
        createStats({ hp: 25, maxHp: 25, str: 8, mag: 0, skl: 12, spd: 12, luk: 5, def: 6, res: 2, mov: 5 }),
        3, 3);
      const wpn = WEAPON_DB['Iron Sword'];
      const defWpn = WEAPON_DB['Steel Axe'];

      // General with Steel Axe: Wt 15 - Con 15 = 0 penalty, AS = 8
      // Merc with Iron Sword: AS = 12. 12 - 8 = 4 >= 4 -> Merc doubles
      const preview = engine.previewCombat(merc, general, wpn, defWpn);
      expect(preview.attacker.doubleAttack).toBe(true);
    });
  });
});

