import type { Grid } from '../map/Grid';
import { ReinforcementGroup, type ReinforcementConfig } from './ReinforcementGroup';

export class ReinforcementEngine {
  private groups: ReinforcementGroup[] = [];

  register(configs: ReinforcementConfig[]): void {
    this.groups = configs.map(c => new ReinforcementGroup(c));
  }

  checkSpawn(turnNumber: number, isEnemyPhase: boolean, isAllyPhase: boolean): {
    group: ReinforcementGroup;
    units: import('./ReinforcementGroup').ReinforcementUnitDef[];
  }[] {
    const results: {
      group: ReinforcementGroup;
      units: import('./ReinforcementGroup').ReinforcementUnitDef[];
    }[] = [];

    for (const group of this.groups) {
      const faction = group.faction;
      // Enemy reinforcements spawn on enemy phase, ally on ally phase
      if (faction === 'enemy' && !isEnemyPhase) continue;
      if (faction === 'ally' && !isAllyPhase) continue;

      const units = group.checkSpawn(turnNumber);
      if (units.length > 0) {
        results.push({ group, units });
        group.markSpawned();
      }
    }

    return results;
  }

  /**
   * Find the nearest empty tile to the desired spawn position.
   */
  findSpawnTile(grid: Grid, desiredX: number, desiredY: number): { x: number; y: number } | null {
    if (!grid.isInBounds(desiredX, desiredY)) return null;
    if (!grid.getUnit(desiredX, desiredY)) return { x: desiredX, y: desiredY };

    // Search in expanding radius for an empty tile
    for (let r = 1; r <= 5; r++) {
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          if (Math.abs(dx) + Math.abs(dy) !== r) continue;
          const x = desiredX + dx;
          const y = desiredY + dy;
          if (grid.isInBounds(x, y) && !grid.getUnit(x, y)) {
            return { x, y };
          }
        }
      }
    }
    return null;
  }

  reset(): void {
    this.groups = [];
  }

  getSpawnedGroupIds(): string[] {
    return this.groups.filter(g => g.hasSpawned).map(g => g.config.groupId);
  }

  loadSpawnedGroupIds(ids: string[]): void {
    const spawnedSet = new Set(ids);
    for (const group of this.groups) {
      if (spawnedSet.has(group.config.groupId)) {
        group.markSpawned();
      }
    }
  }
}
