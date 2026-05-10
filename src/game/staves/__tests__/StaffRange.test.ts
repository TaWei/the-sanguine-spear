import { describe, it, expect } from 'vitest';
import { computeStaffRange } from '../StaffRange';
import { Unit, Faction, UnitClass } from '../../units/Unit';
import { createStats } from '../../units/Stats';
import { Grid } from '../../map/Grid';
import { StaffData } from '../Staves';

describe('computeStaffRange', () => {
  const staff: StaffData = { name: 'Heal', healAmount: 10, minRange: 1, maxRange: 1 };
  const stats = createStats({ hp: 20, maxHp: 20, str: 5, mag: 5, skl: 5, spd: 5, luk: 5, def: 5, res: 5, mov: 5 });

  it('returns adjacent tiles for range 1 staff', () => {
    const grid = new Grid(5, 5);
    const unit = new Unit('u1', 'Test', Faction.PLAYER, UnitClass.LORD, stats, 2, 2);
    const range = computeStaffRange(unit, grid, staff);
    expect(range).toContainEqual([2, 1]);
    expect(range).toContainEqual([2, 3]);
    expect(range).toContainEqual([1, 2]);
    expect(range).toContainEqual([3, 2]);
    expect(range).toHaveLength(4);
  });

  it('computes Physic range tiles based on Mag / 2', () => {
    const grid = new Grid(10, 10);
    const healer = new Unit('h1', 'Elara', Faction.PLAYER, UnitClass.MAGE,
      createStats({ hp: 20, maxHp: 20, str: 1, mag: 10, skl: 5, spd: 5, luk: 5, def: 5, res: 5, mov: 5 }), 5, 5);
    grid.placeUnit(healer, 5, 5);

    const physStaff: StaffData = {
      name: 'Physic', healAmount: 10, minRange: 1, maxRange: 99,
      getRange: (u: Unit) => ({ min: 1, max: Math.max(1, Math.floor(u.stats.mag / 2)) }),
    };

    const range = computeStaffRange(healer, grid, physStaff);
    // Mag 10 -> max range 5. All tiles with distance 1-5 from (5,5)
    for (const [tx, ty] of range) {
      const dist = Math.abs(tx - 5) + Math.abs(ty - 5);
      expect(dist).toBeGreaterThanOrEqual(1);
      expect(dist).toBeLessThanOrEqual(5);
    }
    // A tile at distance 6 should not be in range
    expect(range.some(([tx, ty]) => Math.abs(tx - 5) + Math.abs(ty - 5) > 5)).toBe(false);
  });

  it("does not include the unit's own tile", () => {
    const grid = new Grid(5, 5);
    const unit = new Unit('u1', 'Test', Faction.PLAYER, UnitClass.LORD, stats, 2, 2);
    const range = computeStaffRange(unit, grid, staff);
    expect(range.some(([x, y]) => x === 2 && y === 2)).toBe(false);
  });
});
