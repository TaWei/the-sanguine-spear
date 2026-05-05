import {
  Item,
  createWeaponItem,
  createRecoveryItem,
  createStaffItem,
  createKeyItem,
  createStatBoosterItem,
  createPromotionItem,
} from './ItemTypes';
import { WEAPON_DB } from '../combat/Weapons';
import { STAFF_DB } from '../staves/Staves';

export function createItemByName(name: string): Item | null {
  const weapon = WEAPON_DB[name];
  if (weapon) {
    return createWeaponItem(
      weapon.name,
      weapon.type,
      weapon.mt,
      weapon.hit,
      weapon.crit,
      weapon.minRange,
      weapon.maxRange,
      weapon.usesMagic,
    );
  }

  const staff = STAFF_DB[name];
  if (staff) {
    return createStaffItem(staff.name, staff.healAmount, staff.minRange, staff.maxRange);
  }

  switch (name) {
    case 'Vulnerary':
      return createRecoveryItem('Vulnerary', 10);
    case 'Elixir':
      return createRecoveryItem('Elixir', 30);
    case 'Door Key':
      return createKeyItem('Door Key');
    case 'Chest Key':
      return createKeyItem('Chest Key');
    case 'Speedwing':
      return createStatBoosterItem('Speedwing', 'spd', 2);
    case 'Goddess Icon':
      return createStatBoosterItem('Goddess Icon', 'luk', 2);
    case 'Master Seal':
      return createPromotionItem('Master Seal');
    default:
      return null;
  }
}
