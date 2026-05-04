import { describe, it, expect } from 'vitest';
import { Unit, Faction, UnitClass } from '../../units/Unit';
import { createStats } from '../../units/Stats';
import { PromotionEngine } from '../PromotionEngine';
import { CLASS_CAPS } from '../../progression/StatCaps';

describe('PromotionEngine', () => {
  const engine = new PromotionEngine();
  const lordStats = createStats({
    hp: 22, str: 8, mag: 2, skl: 7, spd: 8, luk: 6, def: 6, res: 2, mov: 5,
  });

  it('allows promotion at level 10', () => {
    const unit = new Unit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, lordStats, 0, 0, {
      level: 10,
    });
    expect(engine.canPromote(unit)).toBe(true);
  });

  it('does not allow promotion below level 10', () => {
    const unit = new Unit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, lordStats, 0, 0, {
      level: 9,
    });
    expect(engine.canPromote(unit)).toBe(false);
  });

  it('does not allow double promotion', () => {
    const unit = new Unit('p1', 'Rowan', Faction.PLAYER, UnitClass.SWORDMASTER, lordStats, 0, 0, {
      level: 10,
    });
    expect(engine.canPromote(unit)).toBe(false);
  });

  it('applies promotion bonuses and changes class', () => {
    const unit = new Unit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, lordStats, 0, 0, {
      level: 10,
      exp: 50,
    });
    const result = engine.promote(unit);

    expect(result.success).toBe(true);
    expect(result.newClass).toBe('paladin');
    expect(result.oldClass).toBe('lord');
    expect(unit.unitClass).toBe('paladin');
    expect(unit.level).toBe(1);
    expect(unit.exp).toBe(0);
  });

  it('bumps stats below promoted class base minimums', () => {
    const lowStats = createStats({
      hp: 10, str: 3, mag: 1, skl: 2, spd: 2, luk: 1, def: 1, res: 1, mov: 3,
    });
    const unit = new Unit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, lowStats, 0, 0, {
      level: 10,
    });
    engine.promote(unit);
    // Paladin base HP is 24; unit should be bumped to at least that
    expect(unit.stats.hp).toBeGreaterThanOrEqual(24);
    expect(unit.stats.str).toBeGreaterThanOrEqual(9);
  });

  it('adds flat bonuses on top of current stats (when above base)', () => {
    const highStats = createStats({
      hp: 30, str: 12, mag: 5, skl: 10, spd: 10, luk: 8, def: 8, res: 5, mov: 5,
    });
    const unit = new Unit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, highStats, 0, 0, {
      level: 10,
    });
    const result = engine.promote(unit);
    // HP bonus for paladin is +4
    expect(result.newStats.hp).toBe(34);
    expect(result.newStats.maxHp).toBe(34);
  });

  it('caps promoted stats at new class cap', () => {
    const maxedStats = createStats({
      hp: 80, str: 40, mag: 30, skl: 40, spd: 40, luk: 40, def: 40, res: 40, mov: 10,
    });
    const unit = new Unit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, maxedStats, 0, 0, {
      level: 10,
    });
    engine.promote(unit);
    expect(unit.stats.hp).toBeLessThanOrEqual(CLASS_CAPS.paladin.hp);
    expect(unit.stats.str).toBeLessThanOrEqual(CLASS_CAPS.paladin.str);
  });

  it('returns a diff showing which stats changed', () => {
    const unit = new Unit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, lordStats, 0, 0, {
      level: 10,
    });
    const result = engine.promote(unit);
    expect(result.diff.hp).toBeGreaterThan(0);
    expect(result.diff.str).toBeGreaterThan(0);
  });

  it('is idempotent — second promotion fails', () => {
    const unit = new Unit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, lordStats, 0, 0, {
      level: 10,
    });
    engine.promote(unit);
    const second = engine.promote(unit);
    expect(second.success).toBe(false);
  });

  it('updates unit tier to promoted', () => {
    const unit = new Unit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, lordStats, 0, 0, {
      level: 10,
    });
    expect(unit.tier).toBe('base');
    engine.promote(unit);
    expect(unit.tier).toBe('promoted');
  });

  it('mercenary promotes to swordmaster', () => {
    const unit = new Unit('p1', 'Merc', Faction.PLAYER, UnitClass.MERCENARY, lordStats, 0, 0, {
      level: 10,
    });
    const result = engine.promote(unit);
    expect(result.success).toBe(true);
    expect(result.newClass).toBe('swordmaster');
  });

  it('mage promotes to sage', () => {
    const unit = new Unit('p1', 'Mage', Faction.PLAYER, UnitClass.MAGE, lordStats, 0, 0, {
      level: 10,
    });
    const result = engine.promote(unit);
    expect(result.success).toBe(true);
    expect(result.newClass).toBe('sage');
  });
});
