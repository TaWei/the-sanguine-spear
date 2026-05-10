import { Unit } from '../units/Unit';
import type { Grid } from './Grid';
import type { Item } from '../items/ItemTypes';

export class DoorChestEngine {
  /** Check if unit can open a door at (x, y). Must be adjacent. */
  canOpenDoor(unit: Unit, grid: Grid, x: number, y: number): boolean {
    if (!unit.isAlive) return false;
    if (grid.getTerrain(x, y) !== 'door') return false;
    if (!this.isAdjacent(unit, x, y)) return false;
    // Thief opens doors without key (Lockpick)
    if (unit.unitClass === 'thief') return true;
    return this.hasKey(unit, 'Door Key');
  }

  /** Open a door. Consumes key if not Thief. Changes terrain to plains. */
  openDoor(grid: Grid, unit: Unit, x: number, y: number): void {
    if (!this.canOpenDoor(unit, grid, x, y)) {
      throw new Error('Cannot open door');
    }
    // Consume key if not thief
    if (unit.unitClass !== 'thief') {
      this.consumeKey(unit, 'Door Key');
    }
    grid.setTerrain(x, y, 'plains');
  }

  /** Check if unit can open a chest at (x, y). Must be standing on the chest tile. */
  canOpenChest(unit: Unit, grid: Grid, x: number, y: number): boolean {
    if (!unit.isAlive) return false;
    if (grid.getTerrain(x, y) !== 'chest') return false;
    // Must be on the chest tile
    if (unit.gridX !== x || unit.gridY !== y) return false;
    // Thief opens chests without key
    if (unit.unitClass === 'thief') return true;
    return this.hasKey(unit, 'Chest Key');
  }

  /** Open a chest. Consumes key if not Thief. Changes terrain to plains. Returns null (chest contents defined per-level later). */
  openChest(grid: Grid, unit: Unit, x: number, y: number): void {
    if (!this.canOpenChest(unit, grid, x, y)) {
      throw new Error('Cannot open chest');
    }
    if (unit.unitClass !== 'thief') {
      this.consumeKey(unit, 'Chest Key');
    }
    grid.setTerrain(x, y, 'plains');
  }

  private isAdjacent(unit: Unit, x: number, y: number): boolean {
    const dx = Math.abs(unit.gridX - x);
    const dy = Math.abs(unit.gridY - y);
    return (dx + dy) === 1;
  }

  private hasKey(unit: Unit, keyName: string): boolean {
    return unit.inventory.items.some((i) => i.kind === 'key' && i.name === keyName);
  }

  private consumeKey(unit: Unit, keyName: string): void {
    const index = unit.inventory.items.findIndex(
      (i: Item) => i.kind === 'key' && i.name === keyName,
    );
    if (index !== -1) {
      unit.inventory.removeAt(index);
    }
  }
}
