import { Unit, UnitClass } from './Unit';

const MOUNTED: Set<UnitClass> = new Set([
  UnitClass.CAVALRY,
  UnitClass.PALADIN,
  UnitClass.PEGASUS_KNIGHT,
  UnitClass.FALCON_KNIGHT,
]);

export class RescueRules {
  static isMounted(unitClass: UnitClass): boolean {
    return MOUNTED.has(unitClass);
  }

  static canRescue(rescuer: Unit, target: Unit): boolean {
    // Basic checks
    if (!rescuer.isAlive || !target.isAlive) return false;
    if (target.isEnemy) return false;
    if (rescuer === target) return false;
    if (rescuer.isCarrying) return false;
    if (target.isRescued) return false;
    if (target.isCarrying) return false;

    // Must be mounted
    if (!this.isMounted(rescuer.unitClass)) return false;

    // Flying can rescue anyone; other mounted can only rescue foot units
    if (rescuer.isFlying) return true;

    return !this.isMounted(target.unitClass);
  }

  /** Like canRescue but skips isRescued check — used for give/take transfers. */
  static canCarry(rescuer: Unit, target: Unit): boolean {
    if (!rescuer.isAlive || !target.isAlive) return false;
    if (target.isEnemy) return false;
    if (rescuer === target) return false;
    if (rescuer.isCarrying) return false;
    if (target.isCarrying) return false;

    if (!this.isMounted(rescuer.unitClass)) return false;
    if (rescuer.isFlying) return true;
    return !this.isMounted(target.unitClass);
  }
}
