import { UnitStats } from './Stats';
import { UnitState, UNIT_STATE } from '../state/UnitState';
import { GrowthRates, createGrowthRates } from '../progression/GrowthRates';
import { Inventory } from '../items/Inventory';
import type { AiBehavior } from '../ai/Behavior';
import type { AiPersonality } from '../ai/Personality';
import { createWeaponRank, wexpToRank } from '../combat/WeaponRank';
import type { WeaponRankData } from '../combat/WeaponRank';
import type { WeaponType } from '../combat/Weapons';
import { PairUpState } from './PairUpState';

// Re-export from UnitClass module
export { UnitClass } from './UnitClass';
export type { UnitClass as UnitClassType, UnitTier } from './UnitClass';

// Auto-derive con from class if not explicitly set
const CLASS_CON: Record<string, number> = {
  lord: 7, mercenary: 9, mage: 6, archer: 7,
  cavalry: 9, pegasus_knight: 5, soldier: 10, brigand: 12,
  swordmaster: 9, berserker: 13, paladin: 11, sage: 7,
  sniper: 8, falcon_knight: 6, general: 15, thief: 6,
  assassin: 7, wraith_knight: 12,
};

function getBaseCon(unitClass: string): number {
  return CLASS_CON[unitClass] ?? 0;
}

export const Faction = {
  PLAYER: 'player',
  ENEMY: 'enemy',
  ALLY: 'ally',
} as const;

export type Faction = (typeof Faction)[keyof typeof Faction];

import type { UnitClass, UnitTier } from './UnitClass';

export interface UnitOptions {
  level?: number;
  exp?: number;
  growthRates?: GrowthRates;
  aiBehavior?: AiBehavior;
  aiPersonality?: AiPersonality;
}

export class Unit {
  readonly id: string;
  readonly name: string;
  faction: Faction;
  private _unitClass: UnitClass;
  readonly inventory: Inventory;
  private _stats: UnitStats;
  readonly state: UnitState = new UnitState();
  readonly pairUpState: PairUpState = new PairUpState();
  private _gridX: number;
  private _gridY: number;
  private _level: number;
  private _exp: number;
  private _growthRates: GrowthRates;
  private _tier: UnitTier = 'base';
  aiBehavior?: AiBehavior;
  aiPersonality?: AiPersonality;

  // Equipped weapon index (for prep screen)
  equippedWeaponIndex: number | null = null;

  // Rescue state
  private _rescuedUnit: Unit | null = null;
  private _rescuedBy: Unit | null = null;

  // Weapon rank tracking
  private _weaponRanks: Record<WeaponType, WeaponRankData> = {
    sword: createWeaponRank(),
    axe: createWeaponRank(),
    lance: createWeaponRank(),
    bow: createWeaponRank(),
    magic: createWeaponRank(),
  };

  constructor(
    id: string,
    name: string,
    faction: Faction,
    unitClass: UnitClass,
    stats: UnitStats,
    gridX: number,
    gridY: number,
    options: UnitOptions = {},
  ) {
    this.id = id;
    this.name = name;
    this.faction = faction;
    this._unitClass = unitClass;
    this.inventory = new Inventory();
    this._stats = stats;
    this._gridX = gridX;
    this._gridY = gridY;
    this._level = Math.max(1, Math.min(20, options.level ?? 1));
    this._exp = Math.max(0, Math.min(99, options.exp ?? 0));
    this._growthRates = options.growthRates ?? createGrowthRates();
    this.aiBehavior = options.aiBehavior;
    this.aiPersonality = options.aiPersonality;

    // Auto-derive con from class if not explicitly set
    if (this._stats.con === 0) {
      this._stats = { ...this._stats, con: getBaseCon(unitClass) };
    }
  }

  get unitClass(): UnitClass {
    return this._unitClass;
  }

