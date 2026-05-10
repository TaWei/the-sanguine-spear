import type { Unit } from '../units/Unit';
import type { Grid } from '../map/Grid';

export interface ObjectiveResult {
  victory: boolean;
  defeat: boolean;
  ongoing: boolean;
}

export interface Objective {
  /** Check this objective against current game state */
  check(allUnits: Unit[], grid: Grid, turnNumber: number): ObjectiveResult;
}
