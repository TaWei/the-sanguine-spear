import { describe, it, expect } from 'vitest';
import { StatCounter } from '../StatCounter';

describe('StatCounter', () => {
  const DURATION = 400; // ms to count from old to new

  it('starts at old value', () => {
    const sc = new StatCounter(20, 21, DURATION);
    expect(sc.current).toBe(20);
    expect(sc.isComplete()).toBe(false);
  });

  it('counts up from old to new over duration', () => {
    const sc = new StatCounter(20, 25, DURATION);
    sc.update(200); // halfway
    expect(sc.current).toBeGreaterThanOrEqual(22);
    expect(sc.current).toBeLessThanOrEqual(23);
    sc.update(200);
    expect(sc.current).toBe(25);
    expect(sc.isComplete()).toBe(true);
  });

  it('counts down from old to new', () => {
    const sc = new StatCounter(10, 5, DURATION);
    sc.update(400);
    expect(sc.current).toBe(5);
    expect(sc.isComplete()).toBe(true);
  });

  it('stays at same value when no change', () => {
    const sc = new StatCounter(15, 15, DURATION);
    sc.update(100);
    expect(sc.current).toBe(15);
    expect(sc.isComplete()).toBe(true);
  });

  it('progress returns 0 at start, 1 at end', () => {
    const sc = new StatCounter(20, 30, DURATION);
    expect(sc.progress).toBe(0);
    sc.update(400);
    expect(sc.progress).toBe(1);
  });

  it('does not go beyond new value', () => {
    const sc = new StatCounter(20, 21, 100);
    sc.update(500);
    expect(sc.current).toBe(21);
  });

  it('does not go below new value when counting down', () => {
    const sc = new StatCounter(5, 2, 100);
    sc.update(500);
    expect(sc.current).toBe(2);
  });

  it('ceils to integer', () => {
    const sc = new StatCounter(20, 25, 400);
    sc.update(50); // progress=0.125, interpolated=20.625, current should be 21 (ceil)
    expect(sc.current).toBe(21);
  });

  it('hasChanged is false when old equals new', () => {
    const sc = new StatCounter(10, 10, DURATION);
    expect(sc.hasChanged).toBe(false);
  });

  it('hasChanged is true when old differs from new', () => {
    const sc = new StatCounter(10, 11, DURATION);
    expect(sc.hasChanged).toBe(true);
  });
});
