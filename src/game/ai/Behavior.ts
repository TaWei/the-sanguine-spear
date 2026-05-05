import { Unit } from '../units/Unit';

/**
 * Fire Emblem GBA-inspired AI behavior patterns.
 * These map closely to the AI1/AI2 byte combinations documented by the ROM hacking community.
 *
 * Reference:
 * - 0x00/0x00 = PURSUE (aggressive, move toward enemies, attack)
 * - 0x03/0x03 = GUARD (stand still, do nothing)
 * - 0x00/0x03 = ATTACK_IN_RANGE (attack if in range, otherwise don't move)
 * - 0x03/0x00 = BOSS_GUARD (don't move, but attack in range)
 * - 0x06/0x0C = THIEF (raid/escape behavior)
 * - AI3 recovery thresholds = RECOVER_MODE (retreat when HP low)
 * - 0x06/0x06 = EXPANDED_RANGE (activate when foe in move×2 range)
 */
export enum AiBehavior {
  /** Move toward and attack enemies. Classic grunt AI (AI1=0x00, AI2=0x00). */
  PURSUE = 'pursue',
  /** Attack only if target already in range; do not move to engage (AI1=0x03, AI2=0x03). */
  ATTACK_IN_RANGE = 'attack_in_range',
  /** Do not move, do not attack. Pure obstacle (AI1=0x06, AI2=0x03). */
  GUARD = 'guard',
  /** Do not move, but attack if something enters range (AI1=0x03, AI2=0x00-ish). */
  BOSS_GUARD = 'boss_guard',
  /** Retreat when HP is below threshold; seek healing (AI3 recovery mode). */
  RECOVER_MODE = 'recover_mode',
  /** Raid objective, then change to PURSUE (brigand/pirate AI). */
  THIEF = 'thief',
  /** Activate only when enemy enters expanded range (move × 2) (AI2=0x06). */
  EXPANDED_RANGE = 'expanded_range',
}

/** Recovery threshold: enter recovery mode when HP < 50%. Matches FE GBA default AI3=0x00. */
const RECOVERY_THRESHOLD = 0.5;

export function shouldPursue(behavior: AiBehavior, _unit: Unit): boolean {
  switch (behavior) {
    case AiBehavior.PURSUE:
    case AiBehavior.THIEF:
    case AiBehavior.EXPANDED_RANGE:
      return true;
    case AiBehavior.ATTACK_IN_RANGE:
    case AiBehavior.GUARD:
    case AiBehavior.BOSS_GUARD:
    case AiBehavior.RECOVER_MODE:
      return false;
  }
}

export function shouldAttackInRange(behavior: AiBehavior, _unit: Unit): boolean {
  switch (behavior) {
    case AiBehavior.PURSUE:
    case AiBehavior.ATTACK_IN_RANGE:
    case AiBehavior.BOSS_GUARD:
    case AiBehavior.THIEF:
    case AiBehavior.EXPANDED_RANGE:
      return true;
    case AiBehavior.GUARD:
    case AiBehavior.RECOVER_MODE:
      return false;
  }
}

export function shouldRetreat(behavior: AiBehavior, unit: Unit): boolean {
  if (behavior === AiBehavior.RECOVER_MODE) {
    return unit.stats.hp / unit.stats.maxHp < RECOVERY_THRESHOLD;
  }
  return false;
}

export function isStationary(behavior: AiBehavior): boolean {
  return behavior === AiBehavior.GUARD || behavior === AiBehavior.BOSS_GUARD;
}
