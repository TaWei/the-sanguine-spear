import { Unit } from '../units/Unit';
import { Grid } from '../map/Grid';
import { WeaponData } from './Weapons';

export function computeAttackRange(unit: Unit, grid: Grid, weapon: WeaponData): [number, number][] {
  const range: [number, number][] = [];
  const ux = unit.gridX;
  const uy = unit.gridY;

  for (let dy = -weapon.maxRange; dy <= weapon.maxRange; dy++) {
    for (let dx = -weapon.maxRange; dx <= weapon.maxRange; dx++) {
      const dist = Math.abs(dx) + Math.abs(dy);
      if (dist < weapon.minRange || dist > weapon.maxRange) continue;
      const tx = ux + dx;
      const ty = uy + dy;
      if (grid.isInBounds(tx, ty)) {
        range.push([tx, ty]);
      }
    }
  }

  return range;
}
