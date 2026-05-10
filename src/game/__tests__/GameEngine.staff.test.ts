import { describe, it, expect } from 'vitest';
import { GameEngine } from '../GameEngine';
import { Faction, UnitClass } from '../units/Unit';
import { createStats } from '../units/Stats';
import { createStaffItem } from '../items/ItemTypes';
import { createItemByName } from '../items/ItemFactory';

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

  it('Mend heals 20 HP', () => {
    const engine = new GameEngine(8, 8);
    for (let y = 0; y < 8; y++)
      for (let x = 0; x < 8; x++)
        engine.setTerrain(x, y, 'plains');

    const healer = engine.addUnit('h1', 'Elara', Faction.PLAYER, UnitClass.MAGE,
      createStats({ hp: 20, maxHp: 20, str: 1, mag: 10, skl: 5, spd: 8, luk: 3, def: 3, res: 8, mov: 5 }),
      4, 4);
    // Remove default Heal and add Mend
    const healIdx = healer.inventory.items.findIndex(i => i.name === 'Heal');
    if (healIdx >= 0) healer.inventory.removeAt(healIdx);
    healer.inventory.add(createItemByName('Mend')!);

    const wounded = engine.addUnit('p1', 'Rowan', Faction.PLAYER, UnitClass.MERCENARY,
      createStats({ hp: 5, maxHp: 30, str: 8, mag: 0, skl: 8, spd: 8, luk: 3, def: 5, res: 2, mov: 5 }),
      4, 5);

    const result = engine.resolveStaffHeal(healer, wounded);
    expect(result.healedAmount).toBe(20);
    expect(wounded.stats.hp).toBe(25); // 5 + 20
  });

  it('Physic heals a unit at range 4 (Mag 10 -> range 5)', () => {
    const engine = new GameEngine(10, 10);
    for (let y = 0; y < 10; y++)
      for (let x = 0; x < 10; x++)
        engine.setTerrain(x, y, 'plains');

    const healer = engine.addUnit('h1', 'Elara', Faction.PLAYER, UnitClass.MAGE,
      createStats({ hp: 20, maxHp: 20, str: 1, mag: 10, skl: 5, spd: 8, luk: 3, def: 3, res: 8, mov: 5 }),
      2, 5);
    healer.inventory.add(createItemByName('Physic')!);
    // Remove default Heal so Physic is used
    const healIdx2 = healer.inventory.items.findIndex(i => i.name === 'Heal');
    if (healIdx2 >= 0) healer.inventory.removeAt(healIdx2);

    const wounded = engine.addUnit('p1', 'Rowan', Faction.PLAYER, UnitClass.MERCENARY,
      createStats({ hp: 3, maxHp: 30, str: 8, mag: 0, skl: 8, spd: 8, luk: 3, def: 5, res: 2, mov: 5 }),
      6, 6); // distance = |6-2| + |6-5| = 5

    // Verify Physic is available
    const staffInfo = engine.getStaffForUnit(healer);
    expect(staffInfo).not.toBeNull();
    expect(staffInfo!.data.name).toBe('Physic');

    // Verify the wounded unit is in heal range
    const targets = engine.getHealTargets(healer);
    expect(targets.map(u => u.name)).toContain('Rowan');

    // Perform the heal
    const result = engine.resolveStaffHeal(healer, wounded);
    expect(result.healedAmount).toBe(10);
    expect(wounded.stats.hp).toBe(13); // 3 + 10
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
