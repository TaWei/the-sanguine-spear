import { Unit, Faction } from '../units/Unit';
import type { GamePhase } from '../state/TurnManager';
import type { ObjectiveResult } from './Objective';
import type { SeizeObjective } from './SeizeObjective';
import type { DefendObjective } from './DefendObjective';
import type { EscapeObjective } from './EscapeObjective';

export type { ObjectiveResult } from './Objective';

export interface LevelObjectivesConfig {
  /** Rout (defeat all enemies) is always active for victory unless disabled */
  routEnabled?: boolean;
  seize?: SeizeObjective;
  defend?: DefendObjective;
  escape?: EscapeObjective;
  allyMustSurvive?: boolean;
}

export class LevelObjectives {
  private units: Unit[];
  private config: LevelObjectivesConfig;

  constructor(units: Unit[], config: LevelObjectivesConfig = {}) {
    this.units = units;
    this.config = config;
  }

  check(turnNumber: number = 0, phase?: GamePhase): ObjectiveResult {
    // Check sub-objectives first — any defeat is immediate
    if (this.config.defend) {
      const result = this.config.defend.check(this.units, turnNumber, phase);
      if (result.defeat) return result;
      if (result.victory) return result;
    }

    // Rout and defeat conditions
    const routEnabled = this.config.routEnabled !== false;
    const livePlayers = this.units.filter((u) => u.faction === Faction.PLAYER && u.isAlive);
    const liveEnemies = this.units.filter((u) => u.faction === Faction.ENEMY && u.isAlive);

    // Defeat: all player units dead
    if (livePlayers.length === 0) {
      return { victory: false, defeat: true, ongoing: false, message: 'All player units have fallen...' };
    }

    // Ally survival check
    if (this.config.allyMustSurvive) {
      const liveAllies = this.units.filter((u) => u.faction === Faction.ALLY && u.isAlive);
      if (liveAllies.length === 0) {
        return { victory: false, defeat: true, ongoing: false, message: 'All allies have fallen...' };
      }
    }

    // Rout victory: all enemies dead (only if rout is enabled)
    if (routEnabled && liveEnemies.length === 0) {
      return { victory: true, defeat: false, ongoing: false, message: 'All enemies defeated!' };
    }

    return { victory: false, defeat: false, ongoing: true };
  }

  /** Check a move-based objective (seize/escape) for a unit that just moved */
  checkMoveObjective(unit: Unit): ObjectiveResult {
    if (this.config.seize) {
      const result = this.config.seize.check(unit);
      if (result.victory) return result;
    }
    if (this.config.escape) {
      const result = this.config.escape.check(unit);
      if (result.victory) return result;
    }
    return { victory: false, defeat: false, ongoing: true };
  }
}
