import { Unit } from '../units/Unit';
import type { Item } from '../items/ItemTypes';

export class StealRules {
  /** Check if thief can steal from target. Thief must be faster, have room, target must have items. */
  static canSteal(thief: Unit, target: Unit): boolean {
    if (!thief.isAlive || !target.isAlive) return false;
    if (thief.unitClass !== 'thief') return false;
    if (target.faction === 'player' || target.faction === 'ally') return false;
    if (thief.stats.spd <= target.stats.spd) return false;
    if (target.inventory.items.length === 0) return false;
    if (thief.inventory.isFull) return false;
    return true;
  }

  /** Execute steal: move item at itemIndex from target to thief. */
  static steal(thief: Unit, target: Unit, itemIndex: number): Item {
    if (!this.canSteal(thief, target)) throw new Error('Cannot steal');
    if (itemIndex < 0 || itemIndex >= target.inventory.items.length) {
      throw new Error('Invalid item index');
    }
    const item = target.inventory.removeAt(itemIndex);
    if (!item) throw new Error('Failed to remove item from target');
    const added = thief.inventory.add(item);
    if (!added) {
      // Put it back
      target.inventory.insertAt(itemIndex, item);
      throw new Error('Thief inventory full');
    }
    return item;
  }

  /** Get indices of stealable items (all items in target inventory). */
  static getStealableIndices(thief: Unit, target: Unit): number[] {
    if (!this.canSteal(thief, target)) return [];
    return target.inventory.items.map((_: Item, i: number) => i);
  }
}
