import { Unit } from '../units/Unit';

export const MenuState = {
  HIDDEN: 'hidden',
  CHOOSE_ACTION: 'choose_action',
  CHOOSE_TARGET: 'choose_target',
  CHOOSE_STATUS: 'choose_status',
  CHOOSE_ITEM: 'choose_item',
  RESOLVED: 'resolved',
} as const;
export type MenuState = (typeof MenuState)[keyof typeof MenuState];

export const MenuAction = {
  FIGHT: 'fight',
  ITEMS: 'items',
  END_TURN: 'end_turn',
  STATUS: 'status',
} as const;
export type MenuAction = (typeof MenuAction)[keyof typeof MenuAction];

export class BattleMenu {
  private _state: MenuState = MenuState.HIDDEN;
  private _unit: Unit | null = null;
  private _enemies: Unit[] = [];
  private _selectedAction: MenuAction | null = null;
  private _selectedTarget: Unit | null = null;
  private _selectedItemIndex: number = -1;

  get state(): MenuState {
    return this._state;
  }
  get isVisible(): boolean {
    return this._state !== MenuState.HIDDEN;
  }
  get unit(): Unit | null {
    return this._unit;
  }
  get adjacentEnemies(): readonly Unit[] {
    return this._enemies;
  }
  get selectedAction(): MenuAction | null {
    return this._selectedAction;
  }
  get selectedTarget(): Unit | null {
    return this._selectedTarget;
  }
  get selectedItemIndex(): number {
    return this._selectedItemIndex;
  }

  show(unit: Unit, enemies: Unit[]): void {
    this._unit = unit;
    this._enemies = enemies;
    this._selectedAction = null;
    this._selectedTarget = null;
    this._selectedItemIndex = -1;
    this._state = MenuState.CHOOSE_ACTION;
  }

  selectAction(action: MenuAction): void {
    if (this._state !== MenuState.CHOOSE_ACTION) {
      throw new Error(`Cannot select action in state ${this._state}`);
    }
    this._selectedAction = action;
    if (action === MenuAction.END_TURN) {
      this._state = MenuState.RESOLVED;
    } else if (action === MenuAction.STATUS) {
      this._state = MenuState.CHOOSE_STATUS;
    } else if (action === MenuAction.ITEMS) {
      this._state = MenuState.CHOOSE_ITEM;
    } else {
      this._state = MenuState.CHOOSE_TARGET;
    }
  }

  selectTarget(target: Unit): void {
    if (this._state !== MenuState.CHOOSE_TARGET) {
      throw new Error(`Cannot select target in state ${this._state}`);
    }
    this._selectedTarget = target;
    this._state = MenuState.RESOLVED;
  }

  confirmItemUse(index: number): void {
    if (this._state !== MenuState.CHOOSE_ITEM) {
      throw new Error(`Cannot confirm item use in state ${this._state}`);
    }
    this._selectedItemIndex = index;
    this._state = MenuState.RESOLVED;
  }

  cancelItemUse(): void {
    if (this._state !== MenuState.CHOOSE_ITEM) {
      throw new Error(`Cannot cancel item use in state ${this._state}`);
    }
    this._selectedItemIndex = -1;
    this._state = MenuState.CHOOSE_ACTION;
  }

  reset(): void {
    this._state = MenuState.HIDDEN;
    this._unit = null;
    this._enemies = [];
    this._selectedAction = null;
    this._selectedTarget = null;
    this._selectedItemIndex = -1;
  }
}
