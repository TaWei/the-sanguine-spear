import { describe, it, expect } from 'vitest';
import { GameEngine } from '../GameEngine';
import { Faction, UnitClass } from '../units/Unit';
import { createStats } from '../units/Stats';
import { createStaffItem } from '../items/ItemTypes';

describe('GameEngine staff support', () => {
  it('getHealTargets finds friendly units in staff range', () => {
    const engine = new GameEngine(5, 5);
    const healer = engine.addUnit('h1', 'Healer', Faction.PLAYER, UnitClass.MAGE, createStats({
      hp: 20, maxHp: 20, str: 1, mag: 9, skl: 6, spd: 7, luk: 5, def: 2, res: 7, mov: 5,
    }), 2, 2);
    healer.inventory.add(createStaffItem('Heal', 10, 1, 1));
    const ally = engine.addUnit('a1', 'Ally', Faction.PLAYER, UnitClass.LORD, createStats({
      hp: 20, maxHp: 20, str: 5, mag: 5, skl: 5, spd: 5, luk: 5, def: 5, res: 5, mov: 5,
    }), 2, 1);

    const targets = engine.getHealTargets(healer);
    expect(targets).toHaveLength(1);
    expect(targets[0].id).toBe('a1');
  });

  it('resolveStaffHeal restores HP and consumes staff use', () => {
    const engine = new GameEngine(5, 5);
    const healer = engine.addUnit('h1', 'Healer', Faction.PLAYER, UnitClass.MAGE, createStats({
      hp: 20, maxHp: 20, str: 1, mag: 9, skl: 6, spd: 7, luk: 5, def: 2, res: 7, mov: 5,
    }), 2, 2);
    healer.inventory.add(createStaffItem('Heal', 10, 1, 1));
    const ally = engine.addUnit('a1', 'Ally', Faction.PLAYER, UnitClass.LORD, createStats({
      hp: 5, maxHp: 20, str: 5, mag: 5, skl: 5, spd: 5, luk: 5, def: 5, res: 5, mov: 5,
    }), 2, 1);

    const result = engine.resolveStaffHeal(healer, ally);
    expect(result.healedAmount).toBe(10);
    expect(ally.stats.hp).toBe(15);
    expect(result.expAward).toBe(12);
  });

  it('mages start with a Heal staff by default', () => {
    const engine = new GameEngine(5, 5);
    const mage = engine.addUnit('m1', 'Mage', Faction.PLAYER, UnitClass.MAGE, createStats({
      hp: 16, maxHp: 16, str: 1, mag: 9, skl: 6, spd: 7, luk: 5, def: 2, res: 7, mov: 5,
    }), 0, 0);
    const staff = mage.inventory.items.find((i) => i.kind === 'staff');
    expect(staff).toBeDefined();
    expect(staff?.name).toBe('Heal');
  });
});
