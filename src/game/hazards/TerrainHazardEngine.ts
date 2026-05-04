import { Grid } from '../map/Grid';
import { Unit } from '../units/Unit';

export interface HazardDamage {
  unit: Unit;
  damage: number;
  terrain: string;
}

export interface HazardReport {
  damagedUnits: HazardDamage[];
}

export class TerrainHazardEngine {
  computeHazardDamage(unit: Unit, grid: Grid): number {
    const terrainData = grid.getTerrainData(unit.gridX, unit.gridY);
    const hazardDamage = terrainData.hazardDamage ?? 0;
    if (hazardDamage <= 0) {
      return 0;
    }
    return Math.min(hazardDamage, unit.stats.hp);
  }

  applyHazards(units: Unit[], grid: Grid): HazardReport {
    const damagedUnits: HazardDamage[] = [];
    for (const unit of units) {
      if (!unit.isAlive) {
        continue;
      }
      const damage = this.computeHazardDamage(unit, grid);
      if (damage > 0) {
        const terrain = grid.getTerrain(unit.gridX, unit.gridY);
        unit.takeDamage(damage);
        damagedUnits.push({ unit, damage, terrain });
      }
    }
    return { damagedUnits };
  }
}
