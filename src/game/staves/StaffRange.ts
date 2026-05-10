import { Unit } from '../units/Unit';
import { Grid } from '../map/Grid';
import { StaffData } from './Staves';
import { resolveStaffRange } from './StaffRangeResolver';

export function computeStaffRange(unit: Unit, grid: Grid, staff: StaffData): [number, number][] {
  const range: [number, number][] = [];
  const ux = unit.gridX;
  const uy = unit.gridY;
  const { min: minRange, max: maxRange } = resolveStaffRange(staff, unit);

  for (let dy = -maxRange; dy <= maxRange; dy++) {
    for (let dx = -maxRange; dx <= maxRange; dx++) {
      if (dx === 0 && dy === 0) continue;
      const dist = Math.abs(dx) + Math.abs(dy);
      if (dist < minRange || dist > maxRange) continue;
      const tx = ux + dx;
      const ty = uy + dy;
      if (grid.isInBounds(tx, ty)) {
        range.push([tx, ty]);
      }
    }
  }

  return range;
}
