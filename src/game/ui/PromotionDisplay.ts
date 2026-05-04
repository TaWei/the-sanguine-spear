import { UnitStats } from '../units/Stats';

export const PROMOTION_PHASE = {
  BANNER_IN: 'banner_in',
  BANNER_HOLD: 'banner_hold',
  CLASS_REVEAL: 'class_reveal',
  STATS_IN: 'stats_in',
  STAT_REVEAL: 'stat_reveal',
  WAIT_FOR_INPUT: 'wait_for_input',
  DONE: 'done',
} as const;
export type PromotionPhase = (typeof PROMOTION_PHASE)[keyof typeof PROMOTION_PHASE];

const STAT_KEYS: (keyof UnitStats)[] = ['hp', 'str', 'mag', 'skl', 'spd', 'luk', 'def', 'res', 'mov'];

export class PromotionDisplay {
  readonly unitName: string;
  readonly oldClass: string;
  readonly newClass: string;
  readonly oldStats: UnitStats;
  readonly newStats: UnitStats;
  private readonly diff: Partial<Record<keyof UnitStats, number>>;

  private _elapsed = 0;
  phase: PromotionPhase = PROMOTION_PHASE.BANNER_IN;

  private readonly bannerInDuration = 300;
  private readonly bannerHoldDuration = 600;
  private readonly classRevealDuration = 400;
  private readonly statsInDuration = 400;
  private readonly statRevealDelay = 80;

  constructor(
    unitName: string,
    oldClass: string,
    newClass: string,
    oldStats: UnitStats,
    newStats: UnitStats,
    diff: Partial<Record<keyof UnitStats, number>>,
  ) {
    this.unitName = unitName;
    this.oldClass = oldClass;
    this.newClass = newClass;
    this.oldStats = oldStats;
    this.newStats = newStats;
    this.diff = diff;
  }

  get elapsed(): number {
    return this._elapsed;
  }

  update(deltaMs: number): void {
    if (this.phase === PROMOTION_PHASE.DONE) return;
    this._elapsed += deltaMs;

    while (true) {
      const t = this._elapsed;
      if (this.phase === PROMOTION_PHASE.BANNER_IN && t >= this.bannerInDuration) {
        this.phase = PROMOTION_PHASE.BANNER_HOLD;
        continue;
      }
      if (this.phase === PROMOTION_PHASE.BANNER_HOLD && t >= this.bannerInDuration + this.bannerHoldDuration) {
        this.phase = PROMOTION_PHASE.CLASS_REVEAL;
        continue;
      }
      if (
        this.phase === PROMOTION_PHASE.CLASS_REVEAL &&
        t >= this.bannerInDuration + this.bannerHoldDuration + this.classRevealDuration
      ) {
        this.phase = PROMOTION_PHASE.STATS_IN;
        continue;
      }
      if (
        this.phase === PROMOTION_PHASE.STATS_IN &&
        t >= this.bannerInDuration + this.bannerHoldDuration + this.classRevealDuration + this.statsInDuration
      ) {
        this.phase = PROMOTION_PHASE.STAT_REVEAL;
        continue;
      }
      if (this.phase === PROMOTION_PHASE.STAT_REVEAL && this.allStatsRevealed()) {
        this.phase = PROMOTION_PHASE.WAIT_FOR_INPUT;
        continue;
      }
      break;
    }
  }

  getRevealProgress(statKey: keyof UnitStats): number {
    if (this.phase === PROMOTION_PHASE.DONE || this.phase === PROMOTION_PHASE.WAIT_FOR_INPUT) return 1;
    if (this.phase !== PROMOTION_PHASE.STAT_REVEAL) return 0;
    const base =
      this.bannerInDuration + this.bannerHoldDuration + this.classRevealDuration + this.statsInDuration;
    const index = STAT_KEYS.indexOf(statKey);
    const revealStart = base + index * this.statRevealDelay;
    return Math.max(0, Math.min(1, (this._elapsed - revealStart) / this.statRevealDelay));
  }

  allStatsRevealed(): boolean {
    const lastIndex = STAT_KEYS.length - 1;
    const base =
      this.bannerInDuration + this.bannerHoldDuration + this.classRevealDuration + this.statsInDuration;
    return this._elapsed >= base + lastIndex * this.statRevealDelay + this.statRevealDelay;
  }

  dismiss(): void {
    if (this.phase === PROMOTION_PHASE.WAIT_FOR_INPUT) {
      this.phase = PROMOTION_PHASE.DONE;
    }
  }

  isComplete(): boolean {
    return this.phase === PROMOTION_PHASE.DONE;
  }

  getDiff(statKey: keyof UnitStats): number {
    return this.diff[statKey] ?? 0;
  }

  hasDiff(statKey: keyof UnitStats): boolean {
    return (this.diff[statKey] ?? 0) !== 0;
  }
}
