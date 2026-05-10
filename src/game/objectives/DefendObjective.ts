import type { Unit } from '../units/Unit';
import type { ObjectiveResult } from './Objective';

export class DefendObjective {
  private targetId: string;
  private requiredTurns: number;

  constructor(targetId: string, requiredTurns: number) {
    this.targetId = targetId;
    this.requiredTurns = requiredTurns;
  }

  check(allUnits: Unit[], turnNumber: number): ObjectiveResult {
    const target = allUnits.find(u => u.id === this.targetId);

    // If target is dead or missing, it's a defeat
    if (!target || !target.isAlive) {
      return { victory: false, defeat: true, ongoing: false };
    }

    // If survived the required number of turns, victory
    if (turnNumber >= this.requiredTurns) {
      return { victory: true, defeat: false, ongoing: false };
    }

    // Still defending
    return { victory: false, defeat: false, ongoing: true };
  }
}
