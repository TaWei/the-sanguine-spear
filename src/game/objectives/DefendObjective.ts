import type { GamePhase } from '../state/TurnManager';
import type { Unit } from '../units/Unit';
import type { ObjectiveResult } from './Objective';

export class DefendObjective {
  private targetId: string;
  private requiredTurns: number;

  constructor(targetId: string, requiredTurns: number) {
    this.targetId = targetId;
    this.requiredTurns = requiredTurns;
  }

  check(allUnits: Unit[], turnNumber: number, phase?: GamePhase): ObjectiveResult {
    const target = allUnits.find(u => u.id === this.targetId);

    // If target is dead or missing, it's a defeat
    if (!target || !target.isAlive) {
      return { victory: false, defeat: true, ongoing: false, message: 'The defended unit has fallen!' };
    }

    // Victory only fires during enemy phase (or when phase is omitted for backwards compatibility)
    if (turnNumber >= this.requiredTurns && phase !== 'player') {
      return { victory: true, defeat: false, ongoing: false, message: 'Defended for the required turns!' };
    }

    // Still defending
    return { victory: false, defeat: false, ongoing: true };
  }
}
