import { Unit } from '../units/Unit';
import { Grid } from '../map/Grid';
import { StaffData } from './Staves';

export function computeStaffRange(unit: Unit, grid: Grid, staff: StaffData): [number, number][] {
  const range: [number, number][] = [];
  const ux = unit.gridX;
  const uy = unit.gridY;

  for (let dy = -staff.maxRange; dy <= staff.maxRange; dy++) {
    for (let dx = -staff.maxRange; dx <= staff.maxRange; dx++) {
      if (dx === 0 && dy === 0) continue;
      const dist = Math.abs(dx) + Math.abs(dy);
      if (dist < staff.minRange || dist > staff.maxRange) continue;
      const tx = ux + dx;
      const ty = uy + dy;
      if (grid.isInBounds(tx, ty)) {
        range.push([tx, ty]);
      }
    }
  }

  return range;
}
