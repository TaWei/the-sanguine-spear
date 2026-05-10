import type { Unit } from '../units/Unit';
import type { WeaponItem } from '../items/ItemTypes';

export interface PrepResult {
  success: boolean;
  reason?: string;
}

export class PrepInventory {
  equipWeapon(unit: Unit, weaponIndex: number): PrepResult {
    const item = unit.inventory.items[weaponIndex];
    if (!item || item.kind !== 'weapon') {
      return { success: false, reason: 'Not a weapon' };
    }

    const weapon = item as WeaponItem;
    if (weapon.requiredRank !== undefined) {
      const rank = unit.getWeaponRank(weapon.weaponType).rank;
      if (rank < weapon.requiredRank) {
        return { success: false, reason: 'Weapon rank too low' };
      }
    }

    unit.equippedWeaponIndex = weaponIndex;
    return { success: true };
  }

  unequipWeapon(unit: Unit): PrepResult {
    unit.equippedWeaponIndex = null;
    return { success: true };
  }

  tradeItem(
    fromUnit: Unit,
    fromIndex: number,
    toUnit: Unit,
    toIndex: number,
  ): PrepResult {
    const fromItem = fromUnit.inventory.items[fromIndex];
    const toItem = toUnit.inventory.items[toIndex];

    // Direct swap
    if (fromItem && toItem) {
      fromUnit.inventory.removeAt(fromIndex);
      toUnit.inventory.removeAt(toIndex > fromIndex ? toIndex - 1 : toIndex);
      // Re-add in swapped order
      if (fromIndex <= toIndex) {
        fromUnit.inventory.add(toItem);
        toUnit.inventory.add(fromItem);
      } else {
        toUnit.inventory.add(fromItem);
        fromUnit.inventory.add(toItem);
      }
      return { success: true };
    }

    // Give fromUnit's item to toUnit
    if (fromItem && !toItem) {
      fromUnit.inventory.removeAt(fromIndex);
      toUnit.inventory.add(fromItem);
      return { success: true };
    }

    return { success: false, reason: 'No item to trade' };
  }
}
