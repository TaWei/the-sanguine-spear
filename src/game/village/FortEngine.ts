import type { Unit } from '../units/Unit';
import { TerrainType } from '../map/Terrain';

export class FortEngine {
  /** Restore HP for units ending their turn on a fort tile */
  applyFortHealing(unit: Unit, terrain: TerrainType): number {
    if (terrain === TerrainType.FORT || terrain === TerrainType.GATE || terrain === TerrainType.THRONE) {
      const healAmount = Math.floor(unit.stats.maxHp * 0.2);
      const actualHeal = Math.min(healAmount, unit.stats.maxHp - unit.stats.hp);
      if (actualHeal > 0) {
        unit.heal(actualHeal);
      }
      return actualHeal;
    }
    return 0;
  }
}
