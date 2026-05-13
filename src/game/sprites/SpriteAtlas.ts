export type AnimationState = 'idle' | 'move' | 'attack' | 'hit' | 'death' | 'dodge' | 'crit';
export type Facing = 'left' | 'right';

export interface SpriteKey {
  class: string;
  faction: string;
  state: AnimationState;
  weapon?: string;
}

export class SpriteAtlas {
  /**
   * Returns the texture key (spritesheet name) for a given unit.
   * This is the key passed to Phaser's load.spritesheet().
   */
  getTextureKey(unitClass: string, faction: string, state: AnimationState, weapon?: string): string {
    if (weapon && (state === 'attack' || state === 'crit')) {
      return `${unitClass}-${faction}-${weapon}`;
    }
    return `${unitClass}-${faction}`;
  }

  /**
   * Returns the animation key for a given unit and state.
   * This is the key passed to Phaser's anims.create() and sprite.play().
   */
  getAnimationKey(unitClass: string, faction: string, state: AnimationState, weapon?: string): string {
    if (weapon && (state === 'attack' || state === 'crit')) {
      return `${unitClass}-${faction}-${weapon}-${state}`;
    }
    return `${unitClass}-${faction}-${state}`;
  }

  /**
   * Returns fallback texture key when class-specific sprite is missing.
   */
  getFallbackTextureKey(faction: string): string {
    return `generic-${faction}`;
  }

  /**
   * Returns fallback animation key when class-specific sprite is missing.
   */
  getFallbackAnimationKey(faction: string, state: AnimationState): string {
    return `generic-${faction}-${state}`;
  }

  /**
   * Get frame count for a given animation state.
   */
  getFrameCount(state: AnimationState): number {
    switch (state) {
      case 'idle': return 2;
      case 'move': return 4;
      case 'attack': return 6;
      case 'hit': return 2;
      case 'death': return 4;
      case 'dodge': return 2;
      case 'crit': return 8;
      default: return 1;
    }
  }

  /**
   * Get all state frame counts as a record.
   */
  getStateFrameCounts(): Record<AnimationState, number> {
    return {
      idle: 2,
      move: 4,
      attack: 6,
      hit: 2,
      death: 4,
      dodge: 2,
      crit: 8,
    };
  }

  /**
   * Get the facing direction based on source and target positions.
   */
  getFacing(fromX: number, toX: number): Facing {
    return toX >= fromX ? 'right' : 'left';
  }
}
