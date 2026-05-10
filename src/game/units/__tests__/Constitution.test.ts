import { describe, it, expect } from 'vitest';
import { getBaseCon } from '../Constitution';
import { UnitClass } from '../Unit';

describe('getBaseCon', () => {
  it.each([
    [UnitClass.LORD, 7],
    [UnitClass.MERCENARY, 9],
    [UnitClass.MAGE, 6],
    [UnitClass.CAVALRY, 9],
    [UnitClass.PEGASUS_KNIGHT, 5],
    [UnitClass.BRIGAND, 12],
    [UnitClass.GENERAL, 15],
    [UnitClass.PALADIN, 11],
    [UnitClass.SWORDMASTER, 9],
    [UnitClass.SNIPER, 8],
    [UnitClass.SAGE, 7],
    [UnitClass.FALCON_KNIGHT, 6],
    [UnitClass.BERSERKER, 13],
    [UnitClass.ARCHER, 7],
    [UnitClass.SOLDIER, 10],
  ])('%s has con=%i', (cls, con) => {
    expect(getBaseCon(cls)).toBe(con);
  });
});
