import { describe, it, expect } from 'vitest';
import { getClassTags, UnitClassTag } from '../Effectiveness';
import { UnitClass } from '../../units/Unit';

describe('getClassTags', () => {
  it('General is armored', () => {
    const tags = getClassTags(UnitClass.GENERAL);
    expect(tags.has('armored' as UnitClassTag)).toBe(true);
  });

  it('Cavalry is cavalry', () => {
    const tags = getClassTags(UnitClass.CAVALRY);
    expect(tags.has('cavalry' as UnitClassTag)).toBe(true);
  });

  it('Pegasus Knight is flying', () => {
    const tags = getClassTags(UnitClass.PEGASUS_KNIGHT);
    expect(tags.has('flying' as UnitClassTag)).toBe(true);
  });

  it('Paladin is cavalry but not armored', () => {
    const tags = getClassTags(UnitClass.PALADIN);
    expect(tags.has('cavalry' as UnitClassTag)).toBe(true);
    expect(tags.has('armored' as UnitClassTag)).toBe(false);
  });

  it('Mercenary has no tags', () => {
    const tags = getClassTags(UnitClass.MERCENARY);
    expect(tags.size).toBe(0);
  });

  it('Falcon Knight is flying', () => {
    const tags = getClassTags(UnitClass.FALCON_KNIGHT);
    expect(tags.has('flying' as UnitClassTag)).toBe(true);
  });
});
