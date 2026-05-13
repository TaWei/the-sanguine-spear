import { describe, it, expect, vi } from 'vitest';
import { SpriteAtlas } from '../SpriteAtlas';
import { UnitAnimator } from '../UnitAnimator';

describe('SpriteAtlas', () => {
  const atlas = new SpriteAtlas();

  it('returns the correct texture key for a unit class', () => {
    const key = atlas.getTextureKey('lord', 'player', 'idle');
    expect(key).toBe('lord-player');
  });

  it('returns weapon-specific texture key for attack/crit', () => {
    const key = atlas.getTextureKey('mercenary', 'player', 'attack', 'sword');
    expect(key).toBe('mercenary-player-sword');
  });

  it('returns the correct animation key for a unit class', () => {
    const key = atlas.getAnimationKey('lord', 'player', 'idle');
    expect(key).toBe('lord-player-idle');
  });

  it('returns weapon-specific animation key for attack/crit', () => {
    const key = atlas.getAnimationKey('mercenary', 'player', 'attack', 'sword');
    expect(key).toBe('mercenary-player-sword-attack');
  });

  it('returns generic fallback texture key', () => {
    const key = atlas.getFallbackTextureKey('player');
    expect(key).toBe('generic-player');
  });

  it('returns generic fallback animation key', () => {
    const key = atlas.getFallbackAnimationKey('player', 'idle');
    expect(key).toBe('generic-player-idle');
  });

  it('returns correct facing direction', () => {
    expect(atlas.getFacing(0, 5)).toBe('right');
    expect(atlas.getFacing(5, 0)).toBe('left');
    expect(atlas.getFacing(3, 3)).toBe('right');
  });

  it('returns correct frame counts', () => {
    expect(atlas.getFrameCount('idle')).toBe(2);
    expect(atlas.getFrameCount('move')).toBe(4);
    expect(atlas.getFrameCount('attack')).toBe(6);
    expect(atlas.getFrameCount('death')).toBe(4);
    expect(atlas.getFrameCount('crit')).toBe(8);
  });

  it('returns all state frame counts', () => {
    const counts = atlas.getStateFrameCounts();
    expect(counts.idle).toBe(2);
    expect(counts.crit).toBe(8);
  });
});

describe('UnitAnimator', () => {
  it('plays idle on construction', () => {
    const atlas = new SpriteAtlas();
    const mockSprite = {
      setTexture: vi.fn(),
      setFlipX: vi.fn(),
      play: vi.fn(),
    };
    new UnitAnimator(atlas, mockSprite, 'lord', 'player');
    expect(mockSprite.setTexture).toHaveBeenCalledWith('lord-player');
    expect(mockSprite.play).toHaveBeenCalledWith('lord-player-idle');
  });

  it('plays attack with weapon type', () => {
    const atlas = new SpriteAtlas();
    const mockSprite = {
      setTexture: vi.fn(),
      setFlipX: vi.fn(),
      play: vi.fn(),
    };
    const animator = new UnitAnimator(atlas, mockSprite, 'lord', 'player');
    animator.playAttack('sword');
    expect(mockSprite.setTexture).toHaveBeenCalledWith('lord-player-sword');
    expect(mockSprite.play).toHaveBeenCalledWith('lord-player-sword-attack');
  });
});
