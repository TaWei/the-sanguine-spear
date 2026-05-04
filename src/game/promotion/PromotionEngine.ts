import { Unit, UnitClass } from '../units/Unit';
import { UnitStats } from '../units/Stats';
import { getPromotedClass, CLASS_PROMO_BONUSES, PROMOTED_CLASS_BASES } from './PromotionData';
import { CLASS_CAPS } from '../progression/StatCaps';

export interface PromotionResult {
  success: boolean;
  oldClass: UnitClass;
  newClass: string | null;
  newStats: UnitStats;
  diff: Partial<Record<keyof UnitStats, number>>;
}

export class PromotionEngine {
  canPromote(unit: Unit): boolean {
    if (unit.tier !== 'base') return false;
    if (unit.level < 10) return false;
    return getPromotedClass(unit.unitClass) !== null;
  }

  promote(unit: Unit): PromotionResult {
    if (!this.canPromote(unit)) {
      return { success: false, oldClass: unit.unitClass, newClass: null, newStats: unit.stats, diff: {} };
    }

    const promotedClass = getPromotedClass(unit.unitClass);
    if (!promotedClass) {
      return { success: false, oldClass: unit.unitClass, newClass: null, newStats: unit.stats, diff: {} };
    }

    const bonuses = CLASS_PROMO_BONUSES[promotedClass];
    const bases = PROMOTED_CLASS_BASES[promotedClass];
    const caps = CLASS_CAPS[promotedClass];

    const oldStats = { ...unit.stats };
    const newStats: UnitStats = { ...unit.stats };

    const statKeys = Object.keys(bonuses) as (keyof UnitStats)[];
    for (const key of statKeys) {
      const bonus = bonuses[key];
      const baseMin = bases?.[key] ?? 0;

      let val = newStats[key] + bonus;
      if (baseMin > 0 && val < baseMin) {
        val = baseMin;
      }
      if (caps && val > caps[key]) {
        val = caps[key];
      }
      (newStats as Record<keyof UnitStats, number>)[key] = val;
    }

    // Ensure maxHp tracks hp changes
    if (newStats.hp !== oldStats.hp) {
      newStats.maxHp = newStats.hp;
    }

    const diff: Partial<Record<keyof UnitStats, number>> = {};
    for (const key of statKeys) {
      const d = newStats[key] - oldStats[key];
      if (d !== 0) diff[key] = d;
    }

    const oldClass = unit.unitClass;
    unit.applyPromotion(promotedClass as UnitClass, newStats);

    return {
      success: true,
      oldClass,
      newClass: promotedClass,
      newStats,
      diff,
    };
  }
}
