import { UnitClass } from './UnitClass';

const CLASS_CON: Record<string, number> = {
  [UnitClass.LORD]: 7,
  [UnitClass.MERCENARY]: 9,
  [UnitClass.MAGE]: 6,
  [UnitClass.ARCHER]: 7,
  [UnitClass.CAVALRY]: 9,
  [UnitClass.PEGASUS_KNIGHT]: 5,
  [UnitClass.SOLDIER]: 10,
  [UnitClass.BRIGAND]: 12,
  [UnitClass.SWORDMASTER]: 9,
  [UnitClass.BERSERKER]: 13,
  [UnitClass.PALADIN]: 11,
  [UnitClass.SAGE]: 7,
  [UnitClass.SNIPER]: 8,
  [UnitClass.FALCON_KNIGHT]: 6,
  [UnitClass.GENERAL]: 15,
  [UnitClass.THIEF]: 6,
  [UnitClass.ASSASSIN]: 7,
  [UnitClass.WRAITH_KNIGHT]: 12,
};

export function getBaseCon(unitClass: string): number {
  return CLASS_CON[unitClass] ?? 0;
}
