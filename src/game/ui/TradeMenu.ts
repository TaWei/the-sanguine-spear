import type { Unit } from '../units/Unit';
import type { Item } from '../items/ItemTypes';

export enum TradeMenuState {
  INACTIVE = 'inactive',
  SELECT_LEFT = 'select_left',
  SELECT_RIGHT = 'select_right',
  RESOLVED = 'resolved',
}

export class TradeMenu {
  private _state = TradeMenuState.INACTIVE;
  private _leftUnit: Unit | null = null;
  private _rightUnit: Unit | null = null;
  private _leftSelectedIndex = -1;
  private _rightSelectedIndex = -1;

  get state(): TradeMenuState {
    return this._state;
  }

  get isActive(): boolean {
    return this._state !== TradeMenuState.INACTIVE;
  }

  get leftUnit(): Unit | null {
    return this._leftUnit;
  }

  get rightUnit(): Unit | null {
    return this._rightUnit;
  }

  get leftItems(): readonly Item[] {
    return this._leftUnit?.inventory.items ?? [];
  }

  get rightItems(): readonly Item[] {
    return this._rightUnit?.inventory.items ?? [];
  }

  get leftSelectedIndex(): number {
    return this._leftSelectedIndex;
  }

  get rightSelectedIndex(): number {
    return this._rightSelectedIndex;
  }

  open(leftUnit: Unit, rightUnit: Unit): void {
    this._leftUnit = leftUnit;
    this._rightUnit = rightUnit;
    this._leftSelectedIndex = -1;
    this._rightSelectedIndex = -1;
    this._state = TradeMenuState.SELECT_LEFT;
  }

  selectLeftItem(index: number): void {
    if (this._state !== TradeMenuState.SELECT_LEFT) {
      throw new Error(`Cannot select left item in state ${this._state}`);
    }
    if (index < 0 || index >= this.leftItems.length) {
      throw new Error(`Invalid left item index ${index}`);
    }
    this._leftSelectedIndex = index;
    this._state = TradeMenuState.SELECT_RIGHT;
  }

  selectRightItem(index: number): void {
    if (this._state !== TradeMenuState.SELECT_RIGHT) {
      throw new Error(`Cannot select right item in state ${this._state}`);
    }
    if (index !== -1 && (index < 0 || index >= this.rightItems.length)) {
      throw new Error(`Invalid right item index ${index}`);
    }
    this._rightSelectedIndex = index;
    this._state = TradeMenuState.RESOLVED;
  }

  cancel(): void {
    if (this._state !== TradeMenuState.SELECT_RIGHT) {
      throw new Error(`Cannot cancel in state ${this._state}`);
    }
    this._leftSelectedIndex = -1;
    this._rightSelectedIndex = -1;
    this._state = TradeMenuState.SELECT_LEFT;
  }

  close(): void {
    this._state = TradeMenuState.INACTIVE;
    this._leftUnit = null;
    this._rightUnit = null;
    this._leftSelectedIndex = -1;
    this._rightSelectedIndex = -1;
  }
}
