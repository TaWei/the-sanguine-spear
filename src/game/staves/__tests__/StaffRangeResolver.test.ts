import { describe, it, expect } from 'vitest';
import { resolveStaffRange } from '../StaffRangeResolver';
import { Unit, Faction, UnitClass } from '../../units/Unit';
import { createStats } from '../../units/Stats';
import { StaffData } from '../Staves';

function makeHealer(mag: number) {
  return new Unit('h1', 'Elara', Faction.PLAYER, UnitClass.MAGE,
    createStats({ hp: 20, maxHp: 20, str: 1, mag, skl: 5, spd: 8, luk: 3, def: 3, res: 8, mov: 5 }),
    5, 5);
}

describe('resolveStaffRange', () => {
  it('returns static range when getRange is absent', () => {
    const staff: StaffData = { name: 'Heal', healAmount: 10, minRange: 1, maxRange: 1 };
    const range = resolveStaffRange(staff, makeHealer(10));
    expect(range).toEqual({ min: 1, max: 1 });
  });

  it('uses getRange when present', () => {
    const staff: StaffData = {
      name: 'Physic',
      healAmount: 10,
      minRange: 1, maxRange: 1,
      getRange: (u: Unit) => ({ min: 1, max: Math.max(1, Math.floor(u.stats.mag / 2)) }),
    };
    const range = resolveStaffRange(staff, makeHealer(10));
    expect(range).toEqual({ min: 1, max: 5 });
  });

  it('clamps dynamic maxRange to at least 1', () => {
    const staff: StaffData = {
      name: 'Physic',
      healAmount: 10,
      minRange: 1, maxRange: 99,
      getRange: (u: Unit) => ({ min: 1, max: Math.max(1, Math.floor(u.stats.mag / 2)) }),
    };
    const range = resolveStaffRange(staff, makeHealer(1));
    expect(range).toEqual({ min: 1, max: 1 });
  });

  it('handles Mag 20 -> range 10', () => {
    const staff: StaffData = {
      name: 'Physic',
      healAmount: 10,
      minRange: 1, maxRange: 99,
      getRange: (u: Unit) => ({ min: 1, max: Math.max(1, Math.floor(u.stats.mag / 2)) }),
    };
    expect(resolveStaffRange(staff, makeHealer(20))).toEqual({ min: 1, max: 10 });
  });
});
