import { describe, it, expect } from 'vitest';
import { ActionQueue, Action, ActionType } from '../ActionQueue';
import { Unit, Faction, UnitClass } from '../../units/Unit';
import { createStats } from '../../units/Stats';

describe('ActionQueue', () => {
  const stats = createStats({
    hp: 20,
    str: 5,
    mag: 5,
    skl: 5,
    spd: 5,
    luk: 5,
    def: 5,
    res: 5,
    mov: 5,
  });
  const unit1 = new Unit('u1', 'One', Faction.PLAYER, UnitClass.LORD, stats, 0, 0);
  const unit2 = new Unit('u2', 'Two', Faction.PLAYER, UnitClass.LORD, stats, 1, 1);

  it('starts empty', () => {
    const queue = new ActionQueue();
    expect(queue.isEmpty()).toBe(true);
    expect(queue.length).toBe(0);
  });

  it('enqueues and dequeues actions in FIFO order', () => {
    const queue = new ActionQueue();
    const a1: Action = { type: ActionType.MOVE, actor: unit1, x: 3, y: 3 };
    const a2: Action = { type: ActionType.ATTACK, actor: unit2, targetX: 1, targetY: 1 };
    queue.enqueue(a1);
    queue.enqueue(a2);
    expect(queue.length).toBe(2);
    expect(queue.dequeue()).toBe(a1);
    expect(queue.length).toBe(1);
    expect(queue.dequeue()).toBe(a2);
    expect(queue.isEmpty()).toBe(true);
  });

  it('dequeue returns null when empty', () => {
    const queue = new ActionQueue();
    expect(queue.dequeue()).toBeNull();
  });

  it('peek returns next without removing', () => {
    const queue = new ActionQueue();
    const action: Action = { type: ActionType.WAIT, actor: unit1 };
    queue.enqueue(action);
    expect(queue.peek()).toBe(action);
    expect(queue.length).toBe(1);
  });

  it('peek returns null when empty', () => {
    const queue = new ActionQueue();
    expect(queue.peek()).toBeNull();
  });

  it('clear removes all actions', () => {
    const queue = new ActionQueue();
    queue.enqueue({ type: ActionType.WAIT, actor: unit1 });
    queue.enqueue({ type: ActionType.WAIT, actor: unit2 });
    queue.clear();
    expect(queue.isEmpty()).toBe(true);
  });
});
