/**
 * Snap a world-space grid line coordinate to the nearest device pixel.
 * Prevents anti-aliased varying line thickness when camera scrollX has fractional values.
 *
 * @param worldX - The raw world-space x coordinate of the grid line
 * @param scrollX - The camera's current scrollX value
 * @returns A world-space x coordinate that, when rendered at screen position (worldX - scrollX), lands exactly on a pixel boundary
 */
export function snapGridLine(worldX: number, scrollX: number): number {
  const screenX = worldX - scrollX;
  const snappedScreen = Math.round(screenX);
  return snappedScreen + scrollX;
}
