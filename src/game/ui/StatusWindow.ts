import { Unit } from '../units/Unit';

export interface StatusDisplay {
  name: string;
  unitClass: string;
  level: number;
  hp: number;
  maxHp: number;
  str: number;
  mag: number;
  skl: number;
  spd: number;
  luk: number;
  def: number;
  res: number;
  mov: number;
}

export class StatusWindow {
  private _unit: Unit | null = null;

  get isActive(): boolean {
    return this._unit !== null;
  }

  get unit(): Unit | null {
    return this._unit;
  }

  get displayStats(): StatusDisplay | null {
    if (this._unit === null) {
      return null;
    }
    return {
      name: this._unit.name,
      unitClass: this._unit.unitClass,
      level: this._unit.level,
      hp: this._unit.stats.hp,
      maxHp: this._unit.stats.maxHp,
      str: this._unit.stats.str,
      mag: this._unit.stats.mag,
      skl: this._unit.stats.skl,
      spd: this._unit.stats.spd,
      luk: this._unit.stats.luk,
      def: this._unit.stats.def,
      res: this._unit.stats.res,
      mov: this._unit.stats.mov,
    };
  }

  open(unit: Unit): void {
    this._unit = unit;
  }

  close(): void {
    this._unit = null;
  }
}
