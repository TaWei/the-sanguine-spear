import type { Unit } from '../units/Unit';
import type { ObjectiveResult } from './Objective';

export class EscapeObjective {
  private escapeUnitId: string;
  private escapeX: number;
  private escapeY: number;

  constructor(escapeUnitId: string, escapeX: number, escapeY: number) {
    this.escapeUnitId = escapeUnitId;
    this.escapeX = escapeX;
    this.escapeY = escapeY;
  }

  /** Check if the given unit (which just moved) fulfills the escape condition */
  check(unit: Unit): ObjectiveResult {
    if (
      unit.id === this.escapeUnitId &&
      unit.gridX === this.escapeX &&
      unit.gridY === this.escapeY &&
      unit.isAlive
    ) {
      return { victory: true, defeat: false, ongoing: false };
    }
    return { victory: false, defeat: false, ongoing: true };
  }
}
