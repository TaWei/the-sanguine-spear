import { Faction } from '../units/Unit';
import type { Unit } from '../units/Unit';
import type { ObjectiveResult } from './Objective';

export class SeizeObjective {
  private tiles: { x: number; y: number; seized: boolean }[];

  constructor(tiles: { x: number; y: number }[]) {
    this.tiles = tiles.map((t) => ({ ...t, seized: false }));
  }

  /** Check if the given unit (which just moved) fulfills the seize condition */
  check(unit: Unit): ObjectiveResult {
    if (
      unit.unitClass === 'lord' &&
      unit.isAlive &&
      (unit.faction === Faction.PLAYER || unit.faction === Faction.ALLY)
    ) {
      const tile = this.tiles.find(
        (t) => t.x === unit.gridX && t.y === unit.gridY && !t.seized,
      );
      if (tile) {
        tile.seized = true;
      }
    }
    if (this.tiles.every((t) => t.seized)) {
      return { victory: true, defeat: false, ongoing: false };
    }
    return { victory: false, defeat: false, ongoing: true };
  }
}
