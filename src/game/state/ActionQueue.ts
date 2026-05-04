import { Unit } from '../units/Unit';

export const ActionType = {
  MOVE: 'move',
  ATTACK: 'attack',
  WAIT: 'wait',
  STAFF: 'staff',
} as const;

export type ActionType = (typeof ActionType)[keyof typeof ActionType];

export interface GridPoint {
  x: number;
  y: number;
}

export interface Action {
  type: ActionType;
  actor: Unit;
  x?: number;
  y?: number;
  targetX?: number;
  targetY?: number;
  path?: GridPoint[];
}

export class ActionQueue {
  private actions: Action[] = [];

  enqueue(action: Action): void {
    this.actions.push(action);
  }

  dequeue(): Action | null {
    return this.actions.shift() ?? null;
  }

  peek(): Action | null {
    return this.actions[0] ?? null;
  }

  get length(): number {
    return this.actions.length;
  }

  isEmpty(): boolean {
    return this.actions.length === 0;
  }

  clear(): void {
    this.actions = [];
  }
}
