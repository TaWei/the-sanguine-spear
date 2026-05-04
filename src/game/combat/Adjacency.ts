import { Unit, Faction } from '../units/Unit';
import { Grid } from '../map/Grid';
import { WeaponData } from './Weapons';

export function getAdjacentEnemies(unit: Unit, grid: Grid, weapon: WeaponData): Unit[] {
  const enemies: Unit[] = [];
  const minR = weapon.minRange;
  const maxR = weapon.maxRange;

  for (let dy = -maxR; dy <= maxR; dy++) {
    for (let dx = -maxR; dx <= maxR; dx++) {
      if (dx === 0 && dy === 0) {
        continue;
      }
      const dist = Math.abs(dx) + Math.abs(dy);
      if (dist < minR || dist > maxR) {
        continue;
      }

      const other = grid.getUnit(unit.gridX + dx, unit.gridY + dy);
      if (other?.faction === Faction.ENEMY && other.isAlive) {
        enemies.push(other);
      }
    }
  }

  return enemies;
}
