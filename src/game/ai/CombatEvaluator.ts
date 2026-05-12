import { Unit } from '../units/Unit';
import { Grid } from '../map/Grid';
import { WeaponData } from '../combat/Weapons';
import { calcDamage } from '../combat/Formulas';

export interface CombatScore {
  /** Damage attacker deals to defender (before counter) */
  attackerDamage: number;
  /** Damage defender deals back on counterattack */
  counterDamage: number;
  /** Net expected damage (attackerDamage - counterDamage) */
  netDamage: number;
  /** True if attackerDamage >= defender current HP */
  canKill: boolean;
  /** 0-100 estimate of how dangerous this engagement is for the attacker */
  survivalRisk: number;
}

/**
 * Evaluate a combat engagement from the attacker's perspective.
 * Simulates both the attack and a potential counterattack.
 *
 * @param attacker       The unit initiating combat
 * @param defender       The target unit
 * @param attackerWeapon Weapon the attacker will use
 * @param grid           The game grid (for terrain defense bonuses)
 * @param defenderWeapon Weapon the defender would counter with (optional)
 */
export function evaluateCombat(
  attacker: Unit,
  defender: Unit,
  attackerWeapon: WeaponData,
  grid: Grid,
  defenderWeapon?: WeaponData,
): CombatScore {
  if (!defender.isAlive) {
    return { attackerDamage: 0, counterDamage: 0, netDamage: 0, canKill: false, survivalRisk: 0 };
  }

  // Attacker's strike
  const atkStat = attackerWeapon.usesMagic ? attacker.stats.mag : attacker.stats.str;
  const defTerrain = grid.getTerrainData(defender.gridX, defender.gridY);
  const defDefStat = attackerWeapon.usesMagic
    ? defender.stats.res + defTerrain.defenseBonus
    : defender.stats.def + defTerrain.defenseBonus;
  const attackerDamage = calcDamage(atkStat, attackerWeapon.mt, defDefStat, attackerWeapon.usesMagic);

  // Counterattack (only if defender has a weapon and is in range)
  let counterDamage = 0;
  if (
    defenderWeapon &&
    typeof defenderWeapon.mt === 'number' &&
    typeof defenderWeapon.minRange === 'number' &&
    typeof defenderWeapon.maxRange === 'number' &&
    typeof defenderWeapon.usesMagic === 'boolean'
  ) {
    const dist = Math.abs(attacker.gridX - defender.gridX) + Math.abs(attacker.gridY - defender.gridY);
    if (dist >= defenderWeapon.minRange && dist <= defenderWeapon.maxRange) {
      const defAtkStat = defenderWeapon.usesMagic ? defender.stats.mag : defender.stats.str;
      const attTerrain = grid.getTerrainData(attacker.gridX, attacker.gridY);
      const attDefStat = defenderWeapon.usesMagic
        ? attacker.stats.res + attTerrain.defenseBonus
        : attacker.stats.def + attTerrain.defenseBonus;
      counterDamage = calcDamage(defAtkStat, defenderWeapon.mt, attDefStat, defenderWeapon.usesMagic);
    }
  }

  const netDamage = attackerDamage - counterDamage;
  const canKill = attackerDamage >= defender.stats.hp;

  // Survival risk: percentage of attacker max HP that counter could consume
  const rawRisk = attacker.stats.maxHp > 0 ? (counterDamage / attacker.stats.maxHp) * 100 : 0;
  const survivalRisk = Math.min(100, Math.max(0, rawRisk));

  return { attackerDamage, counterDamage, netDamage, canKill, survivalRisk };
}
