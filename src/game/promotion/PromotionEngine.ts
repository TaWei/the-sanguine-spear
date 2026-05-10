import { Unit, UnitClass } from '../units/Unit';
import { UnitStats } from '../units/Stats';
import {
  getPromotedClass,
  CLASS_PROMO_BONUSES,
  PROMOTED_CLASS_BASES,
  PromoBonus,
} from './PromotionData';
import { CLASS_CAPS } from '../progression/StatCaps';

export interface PromotionResult {
  success: boolean;
  unitName: string;
  oldClass: UnitClass;
  newClass: string | null;
  oldStats: UnitStats;
  newStats: UnitStats;
  diff: Partial<Record<keyof UnitStats, number>>;
}

export class PromotionEngine {
  canPromote(unit: Unit, bypassLevel = false): boolean {
    if (unit.tier !== 'base') return false;
    if (!bypassLevel && unit.level < 10) return false;
    return getPromotedClass(unit.unitClass) !== null;
  }

  promote(unit: Unit, bypassLevel = false): PromotionResult {
    if (!this.canPromote(unit, bypassLevel)) {
      return {
        success: false,
        unitName: unit.name,
        oldClass: unit.unitClass,
        newClass: null,
        oldStats: unit.stats,
        newStats: unit.stats,
        diff: {},
      };
    }

    const promotedClass = getPromotedClass(unit.unitClass);
    if (!promotedClass) {
      return {
        success: false,
        unitName: unit.name,
        oldClass: unit.unitClass,
        newClass: null,
        oldStats: unit.stats,
        newStats: unit.stats,
        diff: {},
      };
    }

    const bonuses = CLASS_PROMO_BONUSES[promotedClass];
    const bases = PROMOTED_CLASS_BASES[promotedClass];
    const caps = CLASS_CAPS[promotedClass];

    const oldStats = { ...unit.stats };
    const newStats: UnitStats = { ...unit.stats };

    const statKeys = Object.keys(bonuses) as (keyof PromoBonus)[];
    for (const key of statKeys) {
      const bonus = (bonuses as unknown as Record<string, number>)[key];
      const baseMin = bases?.[key] ?? 0;

      let val = (newStats as unknown as Record<string, number>)[key] + bonus;
      if (baseMin > 0 && val < baseMin) {
        val = baseMin;
      }
      if (caps && val > (caps as unknown as Record<string, number>)[key]) {
        val = (caps as unknown as Record<string, number>)[key];
      }
      (newStats as unknown as Record<string, number>)[key] = val;
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
      unitName: unit.name,
      oldClass,
      oldStats,
      newClass: promotedClass,
      newStats,
      diff,
    };
  }
}
