import { StaffData } from './Staves';
import { Unit } from '../units/Unit';

export interface StaffRange {
  min: number;
  max: number;
}

export function resolveStaffRange(staff: StaffData, caster: Unit): StaffRange {
  if (staff.getRange) {
    return staff.getRange(caster);
  }
  return { min: staff.minRange, max: staff.maxRange };
}
