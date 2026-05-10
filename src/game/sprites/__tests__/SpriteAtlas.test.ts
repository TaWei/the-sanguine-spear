import { describe, it, expect } from 'vitest';
import { SpriteAtlas } from '../SpriteAtlas';
import { UnitAnimator } from '../UnitAnimator';

describe('SpriteAtlas', () => {
  const atlas = new SpriteAtlas();

  it('returns the correct sprite key for a unit class', () => {
    const key = atlas.getSpriteKey('lord', 'player', 'idle');
    expect(key).toBe('lord-player-idle');
  });

  it('maps weapon type to animation variant', () => {
    const key = atlas.getSpriteKey('mercenary', 'player', 'attack', 'sword');
    expect(key).toBe('mercenary-player-sword-attack');
  });

  it('returns generic fallback for unknown class', () => {
    const key = atlas.getFallbackKey('player', 'idle');
    expect(key).toBe('generic-player-idle');
  });

  it('returns correct facing direction', () => {
    expect(atlas.getFacing(0, 5)).toBe('right');
    expect(atlas.getFacing(5, 0)).toBe('left');
    expect(atlas.getFacing(3, 3)).toBe('right'); // same position defaults to right
  });

  it('returns correct frame counts', () => {
    expect(atlas.getFrameCount('idle')).toBe(2);
    expect(atlas.getFrameCount('move')).toBe(4);
    expect(atlas.getFrameCount('attack')).toBe(6);
    expect(atlas.getFrameCount('death')).toBe(4);
    expect(atlas.getFrameCount('crit')).toBe(8);
  });
});
