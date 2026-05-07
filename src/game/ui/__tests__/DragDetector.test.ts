import { describe, it, expect, beforeEach } from 'vitest';
import { DragDetector } from '../DragDetector';

describe('DragDetector', () => {
  const THRESHOLD = 5;

  let detector: DragDetector;
  beforeEach(() => {
    detector = new DragDetector(THRESHOLD);
  });

  describe('pointerdown / pointerup cycle', () => {
    it('starts in idle state', () => {
      expect(detector.isDragging).toBe(false);
      expect(detector.wasDrag).toBe(false);
    });

    it('records start position on pointerdown', () => {
      detector.pointerDown(100, 200);
      expect(detector.isDragging).toBe(false);
    });

    it('does not trigger drag for movement below threshold', () => {
      detector.pointerDown(100, 200);
      detector.pointerMove(103, 201); // Manhattan: |3| + |1| = 4 < 5
      expect(detector.isDragging).toBe(false);
    });

    it('triggers drag when movement exceeds threshold', () => {
      detector.pointerDown(100, 200);
      detector.pointerMove(104, 203); // Manhattan: |4| + |3| = 7 > 5
      expect(detector.isDragging).toBe(true);
    });

    it('triggers drag on X-axis movement exceeding threshold', () => {
      detector.pointerDown(100, 200);
      detector.pointerMove(106, 200); // Manhattan: |6| + |0| = 6 > 5
      expect(detector.isDragging).toBe(true);
    });

    it('triggers drag on Y-axis movement exceeding threshold', () => {
      detector.pointerDown(100, 200);
      detector.pointerMove(100, 206); // Manhattan: |0| + |6| = 6 > 5
      expect(detector.isDragging).toBe(true);
    });

    it('stays dragging after threshold crossed', () => {
      detector.pointerDown(100, 200);
      detector.pointerMove(110, 200); // crosses threshold
      expect(detector.isDragging).toBe(true);
      detector.pointerMove(120, 200); // further movement
      expect(detector.isDragging).toBe(true);
    });

    it('resets wasDrag on new pointerdown', () => {
      detector.pointerDown(100, 200);
      detector.pointerMove(110, 200); // drag
      expect(detector.wasDrag).toBe(true);
      detector.pointerUp();
      detector.pointerDown(300, 400); // new click
      expect(detector.wasDrag).toBe(false);
    });

    it('resets isDragging on pointerup', () => {
      detector.pointerDown(100, 200);
      detector.pointerMove(110, 200);
      expect(detector.isDragging).toBe(true);
      detector.pointerUp();
      expect(detector.isDragging).toBe(false);
    });

    it('returns start position for clicks', () => {
      detector.pointerDown(150, 250);
      detector.pointerUp();
      expect(detector.clickX).toBe(150);
      expect(detector.clickY).toBe(250);
    });

    it('returns null start position after drag', () => {
      detector.pointerDown(150, 250);
      detector.pointerMove(160, 250); // triggers drag
      detector.pointerUp();
      expect(detector.clickX).toBeNull();
      expect(detector.clickY).toBeNull();
    });

    it('never triggers drag if pointer not down', () => {
      detector.pointerDown(100, 200);
      detector.pointerUp();
      detector.pointerMove(200, 300);
      expect(detector.isDragging).toBe(false);
    });
  });

  describe('computeScrollDelta', () => {
    it('returns zero delta on first move', () => {
      detector.pointerDown(100, 200);
      const delta = detector.computeScrollDelta(105, 205);
      expect(delta).toEqual({ dx: 5, dy: 5 });
    });

    it('computes delta from last computeScrollDelta position', () => {
      detector.pointerDown(100, 200);
      detector.pointerMove(110, 200); // trigger drag (threshold 100→110 = 10 > 5)
      // First drag frame: delta from pointerDown position
      let delta = detector.computeScrollDelta(110, 200);
      expect(delta.dx).toBe(10);
      // Next frame: _lastX is now 110
      delta = detector.computeScrollDelta(125, 200);
      expect(delta.dx).toBe(15);
      expect(Math.abs(delta.dy)).toBe(0);
    });

    it('handles leftward drag correctly', () => {
      detector.pointerDown(200, 200);
      detector.pointerMove(188, 200); // trigger drag left: |200-188| = 12 > 5
      // First drag frame from start:
      const delta = detector.computeScrollDelta(188, 200);
      expect(delta.dx).toBe(-12);
    });

    it('handles downward drag correctly', () => {
      detector.pointerDown(100, 200);
      detector.pointerMove(100, 210); // trigger drag down: |200-210| = 10 > 5
      const delta = detector.computeScrollDelta(100, 210);
      expect(delta.dy).toBe(10);
    });

    it('accumulates multi-frame drag deltas', () => {
      detector.pointerDown(100, 100);
      detector.pointerMove(108, 100); // trigger
      let d = detector.computeScrollDelta(108, 100); // +8
      expect(d.dx).toBe(8);
      d = detector.computeScrollDelta(115, 110); // +7 x, +10 y
      expect(d.dx).toBe(7);
      expect(d.dy).toBe(10);
      d = detector.computeScrollDelta(95, 105); // -20 x, -5 y
      expect(d.dx).toBe(-20);
      expect(d.dy).toBe(-5);
    });
  });
});
