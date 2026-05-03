import { Unit } from '../units/Unit';

export class EnemyPreview {
  private _unit: Unit | null = null;

  get isActive(): boolean {
    return this._unit !== null;
  }

  get unit(): Unit | null {
    return this._unit;
  }

  show(unit: Unit): void {
    this._unit = unit;
  }

  clear(): void {
    this._unit = null;
  }
}
