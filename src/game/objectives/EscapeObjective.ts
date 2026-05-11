import type { Unit } from '../units/Unit';
import type { ObjectiveResult } from './Objective';

export class EscapeObjective {
  private escapeUnitId: string;
  private escapeTiles: { x: number; y: number }[];

  constructor(escapeUnitId: string, escapeTiles: { x: number; y: number }[]) {
    this.escapeUnitId = escapeUnitId;
    this.escapeTiles = escapeTiles;
  }

  /** Check if the given unit (which just moved) fulfills the escape condition */
  check(unit: Unit): ObjectiveResult {
    if (
      unit.id === this.escapeUnitId &&
      unit.isAlive &&
      this.escapeTiles.some((t) => t.x === unit.gridX && t.y === unit.gridY)
    ) {
      return { victory: true, defeat: false, ongoing: false, message: 'Escaped with the secret report!' };
    }
    return { victory: false, defeat: false, ongoing: true };
  }
}
