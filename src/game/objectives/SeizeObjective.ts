import { Faction } from '../units/Unit';
import type { Unit } from '../units/Unit';
import type { ObjectiveResult } from './Objective';

export class SeizeObjective {
  private tiles: { x: number; y: number; seized: boolean }[];

  constructor(tiles: { x: number; y: number }[]) {
    this.tiles = tiles.map((t) => ({ ...t, seized: false }));
  }

  getSeizedTiles(): { x: number; y: number }[] {
    return this.tiles.filter((t) => t.seized).map((t) => ({ x: t.x, y: t.y }));
  }

  setSeizedTiles(coords: { x: number; y: number }[]): void {
    for (const tile of this.tiles) {
      tile.seized = coords.some((c) => c.x === tile.x && c.y === tile.y);
    }
  }

  /** Check if the given unit (which just moved) fulfills the seize condition */
  check(unit: Unit): ObjectiveResult {
    if (
      (unit.faction === Faction.PLAYER || unit.faction === Faction.ALLY) &&
      unit.isAlive
    ) {
      const tile = this.tiles.find(
        (t) => t.x === unit.gridX && t.y === unit.gridY && !t.seized,
      );
      if (tile) {
        tile.seized = true;
      }
    }
    if (this.tiles.every((t) => t.seized)) {
      return { victory: true, defeat: false, ongoing: false, message: 'Seized the throne!' };
    }
    return { victory: false, defeat: false, ongoing: true };
  }
}
