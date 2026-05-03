import { Unit, Faction } from '../units/Unit';
import { Grid } from '../map/Grid';
import { WeaponData } from '../combat/Weapons';
import { calcDamage } from '../combat/Formulas';

/**
 * Score a potential target for the attacker.
 * Higher score = better target.
 *
 * Factors:
 * - Damage dealt
 * - Kill bonus (50) if damage >= target HP
 * - Damage already taken bonus: (maxHp - hp) * 2
 */
export function scoreTarget(attacker: Unit, target: Unit, weapon: WeaponData, grid: Grid): number {
  if (!target.isAlive) return 0;
  if (target.faction === attacker.faction) return 0;
  if (target.faction === Faction.ALLY) return 0;

  const atkStat = weapon.usesMagic ? attacker.stats.mag : attacker.stats.str;
  const defStat = weapon.usesMagic ? target.stats.res : target.stats.def;
  const targetTerrain = grid.getTerrainData(target.gridX, target.gridY);
  const effectiveDef = defStat + targetTerrain.defenseBonus;

  const damage = calcDamage(atkStat, weapon.mt, effectiveDef, weapon.usesMagic);

  let score = damage;

  if (damage >= target.stats.hp) {
    score += 50;
  }

  score += (target.stats.maxHp - target.stats.hp) * 2;

  return score;
}

/**
 * Pick the best target from a list. Returns null if no valid targets.
 */
export function pickBestTarget(
  attacker: Unit,
  targets: Unit[],
  weapon: WeaponData,
  grid: Grid,
): Unit | null {
  let best: Unit | null = null;
  let bestScore = 0;

  for (const target of targets) {
    const score = scoreTarget(attacker, target, weapon, grid);
    if (score > bestScore) {
      bestScore = score;
      best = target;
    }
  }

  return best;
}
