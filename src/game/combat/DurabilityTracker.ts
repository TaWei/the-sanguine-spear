export interface DurabilityTracker {
  readonly uses: number;
  readonly isBroken: boolean;
  readonly wasUsed: boolean;
  /** Consume 1 use. Returns false when weapon just broke (uses hit 0). */
  consume(): boolean;
}

export function createDurabilityTracker(initial: number): DurabilityTracker {
  let uses = Math.max(0, initial);
  let wasUsed = false;

  return {
    get uses() {
      return uses;
    },
    get isBroken() {
      return uses <= 0;
    },
    get wasUsed() {
      return wasUsed;
    },

    consume(): boolean {
      if (uses <= 0) return false;
      uses -= 1;
      wasUsed = true;
      return uses > 0; // still usable after this consume
    },
  };
}
