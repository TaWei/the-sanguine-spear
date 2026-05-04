import { UnitStats } from './Stats';
import { UnitState, UNIT_STATE } from '../state/UnitState';
import { GrowthRates, createGrowthRates } from '../progression/GrowthRates';
import { Inventory } from '../items/Inventory';

export const Faction = {
  PLAYER: 'player',
  ENEMY: 'enemy',
  ALLY: 'ally',
} as const;

export const UnitClass = {
  LORD: 'lord',
  MERCENARY: 'mercenary',
  MAGE: 'mage',
  ARCHER: 'archer',
  CAVALRY: 'cavalry',
  PEGASUS_KNIGHT: 'pegasus_knight',
  SOLDIER: 'soldier',
  BRIGAND: 'brigand',
  SWORDMASTER: 'swordmaster',
  BERSERKER: 'berserker',
} as const;

export type Faction = (typeof Faction)[keyof typeof Faction];
export type UnitClass = (typeof UnitClass)[keyof typeof UnitClass];

export interface UnitOptions {
  level?: number;
  exp?: number;
  growthRates?: GrowthRates;
}

export class Unit {
  readonly id: string;
  readonly name: string;
  readonly faction: Faction;
  readonly unitClass: UnitClass;
  readonly inventory: Inventory;
  private _stats: UnitStats;
  readonly state: UnitState = new UnitState();
  private _gridX: number;
  private _gridY: number;
  private _level: number;
  private _exp: number;
  private _growthRates: GrowthRates;

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
    this.unitClass = unitClass;
    this.inventory = new Inventory();
    this._stats = stats;
    this._gridX = gridX;
    this._gridY = gridY;
    this._level = Math.max(1, Math.min(20, options.level ?? 1));
    this._exp = Math.max(0, Math.min(99, options.exp ?? 0));
    this._growthRates = options.growthRates ?? createGrowthRates();
  }

  get stats(): Readonly<UnitStats> {
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

  get isFlying(): boolean {
    return this.unitClass === UnitClass.PEGASUS_KNIGHT;
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
}
