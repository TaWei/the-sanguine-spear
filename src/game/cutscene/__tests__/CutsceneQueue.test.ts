import { describe, it, expect, vi } from 'vitest';
import { CutsceneQueue } from '../CutsceneQueue';

describe('CutsceneQueue', () => {
  it('starts inactive with no pending cutscenes', () => {
    const queue = new CutsceneQueue();
    expect(queue.isActive).toBe(false);
    expect(queue.pendingCount).toBe(0);
  });

  it('enqueues a cutscene without auto-starting', () => {
    const queue = new CutsceneQueue();
    queue.enqueue('cs1');
    expect(queue.pendingCount).toBe(1);
    expect(queue.isActive).toBe(false);
  });

  it('starts playing when start() is called', () => {
    const queue = new CutsceneQueue();
    const playFn = vi.fn();
    queue.enqueue('cs1');
    queue.start(playFn);
    expect(queue.isActive).toBe(true);
    expect(playFn).toHaveBeenCalledTimes(1);
    expect(playFn).toHaveBeenCalledWith('cs1', expect.any(Function));
  });

  it('plays multiple cutscenes in order', () => {
    const queue = new CutsceneQueue();
    const playFn = vi.fn();
    queue.enqueue('cs1');
    queue.enqueue('cs2');
    queue.start(playFn);

    expect(playFn).toHaveBeenCalledTimes(1);
    expect(playFn).toHaveBeenNthCalledWith(1, 'cs1', expect.any(Function));

    // Simulate completion of first cutscene
    const onComplete1 = playFn.mock.calls[0][1];
    onComplete1();

    expect(playFn).toHaveBeenCalledTimes(2);
    expect(playFn).toHaveBeenNthCalledWith(2, 'cs2', expect.any(Function));
  });

  it('calls onDone when queue empties', () => {
    const queue = new CutsceneQueue();
    const playFn = vi.fn();
    const onDone = vi.fn();
    queue.enqueue('cs1');
    queue.start(playFn, onDone);

    const onComplete = playFn.mock.calls[0][1];
    onComplete();

    expect(onDone).toHaveBeenCalledTimes(1);
    expect(queue.isActive).toBe(false);
    expect(queue.pendingCount).toBe(0);
  });

  it('allows enqueueing while playing (adds to tail)', () => {
    const queue = new CutsceneQueue();
    const playFn = vi.fn();
    queue.enqueue('cs1');
    queue.start(playFn);

    // While first is playing, enqueue another
    queue.enqueue('cs2');
    expect(queue.pendingCount).toBe(1);

    const onComplete1 = playFn.mock.calls[0][1];
    onComplete1();

    expect(playFn).toHaveBeenCalledTimes(2);
    expect(playFn).toHaveBeenNthCalledWith(2, 'cs2', expect.any(Function));
  });

  it('does nothing if start() called with empty queue', () => {
    const queue = new CutsceneQueue();
    const playFn = vi.fn();
    const onDone = vi.fn();
    queue.start(playFn, onDone);
    expect(playFn).not.toHaveBeenCalled();
    expect(onDone).not.toHaveBeenCalled();
    expect(queue.isActive).toBe(false);
  });

  it('clear() empties queue and resets state', () => {
    const queue = new CutsceneQueue();
    const playFn = vi.fn();
    queue.enqueue('cs1');
    queue.enqueue('cs2');
    queue.start(playFn);
    queue.clear();
    expect(queue.isActive).toBe(false);
    expect(queue.pendingCount).toBe(0);
  });

  it('start() auto-starts if queue already has items', () => {
    const queue = new CutsceneQueue();
    const playFn = vi.fn();
    queue.enqueue('cs1');
    queue.start(playFn);
    expect(playFn).toHaveBeenCalledWith('cs1', expect.any(Function));
  });

  it('setOnDone replaces callback for active queue', () => {
    const queue = new CutsceneQueue();
    const playFn = vi.fn();
    const onDone1 = vi.fn();
    const onDone2 = vi.fn();
    queue.enqueue('cs1');
    queue.start(playFn, onDone1);
    queue.setOnDone(onDone2);

    const onComplete = playFn.mock.calls[0][1];
    onComplete();

    expect(onDone1).not.toHaveBeenCalled();
    expect(onDone2).toHaveBeenCalledTimes(1);
  });
});
