import { Unit } from '../units/Unit';
import { Inventory } from '../items/Inventory';
import { StaffData } from './Staves';

export interface StaffResult {
  healer: Unit;
  target: Unit;
  healedAmount: number;
  staffConsumed: boolean;
  expAward: number;
}

export class StaffEngine {
  resolve(
    healer: Unit,
    target: Unit,
    staff: StaffData,
    inventory: Inventory,
    staffIndex: number,
  ): StaffResult {
    const missingHp = target.stats.maxHp - target.stats.hp;
    const healedAmount = Math.min(staff.healAmount, missingHp);

    if (healedAmount > 0) {
      target.heal(healedAmount);
    }

    const { consumed } = inventory.useAt(staffIndex);
    const expAward = healedAmount > 0 ? 10 + Math.floor(healedAmount / 5) : 0;

    return {
      healer,
      target,
      healedAmount,
      staffConsumed: consumed,
      expAward,
    };
  }
}
