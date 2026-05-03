import { Unit } from '../units/Unit';
import { Grid } from '../map/Grid';
import { WeaponData, getWeaponTriangleMod } from './Weapons';
import {
  calcHitRate,
  calcAvoid,
  calcDisplayHit,
  calcCritRate,
  calcCritAvoid,
  calcDamage,
  rollTrueHit,
  rollCrit,
} from './Formulas';

export interface CombatLogEntry {
  attacker: Unit;
  defender: Unit;
  hit: boolean;
  critical: boolean;
  damage: number;
  displayHit: number;
  displayCrit: number;
}

export interface CombatResult {
  log: CombatLogEntry[];
  attackerDied: boolean;
  defenderDied: boolean;
}

export class CombatEngine {
  private grid: Grid;

  constructor(grid: Grid) {
    this.grid = grid;
  }

  resolveCombat(
    attacker: Unit,
    defender: Unit,
    attackerWeapon: WeaponData,
    defenderWeapon: WeaponData,
    rng: () => number = Math.random,
  ): CombatResult {
    const log: CombatLogEntry[] = [];
    const attackerDied = false;

    // Resolve one attack
    const entry = this.resolveAttack(attacker, defender, attackerWeapon, defenderWeapon, rng);
    log.push(entry);
    if (!defender.isAlive) {
      return { log, attackerDied, defenderDied: true };
    }

    // Defender counterattack if in range
    if (
      this.isInRange(defender.gridX, defender.gridY, attacker.gridX, attacker.gridY, defenderWeapon)
    ) {
      const counter = this.resolveAttack(defender, attacker, defenderWeapon, attackerWeapon, rng);
      log.push(counter);
      return { log, attackerDied: !attacker.isAlive, defenderDied: !defender.isAlive };
    }

    return { log, attackerDied: false, defenderDied: false };
  }

  private resolveAttack(
    attacker: Unit,
    defender: Unit,
    weapon: WeaponData,
    defenderWeapon: WeaponData,
    rng: () => number,
  ): CombatLogEntry {
    const attStats = attacker.stats;
    const defStats = defender.stats;

    // Triangle modifier
    const triangle = getWeaponTriangleMod(weapon.type, defenderWeapon.type);

    // Hit calculation
    const hitRate = calcHitRate(weapon.hit, attStats.skl, attStats.luk) + triangle.hitBonus;
    const terrainData = this.grid.getTerrainData(defender.gridX, defender.gridY);
    const avoid = calcAvoid(defStats.spd, defStats.luk, terrainData.avoidBonus);
    const displayHit = calcDisplayHit(hitRate, avoid);
    const hit = rollTrueHit(displayHit, rng);

    let damage = 0;
    let critical = false;
    let displayCrit = 0;

    if (hit) {
      // Damage
      const atkStat = weapon.usesMagic ? attStats.mag : attStats.str;
      const defStat = weapon.usesMagic ? defStats.res : defStats.def;
      damage = calcDamage(atkStat, weapon.mt + triangle.mtBonus, defStat, weapon.usesMagic);

      // Crit
      const critRate = calcCritRate(weapon.crit, attStats.skl);
      const critAvoid = calcCritAvoid(defStats.luk);
      displayCrit = Math.max(0, critRate - critAvoid);
      critical = rollCrit(displayCrit, rng);
      if (critical) {
        damage *= 3;
      }

      // Apply damage
      defender.takeDamage(damage);
    }

    return { attacker, defender, hit, critical, damage, displayHit, displayCrit };
  }

  private isInRange(ax: number, ay: number, bx: number, by: number, weapon: WeaponData): boolean {
    const dist = Math.abs(ax - bx) + Math.abs(ay - by);
    return dist >= weapon.minRange && dist <= weapon.maxRange;
  }
}
