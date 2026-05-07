/**
 * Pure logic for detecting click vs drag gestures.
 * Zero Phaser imports — testable with Vitest.
 *
 * Usage:
 *   const detector = new DragDetector(5);
 *   onPointerDown(x, y)  → detector.pointerDown(x, y)
 *   onPointerMove(x, y)  → detector.pointerMove(x, y); if (detector.isDragging) scroll(detector.computeScrollDelta(x,y))
 *   onPointerUp()        → detector.pointerUp(); if (!detector.wasDrag) handleClick(detector.clickX, detector.clickY)
 */
export class DragDetector {
  private _startX = 0;
  private _startY = 0;
  private _lastX = 0;
  private _lastY = 0;
  private _isDragging = false;
  private _wasDrag = false;
  private _isDown = false;
  private readonly threshold: number;

  constructor(threshold: number = 5) {
    this.threshold = threshold;
  }

  pointerDown(x: number, y: number): void {
    this._startX = x;
    this._startY = y;
    this._lastX = x;
    this._lastY = y;
    this._isDragging = false;
    this._wasDrag = false;
    this._isDown = true;
  }

  pointerMove(x: number, y: number): void {
    if (!this._isDown) return;

    if (!this._isDragging) {
      const dist =
        Math.abs(x - this._startX) + Math.abs(y - this._startY);
      if (dist > this.threshold) {
        this._isDragging = true;
        this._wasDrag = true;
      }
    }

    this._lastX = x;
    this._lastY = y;
  }

  pointerUp(): void {
    this._isDragging = false;
    this._isDown = false;
  }

  /** True while actively dragging (pointer down + movement > threshold). */
  get isDragging(): boolean {
    return this._isDragging;
  }

  /** True if the last completed gesture was a drag. Clears on next pointerDown. */
  get wasDrag(): boolean {
    return this._wasDrag;
  }

  /** Start position of the click — null if last gesture was a drag. */
  get clickX(): number | null {
    return this._wasDrag ? null : this._startX;
  }

  get clickY(): number | null {
    return this._wasDrag ? null : this._startY;
  }

  /**
   * Compute the scroll delta for a drag frame.
   * Returns { dx, dy } where:
   *   camera.scrollX += dx  (positive dx = finger drags right → see more right)
   *   camera.scrollY += dy  (positive dy = finger drags down → see more below)
   *
   * Only valid while isDragging is true.
   */
  computeScrollDelta(currentX: number, currentY: number): { dx: number; dy: number } {
    const dx = currentX - this._lastX;
    const dy = currentY - this._lastY;
    this._lastX = currentX;
    this._lastY = currentY;
    return { dx, dy };
  }
}
