import { Unit } from '../units/Unit';

export interface StaffData {
  name: string;
  healAmount: number;
  minRange: number;
  maxRange: number;
  /** Optional: compute range dynamically based on caster stats.
   *  If absent, minRange/maxRange are used as-is.
   *  Example: Physic uses Mag/2 for range. */
  getRange?: (caster: Unit) => { min: number; max: number };
}

export const STAFF_DB: Record<string, StaffData> = {
  Heal: {
    name: 'Heal',
    healAmount: 10,
    minRange: 1,
    maxRange: 1,
  },
  Mend: {
    name: 'Mend',
    healAmount: 20,
    minRange: 1,
    maxRange: 1,
  },
  Physic: {
    name: 'Physic',
    healAmount: 10,
    minRange: 1,
    maxRange: 99, // placeholder; dynamic range overrides this
    getRange: (caster: Unit) => ({
      min: 1,
      max: Math.max(1, Math.floor(caster.stats.mag / 2)),
    }),
  },
};
