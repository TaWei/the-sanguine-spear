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
      expect(delta).toEqual({ dx: -5, dy: -5 });
    });

    it('returns correct delta for rightward drag', () => {
      detector.pointerDown(100, 200);
      detector.pointerMove(110, 200); // trigger drag
      // Second move: 110→120
      const delta = detector.computeScrollDelta(120, 200);
      // pointer went +10 right → camera should scrollX -= 10 → dx = -10
      expect(delta.dx).toBe(-10);
      expect(Math.abs(delta.dy)).toBe(0);
    });

    it('returns correct delta for leftward drag', () => {
      detector.pointerDown(200, 200);
      detector.pointerMove(210, 200); // trigger drag
      const delta = detector.computeScrollDelta(190, 200);
      // pointer went -20 left → camera should scrollX -= (-20) → dx = +20
      expect(delta.dx).toBe(20);
    });

    it('returns correct delta for downward drag', () => {
      detector.pointerDown(100, 200);
      detector.pointerMove(110, 200); // trigger drag
      const delta = detector.computeScrollDelta(110, 220);
      // pointer went +20 down → camera should scrollY -= 20 → dy = -20
      expect(delta.dy).toBe(-20);
    });
  });
});
