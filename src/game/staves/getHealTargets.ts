import { Unit, Faction } from '../units/Unit';
import { Grid } from '../map/Grid';
import { StaffData } from './Staves';

export function getHealTargets(healer: Unit, grid: Grid, staff: StaffData): Unit[] {
  const targets: Unit[] = [];
  const minR = staff.minRange;
  const maxR = staff.maxRange;

  for (let dy = -maxR; dy <= maxR; dy++) {
    for (let dx = -maxR; dx <= maxR; dx++) {
      if (dx === 0 && dy === 0) continue;
      const dist = Math.abs(dx) + Math.abs(dy);
      if (dist < minR || dist > maxR) continue;

      const other = grid.getUnit(healer.gridX + dx, healer.gridY + dy);
      if (other && other !== healer && other.isAlive && other.faction !== Faction.ENEMY) {
        targets.push(other);
      }
    }
  }

  return targets;
}
