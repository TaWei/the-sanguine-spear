import { describe, it, expect } from 'vitest';
import { ExpPopup } from '../ExpPopup';

describe('ExpPopup', () => {
  it('initializes with given start and target exp', () => {
    const popup = new ExpPopup(20, 50, false);
    expect(popup.startExp).toBe(20);
    expect(popup.targetExp).toBe(50);
    expect(popup.currentExp).toBe(20);
    expect(popup.leveledUp).toBe(false);
    expect(popup.isComplete()).toBe(false);
  });

  it('animates currentExp toward targetExp', () => {
    const popup = new ExpPopup(0, 30, false);
    popup.update(16);
    expect(popup.currentExp).toBeGreaterThan(0);
    expect(popup.currentExp).toBeLessThanOrEqual(30);
  });

  it('reaches target and reports complete', () => {
    const popup = new ExpPopup(0, 30, false);
    for (let i = 0; i < 100; i++) {
      popup.update(16);
    }
    expect(popup.currentExp).toBe(30);
    expect(popup.isComplete()).toBe(true);
  });

  it('returns fill ratio between 0 and 1', () => {
    const popup = new ExpPopup(0, 100, false);
    expect(popup.getFillRatio()).toBe(0);
    popup.update(16);
    const ratio = popup.getFillRatio();
    expect(ratio).toBeGreaterThanOrEqual(0);
    expect(ratio).toBeLessThanOrEqual(1);
  });

  it('handles level-up wrap correctly', () => {
    // Unit had 80 EXP, gained 30, leveled up -> final exp = 10
    const popup = new ExpPopup(80, 10, true);
    expect(popup.leveledUp).toBe(true);
    for (let i = 0; i < 100; i++) {
      popup.update(16);
    }
    expect(popup.currentExp).toBe(10);
    expect(popup.isComplete()).toBe(true);
  });

  it('returns 0 fill ratio when start equals target', () => {
    const popup = new ExpPopup(50, 50, false);
    expect(popup.getFillRatio()).toBe(0);
    expect(popup.isComplete()).toBe(true);
  });
});
