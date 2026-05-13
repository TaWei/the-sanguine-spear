import type { Facing } from './SpriteAtlas';
import { SpriteAtlas } from './SpriteAtlas';
import type { AnimationState } from './SpriteAtlas';

export interface AnimatableSprite {
  setTexture(key: string): void;
  setFlipX(flip: boolean): void;
  play(animationKey: string): void;
}

export class UnitAnimator {
  private atlas: SpriteAtlas;
  private sprite: AnimatableSprite;
  private facing: Facing = 'right';
  private unitClass: string;
  private faction: string;

  constructor(
    atlas: SpriteAtlas,
    sprite: AnimatableSprite,
    unitClass: string,
    faction: string,
  ) {
    this.atlas = atlas;
    this.sprite = sprite;
    this.unitClass = unitClass;
    this.faction = faction;
    this.playAnimation('idle');
  }

  playAnimation(state: AnimationState, weapon?: string): void {
    const textureKey = this.atlas.getTextureKey(this.unitClass, this.faction, state, weapon);
    const animKey = this.atlas.getAnimationKey(this.unitClass, this.faction, state, weapon);
    try {
      this.sprite.setTexture(textureKey);
      this.sprite.play(animKey);
    } catch {
      // Fallback to generic
      const fallbackTexture = this.atlas.getFallbackTextureKey(this.faction);
      const fallbackAnim = this.atlas.getFallbackAnimationKey(this.faction, state);
      this.sprite.setTexture(fallbackTexture);
      this.sprite.play(fallbackAnim);
    }
    this.sprite.setFlipX(this.facing === 'left');
  }

  setFacing(facing: Facing): void {
    this.facing = facing;
    this.sprite.setFlipX(facing === 'left');
  }

  faceTarget(fromX: number, toX: number): void {
    this.setFacing(this.atlas.getFacing(fromX, toX));
  }

  playIdle(): void {
    this.playAnimation('idle');
  }

  playMove(): void {
    this.playAnimation('move');
  }

  playAttack(weapon?: string): void {
    this.playAnimation('attack', weapon);
  }

  playCritical(weapon?: string): void {
    this.playAnimation('crit', weapon);
  }

  playHit(): void {
    this.playAnimation('hit');
  }

  playDeath(): void {
    this.playAnimation('death');
  }

  playDodge(): void {
    this.playAnimation('dodge');
  }
}
