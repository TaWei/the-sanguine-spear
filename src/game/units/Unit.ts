import { UnitStats } from './Stats';

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
} as const;

export type Faction = (typeof Faction)[keyof typeof Faction];
export type UnitClass = (typeof UnitClass)[keyof typeof UnitClass];

export class Unit {
  readonly id: string;
  readonly name: string;
  readonly faction: Faction;
  readonly unitClass: UnitClass;
  private _stats: UnitStats;
  private _hasActed: boolean = false;
  private _gridX: number;
  private _gridY: number;

  constructor(
    id: string,
    name: string,
    faction: Faction,
    unitClass: UnitClass,
    stats: UnitStats,
    gridX: number,
    gridY: number,
  ) {
    this.id = id;
    this.name = name;
    this.faction = faction;
    this.unitClass = unitClass;
    this._stats = stats;
    this._gridX = gridX;
    this._gridY = gridY;
  }

  get stats(): Readonly<UnitStats> { return this._stats; }
  get hasActed(): boolean { return this._hasActed; }
  set hasActed(v: boolean) { this._hasActed = v; }
  get gridX(): number { return this._gridX; }
  get gridY(): number { return this._gridY; }
  get isAlive(): boolean { return this._stats.hp > 0; }
  get isPlayer(): boolean { return this.faction === Faction.PLAYER; }
  get isEnemy(): boolean { return this.faction === Faction.ENEMY; }

  moveTo(x: number, y: number): void {
    this._gridX = x;
    this._gridY = y;
  }

  resetState(): void {
    this._hasActed = false;
  }
}
