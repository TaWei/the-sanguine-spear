import { Unit, Faction } from '../units/Unit';
import { Grid } from '../map/Grid';
import { StaffData } from './Staves';
import { resolveStaffRange } from './StaffRangeResolver';

function isFriendlyTo(a: typeof Faction[keyof typeof Faction], b: typeof Faction[keyof typeof Faction]): boolean {
  if (a === Faction.ENEMY) return b === Faction.ENEMY;
  return b === Faction.PLAYER || b === Faction.ALLY;
}

export function getHealTargets(healer: Unit, grid: Grid, staff: StaffData): Unit[] {
  const targets: Unit[] = [];
  const { min: minR, max: maxR } = resolveStaffRange(staff, healer);

  for (let dy = -maxR; dy <= maxR; dy++) {
    for (let dx = -maxR; dx <= maxR; dx++) {
      if (dx === 0 && dy === 0) continue;
      const dist = Math.abs(dx) + Math.abs(dy);
      if (dist < minR || dist > maxR) continue;

      const other = grid.getUnit(healer.gridX + dx, healer.gridY + dy);
      if (other && other !== healer && other.isAlive && isFriendlyTo(healer.faction, other.faction)) {
        targets.push(other);
      }
    }
  }

  return targets;
}
