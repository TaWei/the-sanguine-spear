import { Unit, Faction } from '../units/Unit';
import { Grid } from '../map/Grid';
import { WeaponData } from '../combat/Weapons';
import { evaluateCombat } from './CombatEvaluator';
import { scoreAction, AiPersonality } from './Personality';

export { AiPersonality } from './Personality';

export interface TargetScore {
  target: Unit;
  actionScore: number;
}

/**
 * Score a potential target for the attacker.
 * Higher score = better target.
 *
 * Replacement for the old damage-only scoring.
 * Now simulates full combat (attack + counter) and applies personality weighting.
 *
 * @param attacker       The enemy unit evaluating targets
 * @param target         A candidate target
 * @param weapon         Attacker's weapon
 * @param grid           Game grid
 * @param personality    AI personality driving decision weights
 * @param targetWeapon   Optional: weapon the target would counter with
 */
export function scoreTarget(
  attacker: Unit,
  target: Unit,
  weapon: WeaponData,
  grid: Grid,
  personality: AiPersonality = AiPersonality.BALANCED,
  targetWeapon?: WeaponData,
): number {
  if (!target.isAlive) {
    return 0;
  }
  if (target.faction === attacker.faction) {
    return 0;
  }
  if (target.faction === Faction.ALLY) {
    return 0;
  }

  const combat = evaluateCombat(attacker, target, weapon, grid, targetWeapon);

  // Bonus for already-damaged targets (finish them off)
  const woundedBonus = (target.stats.maxHp - target.stats.hp) * 2;

  const actionScore = scoreAction(combat, personality);
  return actionScore + woundedBonus;
}

/**
 * Pick the best target from a list. Returns null if no valid targets.
 */
export function pickBestTarget(
  attacker: Unit,
  targets: Unit[],
  weapon: WeaponData,
  grid: Grid,
  personality: AiPersonality = AiPersonality.BALANCED,
  targetWeaponResolver?: (unit: Unit) => WeaponData | undefined,
): Unit | null {
  let best: Unit | null = null;
  let bestScore = -Infinity;

  for (const target of targets) {
    const targetWeapon = targetWeaponResolver ? targetWeaponResolver(target) : undefined;
    const score = scoreTarget(attacker, target, weapon, grid, personality, targetWeapon);
    if (score > bestScore) {
      bestScore = score;
      best = target;
    }
  }

  return best;
}
