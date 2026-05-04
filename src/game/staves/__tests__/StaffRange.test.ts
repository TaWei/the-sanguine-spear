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

  it('does not include the unit\'s own tile', () => {
    const grid = new Grid(5, 5);
    const unit = new Unit('u1', 'Test', Faction.PLAYER, UnitClass.LORD, stats, 2, 2);
    const range = computeStaffRange(unit, grid, staff);
    expect(range.some(([x, y]) => x === 2 && y === 2)).toBe(false);
  });
});
