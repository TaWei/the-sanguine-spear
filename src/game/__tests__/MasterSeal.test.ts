import { describe, it, expect } from 'vitest';
import { GameEngine } from '../GameEngine';
import { Faction, UnitClass } from '../units/Unit';
import { createStats } from '../units/Stats';
import { createPromotionItem } from '../items/ItemTypes';

describe('Master Seal', () => {
  it('promotes an eligible base-tier unit when used', () => {
    const engine = new GameEngine(10, 8);
    const stats = createStats({ hp: 22, str: 8, mag: 2, skl: 7, spd: 8, luk: 6, def: 6, res: 2, mov: 5 });
    const unit = engine.addUnit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, stats, 2, 5);
    (unit as unknown as { _level: number })._level = 10;

    const seal = createPromotionItem('Master Seal');
    unit.inventory.add(seal);

    const result = engine.useItem(unit, 1);

    expect(result.success).toBe(true);
    expect(unit.unitClass).toBe('paladin');
    expect(unit.tier).toBe('promoted');
    expect(unit.inventory.size).toBe(1); // seal consumed
  });

  it('fails on an already-promoted unit', () => {
    const engine = new GameEngine(10, 8);
    const stats = createStats({ hp: 22, str: 8, mag: 2, skl: 7, spd: 8, luk: 6, def: 6, res: 2, mov: 5 });
    const unit = engine.addUnit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, stats, 2, 5);
    (unit as unknown as { _level: number })._level = 10;
    engine.promote(unit);

    const seal = createPromotionItem('Master Seal');
    unit.inventory.add(seal);

    const result = engine.useItem(unit, 1);

    expect(result.success).toBe(false);
    expect(result.reason).toBe('Unit is already promoted');
    expect(unit.inventory.size).toBe(2); // seal not consumed
  });

  it('respects targetClasses restriction on the seal', () => {
    const engine = new GameEngine(10, 8);
    const stats = createStats({ hp: 22, str: 8, mag: 2, skl: 7, spd: 8, luk: 6, def: 6, res: 2, mov: 5 });
    const lord = engine.addUnit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, stats, 2, 5);
    const merc = engine.addUnit('p2', 'Merc', Faction.PLAYER, UnitClass.MERCENARY, stats, 3, 5);
    (lord as unknown as { _level: number })._level = 10;
    (merc as unknown as { _level: number })._level = 10;

    const lordSeal = createPromotionItem('Lord Seal', ['lord']);
    lord.inventory.add(lordSeal);
    merc.inventory.add(lordSeal);

    const lordResult = engine.useItem(lord, 1);
    const mercResult = engine.useItem(merc, 1);

    expect(lordResult.success).toBe(true);
    expect(mercResult.success).toBe(false);
    expect(mercResult.reason).toBe('Seal does not support this class');
  });

  it('returns false for non-promotion items', () => {
    const engine = new GameEngine(10, 8);
    const stats = createStats({ hp: 22, str: 8, mag: 2, skl: 7, spd: 8, luk: 6, def: 6, res: 2, mov: 5 });
    const unit = engine.addUnit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, stats, 2, 5);

    const result = engine.useItem(unit, 0); // Iron Sword at index 0

    expect(result.success).toBe(false);
    expect(result.reason).toBe('Item cannot be used this way');
  });
});
