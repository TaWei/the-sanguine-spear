import { describe, it, expect } from 'vitest';
import { STAFF_DB, StaffData } from '../Staves';
import { Unit, Faction, UnitClass } from '../../units/Unit';
import { createStats } from '../../units/Stats';

describe('STAFF_DB', () => {
  it('contains Heal staff with correct stats', () => {
    const heal = STAFF_DB['Heal'];
    expect(heal).toBeDefined();
    expect(heal.name).toBe('Heal');
    expect(heal.healAmount).toBe(10);
    expect(heal.minRange).toBe(1);
    expect(heal.maxRange).toBe(1);
  });
});

describe('StaffData dynamic range', () => {
  it('Heal uses fixed range (no getRange)', () => {
    expect(STAFF_DB.Heal.minRange).toBe(1);
    expect(STAFF_DB.Heal.maxRange).toBe(1);
    expect(STAFF_DB.Heal.getRange).toBeUndefined();
  });

  it('can resolve range from fixed min/max when getRange is absent', () => {
    function resolve(staff: StaffData): { min: number; max: number } {
      if (staff.getRange) {
        return staff.getRange(null!);
      }
      return { min: staff.minRange, max: staff.maxRange };
    }
    expect(resolve(STAFF_DB.Heal)).toEqual({ min: 1, max: 1 });
  });
});

describe('Mend staff', () => {
  it('Mend heals 20 HP at range 1', () => {
    expect(STAFF_DB.Mend).toBeDefined();
    expect(STAFF_DB.Mend.healAmount).toBe(20);
    expect(STAFF_DB.Mend.minRange).toBe(1);
    expect(STAFF_DB.Mend.maxRange).toBe(1);
    expect(STAFF_DB.Mend.getRange).toBeUndefined(); // static range
  });
});

describe('Physic staff', () => {
  it('Physic has dynamic range based on Mag / 2', () => {
    expect(STAFF_DB.Physic).toBeDefined();
    expect(STAFF_DB.Physic.healAmount).toBe(10);
    expect(STAFF_DB.Physic.getRange).toBeDefined();

    // Test the range function
    const caster = new Unit('t', 'Test', Faction.PLAYER, UnitClass.MAGE,
      createStats({ hp: 20, maxHp: 20, str: 1, mag: 14, skl: 5, spd: 5, luk: 5, def: 5, res: 5, mov: 5 }), 0, 0);
    const range = STAFF_DB.Physic.getRange!(caster);
    expect(range).toEqual({ min: 1, max: 7 }); // floor(14/2) = 7
  });
});
