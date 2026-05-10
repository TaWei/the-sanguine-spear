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
   * Returns the sprite key string for a given unit class, faction, and animation state.
   */
  getSpriteKey(unitClass: string, faction: string, state: AnimationState, weapon?: string): string {
    if (weapon && (state === 'attack' || state === 'crit')) {
      return `${unitClass}-${faction}-${weapon}-${state}`;
    }
    return `${unitClass}-${faction}-${state}`;
  }

  /**
   * Returns fallback key when class-specific sprite is missing.
   */
  getFallbackKey(faction: string, state: AnimationState): string {
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
   * Get the facing direction based on source and target positions.
   */
  getFacing(fromX: number, toX: number): Facing {
    return toX >= fromX ? 'right' : 'left';
  }
}
