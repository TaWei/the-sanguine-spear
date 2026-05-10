import { describe, it, expect } from 'vitest';
import { snapGridLine } from '../GridLineSnapper';

describe('GridLineSnapper', () => {
  it('snaps line at world 48 to pixel boundary when scrollX is integer', () => {
    // worldX=48, scrollX=0 → screen=48 → snapped screen=48 → world=48
    expect(snapGridLine(48, 0)).toBe(48);
  });

  it('snaps line at world 96 to pixel boundary when scrollX is integer', () => {
    expect(snapGridLine(96, 100)).toBe(96);
  });

  it('snaps line when scrollX has fractional value', () => {
    // worldX=48, scrollX=2.5 → screen=45.5 → snapped screen=46 → world=48.5
    // But the ideal is: we want the screen position to be an integer.
    // worldX_snapped = round(worldX - scrollX) + scrollX
    // = round(48 - 2.5) + 2.5 = round(45.5) + 2.5 = 46 + 2.5 = 48.5
    const result = snapGridLine(48, 2.5);
    // screen position = result - scrollX = 48.5 - 2.5 = 46.0 ✓ integer!
    expect(result - 2.5).toBe(46);
  });

  it('snaps to nearest integer screen position', () => {
    // worldX=48, scrollX=0.3 → screen=47.7 → snapped screen=48 → world=48.3
    const result = snapGridLine(48, 0.3);
    expect(result - 0.3).toBe(48);
  });

  it('snaps line at world 0 to pixel boundary', () => {
    // worldX=0, scrollX=10.7 → screen=-10.7 → snapped screen=-11 → world=-0.3
    const result = snapGridLine(0, 10.7);
    expect(result - 10.7).toBe(-11);
  });

  it('handles negative world coordinate (camera scrolled past origin)', () => {
    // worldX=-24, scrollX=-10.3 → screen=-13.7 → snapped screen=-14 → world=-24.3
    const result = snapGridLine(-24, -10.3);
    expect(result + 10.3).toBe(-14);
  });

  it('returns original when already pixel-aligned', () => {
    // worldX=240, scrollX=17.0 → screen=223.0 → already integer → world=240
    expect(snapGridLine(240, 17.0)).toBe(240);
  });

  it('large map: multiple tiles stay evenly spaced after snapping', () => {
    const scrollX = 123.456;
    const TILE_SIZE = 48;
    const snapped0 = snapGridLine(0, scrollX);
    const snapped1 = snapGridLine(TILE_SIZE, scrollX);
    const snapped2 = snapGridLine(TILE_SIZE * 2, scrollX);
    // Screen positions should differ by exactly TILE_SIZE
    expect((snapped1 - scrollX) - (snapped0 - scrollX)).toBe(TILE_SIZE);
    expect((snapped2 - scrollX) - (snapped1 - scrollX)).toBe(TILE_SIZE);
  });
});
