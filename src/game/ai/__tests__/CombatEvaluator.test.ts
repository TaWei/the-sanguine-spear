import { describe, it, expect } from 'vitest';
import { evaluateCombat } from '../CombatEvaluator';
import { Unit, Faction, UnitClass } from '../../units/Unit';
import { createStats } from '../../units/Stats';
import { WEAPON_DB } from '../../combat/Weapons';
import { Grid } from '../../map/Grid';

describe('CombatEvaluator', () => {
  const grid = new Grid(10, 10);

  const makeBandit = () => {
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

  const makeLord = () => {
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
    return new Unit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, stats, 6, 5);
  };

  it('returns positive netDamage when attacker outclasses defender', () => {
    const bandit = makeBandit();
    const lord = makeLord();
    const score = evaluateCombat(bandit, lord, WEAPON_DB['Iron Axe'], grid);
    expect(score.netDamage).toBeGreaterThan(0);
  });

  it('canKill is true when damage >= target HP', () => {
    const bandit = makeBandit();
    const weakStats = createStats({
      hp: 10,
      str: 1,
      mag: 1,
      skl: 1,
      spd: 1,
      luk: 1,
      def: 1,
      res: 1,
      mov: 5,
    });
    const weak = new Unit('p2', 'Weak', Faction.PLAYER, UnitClass.MAGE, weakStats, 6, 5);
    const score = evaluateCombat(bandit, weak, WEAPON_DB['Iron Axe'], grid);
    expect(score.canKill).toBe(true);
  });

  it('counterDamage is 0 when defender cannot counterattack (out of range)', () => {
    const bandit = makeBandit();
    const archerStats = createStats({
      hp: 18,
      str: 5,
      mag: 0,
      skl: 6,
      spd: 6,
      luk: 4,
      def: 4,
      res: 2,
      mov: 5,
    });
    const archer = new Unit('p3', 'Archer', Faction.PLAYER, UnitClass.ARCHER, archerStats, 6, 5);
    // Bow range 2, but assume melee range for this test
    const score = evaluateCombat(bandit, archer, WEAPON_DB['Iron Axe'], grid, WEAPON_DB['Iron Bow']);
    expect(score.counterDamage).toBe(0);
  });

  it('survivalRisk increases when counterDamage is high relative to attacker HP', () => {
    const bandit = makeBandit();
    bandit.takeDamage(20); // hp now 6
    const lord = makeLord();
    const score = evaluateCombat(bandit, lord, WEAPON_DB['Iron Axe'], grid, WEAPON_DB['Iron Sword']);
    expect(score.survivalRisk).toBeGreaterThan(0);
  });

  it('returns zero netDamage and canKill false for dead target', () => {
    const bandit = makeBandit();
    const lord = makeLord();
    lord.takeDamage(999);
    const score = evaluateCombat(bandit, lord, WEAPON_DB['Iron Axe'], grid);
    expect(score.netDamage).toBe(0);
    expect(score.canKill).toBe(false);
  });

  it('uses magic stat when weapon usesMagic is true', () => {
    const mageStats = createStats({
      hp: 18,
      str: 2,
      mag: 8,
      skl: 6,
      spd: 7,
      luk: 5,
      def: 3,
      res: 6,
      mov: 5,
    });
    const mage = new Unit('e2', 'Dark Mage', Faction.ENEMY, UnitClass.MAGE, mageStats, 5, 5);
    const lord = makeLord();
    const score = evaluateCombat(mage, lord, WEAPON_DB['Fire'], grid);
    expect(score.netDamage).toBeGreaterThan(0);
  });
});
