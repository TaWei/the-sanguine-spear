import { UnitClass } from '../units/Unit';

export type UnitClassTag = 'armored' | 'cavalry' | 'flying';

export const EFFECTIVE_MULTIPLIER = 3;

export function getClassTags(unitClass: UnitClass): Set<UnitClassTag> {
  const tags = new Set<UnitClassTag>();
  switch (unitClass) {
    case UnitClass.GENERAL:
      tags.add('armored');
      break;
    case UnitClass.CAVALRY:
    case UnitClass.PALADIN:
      tags.add('cavalry');
      break;
    case UnitClass.PEGASUS_KNIGHT:
    case UnitClass.FALCON_KNIGHT:
      tags.add('flying');
      break;
  }
  return tags;
}
