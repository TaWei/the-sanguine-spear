import { describe, it, expect } from 'vitest';
import { AiBehavior, shouldPursue, shouldAttackInRange, shouldRetreat, isStationary } from '../Behavior';
import { Unit, Faction, UnitClass } from '../../units/Unit';
import { createStats } from '../../units/Stats';

describe('AiBehavior', () => {
  const makeUnit = (hp: number, maxHp: number) => {
    const stats = createStats({ hp, maxHp, str: 5, mag: 0, skl: 5, spd: 5, luk: 5, def: 5, res: 5, mov: 5 });
    return new Unit('e1', 'Grunt', Faction.ENEMY, UnitClass.SOLDIER, stats, 0, 0);
  };

  it('PURSUE always allows pursuit', () => {
    const unit = makeUnit(20, 20);
    expect(shouldPursue(AiBehavior.PURSUE, unit)).toBe(true);
  });

  it('ATTACK_IN_RANGE does not pursue when no targets in range', () => {
    const unit = makeUnit(20, 20);
    expect(shouldPursue(AiBehavior.ATTACK_IN_RANGE, unit)).toBe(false);
  });

  it('GUARD never pursues or attacks', () => {
    const unit = makeUnit(20, 20);
    expect(shouldPursue(AiBehavior.GUARD, unit)).toBe(false);
    expect(shouldAttackInRange(AiBehavior.GUARD, unit)).toBe(false);
  });

  it('BOSS_GUARD only attacks in range and never pursues', () => {
    const unit = makeUnit(20, 20);
    expect(shouldPursue(AiBehavior.BOSS_GUARD, unit)).toBe(false);
    expect(shouldAttackInRange(AiBehavior.BOSS_GUARD, unit)).toBe(true);
  });

  it('RECOVER_MODE triggers retreat when HP below threshold', () => {
    const unit = makeUnit(3, 20); // 15% HP
    expect(shouldRetreat(AiBehavior.RECOVER_MODE, unit)).toBe(true);
  });

  it('RECOVER_MODE does not trigger retreat when HP is healthy', () => {
    const unit = makeUnit(18, 20); // 90% HP
    expect(shouldRetreat(AiBehavior.RECOVER_MODE, unit)).toBe(false);
  });

  it('THIEF is treated as mobile pursuit behavior', () => {
    const unit = makeUnit(20, 20);
    expect(shouldPursue(AiBehavior.THIEF, unit)).toBe(true);
    expect(shouldAttackInRange(AiBehavior.THIEF, unit)).toBe(true);
  });

  it('EXPANDED_RANGE allows pursuit and attack', () => {
    const unit = makeUnit(20, 20);
    expect(shouldPursue(AiBehavior.EXPANDED_RANGE, unit)).toBe(true);
    expect(shouldAttackInRange(AiBehavior.EXPANDED_RANGE, unit)).toBe(true);
  });

  it('isStationary returns true for GUARD and BOSS_GUARD', () => {
    expect(isStationary(AiBehavior.GUARD)).toBe(true);
    expect(isStationary(AiBehavior.BOSS_GUARD)).toBe(true);
    expect(isStationary(AiBehavior.PURSUE)).toBe(false);
    expect(isStationary(AiBehavior.ATTACK_IN_RANGE)).toBe(false);
  });
});
