import { Unit } from '../units/Unit';

export interface ThreatStats {
  hit: number;
  crit: number;
  damage: number;
  doubleAttack: boolean;
}

export class EnemyPreview {
  private _unit: Unit | null = null;
  private _threat: ThreatStats | null = null;

  get isActive(): boolean {
    return this._unit !== null;
  }

  get unit(): Unit | null {
    return this._unit;
  }

  get threat(): ThreatStats | null {
    return this._threat;
  }

  show(unit: Unit, threat?: ThreatStats): void {
    this._unit = unit;
    this._threat = threat ?? null;
  }

  clear(): void {
    this._unit = null;
    this._threat = null;
  }
}
