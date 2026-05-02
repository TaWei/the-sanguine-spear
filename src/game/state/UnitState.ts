export const UNIT_STATE = {
  IDLE: 'idle',
  MOVING: 'moving',
  MENU: 'menu',
  EXHAUSTED: 'exhausted',
} as const;

export type UnitStateType = (typeof UNIT_STATE)[keyof typeof UNIT_STATE];

const TRANSITIONS: Record<UnitStateType, UnitStateType[]> = {
  [UNIT_STATE.IDLE]: [UNIT_STATE.MOVING],
  [UNIT_STATE.MOVING]: [UNIT_STATE.MENU, UNIT_STATE.IDLE],
  [UNIT_STATE.MENU]: [UNIT_STATE.EXHAUSTED, UNIT_STATE.IDLE],
  [UNIT_STATE.EXHAUSTED]: [],
};

export class UnitState {
  private _current: UnitStateType = UNIT_STATE.IDLE;

  get current(): UnitStateType {
    return this._current;
  }

  canTransitionTo(target: UnitStateType): boolean {
    return TRANSITIONS[this._current].includes(target);
  }

  transition(target: UnitStateType): void {
    if (!this.canTransitionTo(target)) {
      throw new Error(`Invalid transition: ${this._current} → ${target}`);
    }
    this._current = target;
  }

  reset(): void {
    this._current = UNIT_STATE.IDLE;
  }

  isExhausted(): boolean {
    return this._current === UNIT_STATE.EXHAUSTED;
  }
}
