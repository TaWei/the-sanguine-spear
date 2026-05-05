import { describe, it, expect } from 'vitest';
import { scoreTarget, pickBestTarget } from '../Targeting';
import { Unit, Faction, UnitClass } from '../../units/Unit';
import { createStats } from '../../units/Stats';
import { WEAPON_DB } from '../../combat/Weapons';
import { Grid } from '../../map/Grid';
import { TerrainType } from '../../map/Terrain';
import { AiPersonality } from '../Personality';

describe('Targeting', () => {
  const grid = new Grid(10, 10);

  const makeEnemy = () => {
    const stats = createStats({
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
    return new Unit('e1', 'Bandit', Faction.ENEMY, UnitClass.BRIGAND, stats, 5, 5);
  };

  const makeWeak = () => {
    const stats = createStats({
      hp: 16,
      str: 1,
      mag: 9,
      skl: 6,
      spd: 7,
      luk: 5,
      def: 2,
      res: 7,
      mov: 5,
    });
    return new Unit('p1', 'Elara', Faction.PLAYER, UnitClass.MAGE, stats, 6, 5);
  };

  const makeTough = () => {
    const stats = createStats({
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
    return new Unit('p2', 'Rowan', Faction.PLAYER, UnitClass.LORD, stats, 6, 6);
  };

  it('returns a positive score for a valid target', () => {
    const enemy = makeEnemy();
    const weak = makeWeak();
    const score = scoreTarget(enemy, weak, WEAPON_DB['Iron Axe'], grid);
    expect(score).toBeGreaterThan(0);
  });

  it('returns -Infinity if target is not an enemy', () => {
    const enemy = makeEnemy();
    const allyStats = createStats({
      hp: 16,
      str: 1,
      mag: 9,
      skl: 6,
      spd: 7,
      luk: 5,
      def: 2,
      res: 7,
      mov: 5,
    });
    const ally = new Unit('a1', 'Ally', Faction.ALLY, UnitClass.LORD, allyStats, 6, 5);
    const score = scoreTarget(enemy, ally, WEAPON_DB['Iron Axe'], grid);
    expect(score).toBe(-Infinity);
  });

  it('returns -Infinity if target is same faction', () => {
    const enemy = makeEnemy();
    const otherEnemyStats = createStats({
      hp: 20,
      str: 5,
      mag: 0,
      skl: 4,
      spd: 5,
      luk: 3,
      def: 4,
      res: 1,
      mov: 5,
    });
    const otherEnemy = new Unit(
      'e2',
      'Other',
      Faction.ENEMY,
      UnitClass.BRIGAND,
      otherEnemyStats,
      6,
      5,
    );
    const score = scoreTarget(enemy, otherEnemy, WEAPON_DB['Iron Axe'], grid);
    expect(score).toBe(-Infinity);
  });

  it('returns -Infinity if target is dead', () => {
    const enemy = makeEnemy();
    const weak = makeWeak();
    weak.takeDamage(999);
    const score = scoreTarget(enemy, weak, WEAPON_DB['Iron Axe'], grid);
    expect(score).toBe(-Infinity);
  });

  it('prefers a killable target over a tougher one', () => {
    const enemy = makeEnemy();
    const weak = makeWeak();
    const tough = makeTough();
    const weakScore = scoreTarget(enemy, weak, WEAPON_DB['Iron Axe'], grid);
    const toughScore = scoreTarget(enemy, tough, WEAPON_DB['Iron Axe'], grid);
    expect(weakScore).toBeGreaterThan(toughScore);
  });

  it('pickBestTarget returns the highest-scoring target', () => {
    const enemy = makeEnemy();
    const weak = makeWeak();
    const tough = makeTough();
    const best = pickBestTarget(enemy, [weak, tough], WEAPON_DB['Iron Axe'], grid);
    expect(best).toBe(weak);
  });

  it('pickBestTarget returns null if no valid targets', () => {
    const enemy = makeEnemy();
    const deadStats = createStats({
      hp: 0,
      str: 1,
      mag: 1,
      skl: 1,
      spd: 1,
      luk: 1,
      def: 1,
      res: 1,
      mov: 1,
    });
    const dead = new Unit('p3', 'Dead', Faction.PLAYER, UnitClass.LORD, deadStats, 0, 0);
    const best = pickBestTarget(enemy, [dead], WEAPON_DB['Iron Axe'], grid);
    expect(best).toBeNull();
  });

  it('pickBestTarget returns null if no targets provided', () => {
    const enemy = makeEnemy();
    const best = pickBestTarget(enemy, [], WEAPON_DB['Iron Axe'], grid);
    expect(best).toBeNull();
  });

  it('includes kill bonus when damage is enough to kill', () => {
    const enemy = makeEnemy();
    const weak = makeWeak();
    // Iron Axe: 9 str + 8 mt = 17 - 2 def = 15 damage, hp=16 -> not a kill
    const axeScore = scoreTarget(enemy, weak, WEAPON_DB['Iron Axe'], grid);
    // BALANCED: damage(15) + net(15) = 30
    expect(axeScore).toBe(30);

    // Hypothetical weapon with mt=10: 9+10=19-2=17 damage, hp=16 -> kill
    const killWeapon = { ...WEAPON_DB['Iron Axe'], mt: 10 };
    const killScore = scoreTarget(enemy, weak, killWeapon, grid);
    // BALANCED: damage(17) + kill(50) + net(17) = 84
    expect(killScore).toBe(84);
  });

  it('includes damageAlreadyTaken bonus', () => {
    const enemy = makeEnemy();
    const weak = makeWeak();
    weak.takeDamage(6); // hp now 10, maxHp 16 -> bonus = (16-10)*2 = 12
    // Damage is 15, which now exceeds current HP of 10, so kill bonus (+50) also applies
    const score = scoreTarget(enemy, weak, WEAPON_DB['Iron Axe'], grid);
    // BALANCED: damage(15) + kill(50) + net(15) + wounded(12) = 92
    expect(score).toBe(92);
  });

  it('uses terrain defense bonus in damage calc', () => {
    const enemy = makeEnemy();
    const weak = makeWeak();
    const forestGrid = new Grid(10, 10);
    forestGrid.setTerrain(weak.gridX, weak.gridY, TerrainType.FOREST);
    const score = scoreTarget(enemy, weak, WEAPON_DB['Iron Axe'], forestGrid);
    // def 2 + terrain 1 = 3; damage = 9 + 8 - 3 = 14
    // BALANCED: damage(14) + net(14) = 28
    expect(score).toBe(28);
  });
});

describe('Targeting with personality', () => {
  const grid = new Grid(10, 10);

  const makeEnemy = () => {
    const stats = createStats({
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
    return new Unit('e1', 'Bandit', Faction.ENEMY, UnitClass.BRIGAND, stats, 5, 5);
  };

  const makeWeak = () => {
    const stats = createStats({
      hp: 16,
      str: 1,
      mag: 9,
      skl: 6,
      spd: 7,
      luk: 5,
      def: 2,
      res: 7,
      mov: 5,
    });
    return new Unit('p1', 'Elara', Faction.PLAYER, UnitClass.MAGE, stats, 6, 5);
  };

  it('AGGRESSIVE prefers a kill even with counter risk', () => {
    const enemy = makeEnemy();
    const weak = makeWeak();
    const killWeapon = { ...WEAPON_DB['Iron Axe'], mt: 10 };
    const scoreAgg = scoreTarget(enemy, weak, killWeapon, grid, AiPersonality.AGGRESSIVE);
    const scoreCaut = scoreTarget(enemy, weak, killWeapon, grid, AiPersonality.CAUTIOUS);
    expect(scoreAgg).toBeGreaterThanOrEqual(scoreCaut);
  });

  it('CAUTIOUS avoids high-risk targets', () => {
    const enemy = makeEnemy();
    const toughStats = createStats({
      hp: 25,
      str: 10,
      mag: 0,
      skl: 8,
      spd: 8,
      luk: 6,
      def: 8,
      res: 2,
      mov: 5,
    });
    const tough = new Unit('p2', 'Knight', Faction.PLAYER, UnitClass.SOLDIER, toughStats, 6, 5);
    grid.setTerrain(tough.gridX, tough.gridY, TerrainType.FOREST);

    // Pass defender weapon so counter damage is simulated
    const scoreCaut = scoreTarget(enemy, tough, WEAPON_DB['Iron Axe'], grid, AiPersonality.CAUTIOUS, WEAPON_DB['Iron Sword']);
    const scoreBers = scoreTarget(enemy, tough, WEAPON_DB['Iron Axe'], grid, AiPersonality.BERSERKER, WEAPON_DB['Iron Sword']);
    expect(scoreBers).toBeGreaterThan(scoreCaut);
  });
});
