import type { Faction as FactionType } from '../units/Unit';

export interface ReinforcementUnitDef {
  id: string;
  name: string;
  unitClass: import('../units/UnitClass').UnitClass;
  stats: import('../units/Stats').UnitStats;
  spawnX: number;
  spawnY: number;
}

export interface ReinforcementConfig {
  groupId: string;
  spawnTurn: number;
  faction: FactionType;
  units: ReinforcementUnitDef[];
  oneShot: boolean;
}

export class ReinforcementGroup {
  config: ReinforcementConfig;
  private spawned = false;

  constructor(config: ReinforcementConfig) {
    this.config = config;
  }

  checkSpawn(turnNumber: number): ReinforcementUnitDef[] {
    if (this.spawned) return [];
    if (this.config.oneShot && this.spawned) return [];
    if (turnNumber < this.config.spawnTurn) return [];
    return this.config.units;
  }

  markSpawned(): void {
    this.spawned = true;
  }

  get hasSpawned(): boolean {
    return this.spawned;
  }

  get faction(): FactionType {
    return this.config.faction;
  }
}
