import { describe, it, expect } from 'vitest';
import { createDurabilityTracker } from '../DurabilityTracker';

describe('DurabilityTracker', () => {
  it('starts with initial uses', () => {
    const tracker = createDurabilityTracker(45);
    expect(tracker.uses).toBe(45);
    expect(tracker.isBroken).toBe(false);
  });

  it('consume() decrements uses by 1', () => {
    const tracker = createDurabilityTracker(45);
    tracker.consume();
    expect(tracker.uses).toBe(44);
    expect(tracker.wasUsed).toBe(true);
  });

  it('consume() returns false when weapon breaks', () => {
    const tracker = createDurabilityTracker(1);
    const stillUsable = tracker.consume();
    expect(stillUsable).toBe(false);
    expect(tracker.uses).toBe(0);
    expect(tracker.isBroken).toBe(true);
  });

  it('isBroken is true when uses are 0', () => {
    const tracker = createDurabilityTracker(0);
    expect(tracker.isBroken).toBe(true);
  });

  it('wasUsed starts false and becomes true after first consume', () => {
    const tracker = createDurabilityTracker(5);
    expect(tracker.wasUsed).toBe(false);
    tracker.consume();
    expect(tracker.wasUsed).toBe(true);
  });

  it('multiple consumes work correctly', () => {
    const tracker = createDurabilityTracker(3);
    tracker.consume();
    tracker.consume();
    expect(tracker.uses).toBe(1);
    expect(tracker.isBroken).toBe(false);
    tracker.consume();
    expect(tracker.isBroken).toBe(true);
  });

  it('negative initial uses clamped to 0', () => {
    const tracker = createDurabilityTracker(-5);
    expect(tracker.uses).toBe(0);
    expect(tracker.isBroken).toBe(true);
  });

  it('consume on already broken weapon returns false', () => {
    const tracker = createDurabilityTracker(0);
    const result = tracker.consume();
    expect(result).toBe(false);
    expect(tracker.uses).toBe(0);
  });
});
