import { describe, it, expect } from 'vitest';
import { RescueRules } from '../RescueRules';
import { Unit, Faction, UnitClass } from '../Unit';
import { createStats } from '../Stats';

function makeUnit(unitClass: UnitClass, name = 'test'): Unit {
  return new Unit(name, name, Faction.PLAYER, unitClass,
    createStats({ hp: 20, maxHp: 20, str: 8, mag: 0, skl: 8, spd: 8, luk: 3, def: 5, res: 2, mov: 5 }),
    0, 0);
}

describe('RescueRules', () => {
  describe('canRescue', () => {
    it('cavalry can rescue foot lord', () => {
      const cav = makeUnit(UnitClass.CAVALRY);
      const lord = makeUnit(UnitClass.LORD);
      expect(RescueRules.canRescue(cav, lord)).toBe(true);
    });

    it('cavalry cannot rescue another cavalry', () => {
      const cav1 = makeUnit(UnitClass.CAVALRY);
      const cav2 = makeUnit(UnitClass.CAVALRY);
      expect(RescueRules.canRescue(cav1, cav2)).toBe(false);
    });

    it('pegasus knight can rescue cavalry (flying can rescue anyone)', () => {
      const peg = makeUnit(UnitClass.PEGASUS_KNIGHT);
      const cav = makeUnit(UnitClass.CAVALRY);
      expect(RescueRules.canRescue(peg, cav)).toBe(true);
    });

    it('foot lord cannot rescue anyone', () => {
      const lord = makeUnit(UnitClass.LORD);
      const merc = makeUnit(UnitClass.MERCENARY);
      expect(RescueRules.canRescue(lord, merc)).toBe(false);
    });

    it('cannot rescue unit that is already carrying someone', () => {
      const cav = makeUnit(UnitClass.CAVALRY);
      const cav2 = makeUnit(UnitClass.CAVALRY);
      const passenger = makeUnit(UnitClass.LORD);
      cav.setRescuedUnit(passenger);
      expect(RescueRules.canRescue(cav2, cav)).toBe(false);
    });

    it('cannot rescue unit that is already being rescued', () => {
      const cav = makeUnit(UnitClass.CAVALRY);
      const passenger = makeUnit(UnitClass.LORD);
      cav.setRescuedUnit(passenger);
      const cav2 = makeUnit(UnitClass.CAVALRY);
      expect(RescueRules.canRescue(cav2, passenger)).toBe(false);
    });

    it('cannot rescue dead units', () => {
      const cav = makeUnit(UnitClass.CAVALRY);
      const lord = makeUnit(UnitClass.LORD);
      lord.takeDamage(999);
      expect(RescueRules.canRescue(cav, lord)).toBe(false);
    });

    it('cannot rescue enemies', () => {
      const cav = makeUnit(UnitClass.CAVALRY);
      const enemy = new Unit('e1', 'Enemy', Faction.ENEMY, UnitClass.LORD,
        createStats({ hp: 20, maxHp: 20, str: 8, mag: 0, skl: 8, spd: 8, luk: 3, def: 5, res: 2, mov: 5 }),
        0, 0);
      expect(RescueRules.canRescue(cav, enemy)).toBe(false);
    });

    it('promoted mounted classes can also rescue', () => {
      const paladin = makeUnit(UnitClass.PALADIN);
      const lord = makeUnit(UnitClass.LORD);
      expect(RescueRules.canRescue(paladin, lord)).toBe(true);

      const falcon = makeUnit(UnitClass.FALCON_KNIGHT);
      const cav = makeUnit(UnitClass.CAVALRY);
      expect(RescueRules.canRescue(falcon, cav)).toBe(true); // flying
    });
  });

  describe('isMounted', () => {
    it('identifies mounted classes', () => {
      expect(RescueRules.isMounted(UnitClass.CAVALRY)).toBe(true);
      expect(RescueRules.isMounted(UnitClass.PALADIN)).toBe(true);
      expect(RescueRules.isMounted(UnitClass.PEGASUS_KNIGHT)).toBe(true);
      expect(RescueRules.isMounted(UnitClass.FALCON_KNIGHT)).toBe(true);
      expect(RescueRules.isMounted(UnitClass.LORD)).toBe(false);
      expect(RescueRules.isMounted(UnitClass.MERCENARY)).toBe(false);
    });
  });
});