  get stats(): Readonly<UnitStats> {
    if (this._rescuedUnit) {
      // Carrying halves Skl and Spd (floor)
      return {
        ...this._stats,
        skl: Math.floor(this._stats.skl / 2),
        spd: Math.floor(this._stats.spd / 2),
      };
    }
    return this._stats;
  }
  get hasActed(): boolean {
    return this.state.isExhausted();
  }
  set hasActed(v: boolean) {
    if (v) {
      if (this.state.current === UNIT_STATE.IDLE) {
        this.state.transition(UNIT_STATE.MOVING);
        this.state.transition(UNIT_STATE.MENU);
        this.state.transition(UNIT_STATE.EXHAUSTED);
      } else if (this.state.current === UNIT_STATE.MOVING) {
        this.state.transition(UNIT_STATE.MENU);
        this.state.transition(UNIT_STATE.EXHAUSTED);
      } else if (this.state.current === UNIT_STATE.MENU) {
        this.state.transition(UNIT_STATE.EXHAUSTED);
      }
    } else {
      this.state.reset();
    }
  }
  get gridX(): number {
    return this._gridX;
  }
  get gridY(): number {
    return this._gridY;
  }
  get isAlive(): boolean {
    return this._stats.hp > 0;
  }
  get isPlayer(): boolean {
    return this.faction === Faction.PLAYER;
  }
  get isEnemy(): boolean {
    return this.faction === Faction.ENEMY;
  }

  /** Change faction (used for recruitment) */
  setFaction(faction: Faction): void {
    this.faction = faction;
  }

  get isFlying(): boolean {
    return this.unitClass === 'pegasus_knight' || this.unitClass === 'falcon_knight';
  }

  get level(): number {
    return this._level;
  }

  get exp(): number {
    return this._exp;
  }

  get growthRates(): Readonly<GrowthRates> {
    return this._growthRates;
  }

  get isAtMaxLevel(): boolean {
    return this._level >= 20;
  }

  get tier(): UnitTier {
    return this._tier;
  }

  // ---- Rescue state ----

  get rescuedUnit(): Unit | null { return this._rescuedUnit; }
  get rescuedBy(): Unit | null { return this._rescuedBy; }
  get isCarrying(): boolean { return this._rescuedUnit !== null; }
  get isRescued(): boolean { return this._rescuedBy !== null; }

  setRescuedUnit(unit: Unit): void {
    if (unit.isCarrying) {
      throw new Error(`${unit.name} is already carrying someone`);
    }
    if (unit.isRescued) {
      throw new Error(`${unit.name} is already being rescued`);
    }
    if (this._rescuedUnit) {
      throw new Error(`${this.name} is already carrying ${this._rescuedUnit.name}`);
    }
    this._rescuedUnit = unit;
    unit._rescuedBy = this;
  }

  clearRescuedUnit(): void {
    if (this._rescuedUnit) {
      this._rescuedUnit._rescuedBy = null;
      this._rescuedUnit = null;
    }
  }

  // ---- Movement / damage ----

  moveTo(x: number, y: number): void {
    this._gridX = x;
    this._gridY = y;
  }

  takeDamage(amount: number): void {
    this._stats = {
      ...this._stats,
      hp: Math.max(0, this._stats.hp - amount),
    };
  }

  heal(amount: number): void {
    this._stats = {
      ...this._stats,
      hp: Math.min(this._stats.maxHp, this._stats.hp + amount),
    };
  }

  resetState(): void {
    this.state.reset();
  }

  gainExp(amount: number): void {
    if (this.isAtMaxLevel) {
      return;
    }
    this._exp = Math.min(99, this._exp + amount);
  }

  applyLevelUp(newStats: UnitStats): void {
    this._stats = newStats;
    this._exp = 0;
    this._level = Math.min(20, this._level + 1);
  }

  applyPromotion(newClass: UnitClass, newStats: UnitStats): void {
    this._unitClass = newClass;
    this._stats = newStats;
    this._level = 1;
    this._exp = 0;
    this._tier = 'promoted';
  }

  getWeaponRank(type: WeaponType): WeaponRankData {
    return this._weaponRanks[type] ?? createWeaponRank();
  }

  awardWeaponExp(type: WeaponType, amount: number): void {
    const current = this.getWeaponRank(type);
    const newWexp = current.wexp + amount;
    const newRank = wexpToRank(newWexp);
    this._weaponRanks[type] = { rank: newRank, wexp: newWexp };
  }

  setWeaponRank(type: WeaponType, rank: WeaponRankData): void {
    this._weaponRanks[type] = { ...rank };
  }
}
