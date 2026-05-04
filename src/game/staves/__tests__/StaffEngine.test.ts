import { describe, it, expect } from 'vitest';
import { StaffEngine } from '../StaffEngine';
import { Unit, Faction, UnitClass } from '../../units/Unit';
import { createStats } from '../../units/Stats';
import { Inventory } from '../../items/Inventory';
import { StaffData } from '../Staves';

describe('StaffEngine', () => {
  const staff: StaffData = { name: 'Heal', healAmount: 10, minRange: 1, maxRange: 1 };
  const stats = createStats({ hp: 10, maxHp: 20, str: 5, mag: 5, skl: 5, spd: 5, luk: 5, def: 5, res: 5, mov: 5 });

  it('heals target and returns result', () => {
    const healer = new Unit('h1', 'Healer', Faction.PLAYER, UnitClass.MAGE, stats, 0, 0);
    const target = new Unit('t1', 'Target', Faction.PLAYER, UnitClass.LORD, stats, 1, 0);
    const inventory = new Inventory();
    inventory.add({ kind: 'staff', name: 'Heal', healAmount: 10, minRange: 1, maxRange: 1, uses: 20 });

    const engine = new StaffEngine();
    const result = engine.resolve(healer, target, staff, inventory, 0);

    expect(result.healedAmount).toBe(10);
    expect(target.stats.hp).toBe(20);
    expect(result.staffConsumed).toBe(false);
    expect(result.expAward).toBe(12);
  });

  it('heals only up to maxHp', () => {
    const healer = new Unit('h1', 'Healer', Faction.PLAYER, UnitClass.MAGE, stats, 0, 0);
    const targetStats = createStats({ hp: 15, maxHp: 20, str: 5, mag: 5, skl: 5, spd: 5, luk: 5, def: 5, res: 5, mov: 5 });
    const target = new Unit('t1', 'Target', Faction.PLAYER, UnitClass.LORD, targetStats, 1, 0);
    const inventory = new Inventory();
    inventory.add({ kind: 'staff', name: 'Heal', healAmount: 10, minRange: 1, maxRange: 1, uses: 20 });

    const engine = new StaffEngine();
    const result = engine.resolve(healer, target, staff, inventory, 0);

    expect(result.healedAmount).toBe(5);
    expect(target.stats.hp).toBe(20);
  });

  it('awards 0 exp when no HP was restored', () => {
    const healer = new Unit('h1', 'Healer', Faction.PLAYER, UnitClass.MAGE, stats, 0, 0);
    const target = new Unit('t1', 'Target', Faction.PLAYER, UnitClass.LORD, stats, 1, 0);
    target.heal(10);
    const inventory = new Inventory();
    inventory.add({ kind: 'staff', name: 'Heal', healAmount: 10, minRange: 1, maxRange: 1, uses: 20 });

    const engine = new StaffEngine();
    const result = engine.resolve(healer, target, staff, inventory, 0);

    expect(result.healedAmount).toBe(0);
    expect(result.expAward).toBe(0);
  });

  it('consumes staff when last use is expended', () => {
    const healer = new Unit('h1', 'Healer', Faction.PLAYER, UnitClass.MAGE, stats, 0, 0);
    const target = new Unit('t1', 'Target', Faction.PLAYER, UnitClass.LORD, stats, 1, 0);
    const inventory = new Inventory();
    inventory.add({ kind: 'staff', name: 'Heal', healAmount: 10, minRange: 1, maxRange: 1, uses: 1 });

    const engine = new StaffEngine();
    const result = engine.resolve(healer, target, staff, inventory, 0);

    expect(result.staffConsumed).toBe(true);
    expect(inventory.size).toBe(0);
  });
});
