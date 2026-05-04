import { Unit } from '../units/Unit';
import { Grid } from '../map/Grid';
import { WeaponData, getWeaponTriangleMod } from './Weapons';

export function calcCombatExp(
  attackerLevel: number,
  defenderLevel: number,
  hit: boolean,
  killed: boolean,
): number {
  if (!hit) {
    return 0;
  }

  const levelDiff = defenderLevel - attackerLevel;
  const hitExp = Math.max(1, Math.floor((31 + levelDiff) / 3));

  if (!killed) {
    return hitExp;
  }

  const killBonus = Math.max(0, levelDiff * 3 + 20);
  return hitExp + killBonus;
}
import {
  calcHitRate,
  calcAvoid,
  calcDisplayHit,
  calcCritRate,
  calcCritAvoid,
  calcDisplayCrit,
  getClassCritBonus,
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
  expAward: number;
}

export interface AttackPreview {
  hit: number;
  crit: number;
  damage: number;
  doubleAttack: boolean;
}

export interface CombatPreview {
  attacker: AttackPreview;
  defender: AttackPreview | null;
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
    let expAward = calcCombatExp(attacker.level, defender.level, entry.hit, !defender.isAlive);

    if (!defender.isAlive) {
      return { log, attackerDied, defenderDied: true, expAward };
    }

    // Defender counterattack if in range
    if (
      this.isInRange(defender.gridX, defender.gridY, attacker.gridX, attacker.gridY, defenderWeapon)
    ) {
      const counter = this.resolveAttack(defender, attacker, defenderWeapon, attackerWeapon, rng);
      log.push(counter);
      if (!attacker.isAlive) {
        expAward = 0; // attacker died, no EXP
      }
      return { log, attackerDied: !attacker.isAlive, defenderDied: !defender.isAlive, expAward };
    }

    return { log, attackerDied: false, defenderDied: false, expAward };
  }

  previewCombat(
    attacker: Unit,
    defender: Unit,
    attackerWeapon: WeaponData,
    defenderWeapon: WeaponData,
  ): CombatPreview {
    const attackerPreview = this.previewAttack(attacker, defender, attackerWeapon, defenderWeapon);

    let defenderPreview: AttackPreview | null = null;
    if (
      this.isInRange(defender.gridX, defender.gridY, attacker.gridX, attacker.gridY, defenderWeapon)
    ) {
      defenderPreview = this.previewAttack(defender, attacker, defenderWeapon, attackerWeapon);
    }

    return { attacker: attackerPreview, defender: defenderPreview };
  }

  private previewAttack(
    attacker: Unit,
    defender: Unit,
    weapon: WeaponData,
    defenderWeapon: WeaponData,
  ): AttackPreview {
    const attStats = attacker.stats;
    const defStats = defender.stats;

    const triangle = getWeaponTriangleMod(weapon.type, defenderWeapon.type);

    const hitRate = calcHitRate(weapon.hit, attStats.skl, attStats.luk) + triangle.hitBonus;
    const terrainData = this.grid.getTerrainData(defender.gridX, defender.gridY);
    const avoid = calcAvoid(defStats.spd, defStats.luk, terrainData.avoidBonus);
    const hit = calcDisplayHit(hitRate, avoid);

    const atkStat = weapon.usesMagic ? attStats.mag : attStats.str;
    const defStat = weapon.usesMagic ? defStats.res : defStats.def;
    const damage = calcDamage(atkStat, weapon.mt + triangle.mtBonus, defStat, weapon.usesMagic);

    const classBonus = getClassCritBonus(attacker.unitClass);
    const critRate = calcCritRate(weapon.crit, attStats.skl, classBonus);
    const critAvoid = calcCritAvoid(defStats.luk);
    const crit = calcDisplayCrit(critRate, critAvoid);

    const doubleAttack = attStats.spd - defStats.spd >= 4;

    return { hit, crit, damage, doubleAttack };
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
      const classBonus = getClassCritBonus(attacker.unitClass);
      const critRate = calcCritRate(weapon.crit, attStats.skl, classBonus);
      const critAvoid = calcCritAvoid(defStats.luk);
      displayCrit = calcDisplayCrit(critRate, critAvoid);
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
