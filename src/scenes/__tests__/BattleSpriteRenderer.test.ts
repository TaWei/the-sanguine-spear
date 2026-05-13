import { describe, it, expect, vi } from 'vitest';
import { BattleSpriteRenderer } from '../BattleSpriteRenderer';
import { Unit, Faction, UnitClass } from '../../game/units/Unit';
import { createStats } from '../../game/units/Stats';

function createMockScene() {
  const container = { setDepth: vi.fn(() => container), add: vi.fn(), destroy: vi.fn(), x: 0, y: 0, setX: vi.fn() };
  const sprite = {
    setScale: vi.fn(() => sprite),
    setFlipX: vi.fn(() => sprite),
    setTint: vi.fn(() => sprite),
    clearTint: vi.fn(() => sprite),
    play: vi.fn(() => sprite),
    setTexture: vi.fn(() => sprite),
    destroy: vi.fn(),
  };
  const rect = { setFillStyle: vi.fn(() => rect), setSize: vi.fn(() => rect), setX: vi.fn(() => rect), destroy: vi.fn() };
  const text = { setOrigin: vi.fn(() => text), setText: vi.fn(() => text), setDepth: vi.fn(() => text), destroy: vi.fn() };

  return {
    add: {
      container: vi.fn(() => container),
      sprite: vi.fn(() => sprite),
      rectangle: vi.fn(() => rect),
      text: vi.fn(() => text),
    },
    textures: { exists: vi.fn(() => true) },
    anims: { exists: vi.fn(() => true) },
    tweens: { add: vi.fn() },
    time: { delayedCall: vi.fn() },
    _mocks: { container, sprite, rect, text },
  } as unknown as Phaser.Scene & { _mocks: { container: typeof container; sprite: typeof sprite; rect: typeof rect; text: typeof text } };
}

describe('BattleSpriteRenderer', () => {
  const stats = createStats({ hp: 20, maxHp: 20, str: 5, mag: 2, skl: 5, spd: 5, luk: 5, def: 5, res: 2, mov: 5 });

  it('constructs without crashing', () => {
    const scene = createMockScene();
    const unit = new Unit('u1', 'Test', Faction.PLAYER, UnitClass.LORD, { ...stats }, 0, 0);
    const renderer = new BattleSpriteRenderer(scene, 100, 100, unit, null, 20, true);
    expect(renderer).toBeDefined();
    expect(renderer.getContainer()).toBe(scene._mocks.container);
  });

  it('updates HP display correctly', () => {
    const scene = createMockScene();
    const unit = new Unit('u1', 'Test', Faction.PLAYER, UnitClass.LORD, { ...stats }, 0, 0);
    const renderer = new BattleSpriteRenderer(scene, 100, 100, unit, null, 20, true);
    renderer.setHp(10);
    expect(scene._mocks.rect.setFillStyle).toHaveBeenCalled();
  });

  it('plays animation delegates to sprite', () => {
    const scene = createMockScene();
    const unit = new Unit('u1', 'Test', Faction.PLAYER, UnitClass.LORD, { ...stats }, 0, 0);
    const renderer = new BattleSpriteRenderer(scene, 100, 100, unit, null, 20, true);
    renderer.playAnimation('attack', 'sword');
    // The animatable wrapper checks scene.anims.exists before calling sprite.play
    expect(scene.anims.exists).toHaveBeenCalled();
  });
});
