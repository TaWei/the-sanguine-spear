import { Unit, Faction } from '../units/Unit';
import { Grid } from '../map/Grid';
import { WeaponData } from './Weapons';

function isHostileTo(a: typeof Faction[keyof typeof Faction], b: typeof Faction[keyof typeof Faction]): boolean {
  if (a === Faction.ENEMY) return b === Faction.PLAYER || b === Faction.ALLY;
  return b === Faction.ENEMY;
}

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
      if (other && other.isAlive && isHostileTo(unit.faction, other.faction)) {
        enemies.push(other);
      }
    }
  }

  return enemies;
}
