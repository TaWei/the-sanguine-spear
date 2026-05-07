import type { Unit } from '../units/Unit';
import type { Item } from '../items/ItemTypes';

export enum TradeMenuState {
  INACTIVE = 'inactive',
  ACTIVE = 'active',
}

export class TradeMenu {
  private _state = TradeMenuState.INACTIVE;
  private _leftUnit: Unit | null = null;
  private _rightUnit: Unit | null = null;
  private _selectedLeftIndex = -1;
  private _selectedRightIndex = -1;

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

  get selectedLeftIndex(): number {
    return this._selectedLeftIndex;
  }

  /** @deprecated Use selectedLeftIndex */
  get leftSelectedIndex(): number {
    return this._selectedLeftIndex;
  }

  get selectedRightIndex(): number {
    return this._selectedRightIndex;
  }

  /** @deprecated Use selectedRightIndex */
  get rightSelectedIndex(): number {
    return this._selectedRightIndex;
  }

  open(leftUnit: Unit, rightUnit: Unit): void {
    this._leftUnit = leftUnit;
    this._rightUnit = rightUnit;
    this._selectedLeftIndex = -1;
    this._selectedRightIndex = -1;
    this._state = TradeMenuState.ACTIVE;
  }

  selectLeftItem(index: number): void {
    if (this._state !== TradeMenuState.ACTIVE) return;
    if (index < 0 || index >= this.leftItems.length) return;
    // Toggle selection
    this._selectedLeftIndex = this._selectedLeftIndex === index ? -1 : index;
  }

  selectRightItem(index: number): void {
    if (this._state !== TradeMenuState.ACTIVE) return;
    if (index < 0 || index >= this.rightItems.length) return;
    // Toggle selection
    this._selectedRightIndex = this._selectedRightIndex === index ? -1 : index;
  }

  clearSelections(): void {
    this._selectedLeftIndex = -1;
    this._selectedRightIndex = -1;
  }

  close(): void {
    this._state = TradeMenuState.INACTIVE;
    this._leftUnit = null;
    this._rightUnit = null;
    this._selectedLeftIndex = -1;
    this._selectedRightIndex = -1;
  }
}
