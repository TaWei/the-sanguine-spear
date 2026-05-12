import { Unit, Faction } from '../units/Unit';
import { Grid } from '../map/Grid';

export interface TradeResult {
  success: boolean;
  reason?: string;
}

export class TradeEngine {
  canTrade(unitA: Unit, unitB: Unit, grid: Grid): boolean {
    return TradeEngine.canTrade(unitA, unitB, grid);
  }

  trade(unitA: Unit, itemIndexA: number, unitB: Unit, itemIndexB: number): TradeResult {
    return TradeEngine.trade(unitA, itemIndexA, unitB, itemIndexB);
  }

  static canTrade(unitA: Unit, unitB: Unit, grid: Grid): boolean {
    if (unitA.faction === Faction.ENEMY || unitB.faction === Faction.ENEMY) {
      return false;
    }

    const dx = Math.abs(unitA.gridX - unitB.gridX);
    const dy = Math.abs(unitA.gridY - unitB.gridY);
    if (!((dx === 1 && dy === 0) || (dx === 0 && dy === 1))) {
      return false;
    }

    if (grid.getUnit(unitA.gridX, unitA.gridY) !== unitA) {
      return false;
    }
    if (grid.getUnit(unitB.gridX, unitB.gridY) !== unitB) {
      return false;
    }

    return true;
  }

  static trade(
    unitA: Unit,
    itemIndexA: number,
    unitB: Unit,
    itemIndexB: number,
  ): TradeResult {
    if (itemIndexA < -1 || itemIndexB < -1) {
      return { success: false, reason: 'invalid_index' };
    }

    const aHasItem = itemIndexA >= 0 && itemIndexA < unitA.inventory.size;
    const bHasItem = itemIndexB >= 0 && itemIndexB < unitB.inventory.size;

    // Swap
    if (itemIndexA >= 0 && itemIndexB >= 0) {
      if (!aHasItem || !bHasItem) {
        return { success: false, reason: 'invalid_index' };
      }
      const itemA = unitA.inventory.removeAt(itemIndexA);
      const itemB = unitB.inventory.removeAt(itemIndexB);
      const okA = unitA.inventory.insertAt(itemIndexA, itemB!);
      const okB = unitB.inventory.insertAt(itemIndexB, itemA!);
      if (!okA || !okB) {
        // Rollback: restore items to their original owners
        if (okA) unitA.inventory.removeAt(itemIndexA);
        if (okB) unitB.inventory.removeAt(itemIndexB);
        unitA.inventory.add(itemA!);
        unitB.inventory.add(itemB!);
        return { success: false, reason: 'invalid_index' };
      }
      return { success: true };
    }

    // A gives to B
    if (itemIndexA >= 0 && itemIndexB === -1) {
      if (!aHasItem) {
        return { success: false, reason: 'no_item' };
      }
      if (unitB.inventory.isFull) {
        return { success: false, reason: 'inventory_full' };
      }
      const item = unitA.inventory.removeAt(itemIndexA);
      unitB.inventory.add(item!);
      return { success: true };
    }

    // A receives from B
    if (itemIndexA === -1 && itemIndexB >= 0) {
      if (!bHasItem) {
        return { success: false, reason: 'no_item' };
      }
      if (unitA.inventory.isFull) {
        return { success: false, reason: 'inventory_full' };
      }
      const item = unitB.inventory.removeAt(itemIndexB);
      unitA.inventory.add(item!);
      return { success: true };
    }

    // Both -1 or other invalid combination
    return { success: false, reason: 'invalid_trade' };
  }
}
