import { Unit } from '../units/Unit';
import { UnitStats } from '../units/Stats';
import { levelUp, LevelUpResult } from './LevelUpEngine';
import { CLASS_CAPS } from './StatCaps';

export interface ProgressionResult {
  expGained: number;
  leveledUp: boolean;
  levelUpResult?: LevelUpResult;
  oldStats?: UnitStats;
}

export class ProgressionEngine {
  grantExp(unit: Unit, amount: number, rng: () => number = Math.random): ProgressionResult {
    if (unit.isAtMaxLevel) {
      return { expGained: 0, leveledUp: false };
    }

    const previousExp = unit.exp;
    const totalExp = previousExp + amount;

    if (totalExp < 100) {
      unit.gainExp(amount);
      return { expGained: amount, leveledUp: false };
    }

    // Level up occurs
    const overflow = totalExp - 100;
    const caps = CLASS_CAPS[unit.unitClass];
    const oldStats = { ...unit.stats };

    const result = levelUp(unit.stats, unit.growthRates, caps, rng);
    unit.applyLevelUp(result.newStats);

    // After level-up, absorb overflow exp (but cap at 99 unless another level-up is desired)
    if (overflow > 0) {
      unit.gainExp(overflow);
    }

    return { expGained: amount, leveledUp: true, levelUpResult: result, oldStats };
  }
}
