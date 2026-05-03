import { Unit, Faction } from '../units/Unit';

export interface ObjectiveResult {
  victory: boolean;
  defeat: boolean;
  ongoing: boolean;
}

export class LevelObjectives {
  constructor(private units: Unit[]) {}

  check(): ObjectiveResult {
    const livePlayers = this.units.filter((u) => u.faction === Faction.PLAYER && u.isAlive);
    const liveEnemies = this.units.filter((u) => u.faction === Faction.ENEMY && u.isAlive);

    const victory = liveEnemies.length === 0;
    const defeat = livePlayers.length === 0;
    const ongoing = !victory && !defeat;

    return { victory, defeat, ongoing };
  }
}
