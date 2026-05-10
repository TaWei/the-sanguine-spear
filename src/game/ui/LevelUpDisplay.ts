import { UnitStats } from '../units/Stats';
import { StatCounter } from './StatCounter';

export const LEVEL_UP_PHASE = {
  BANNER_IN: 'banner_in',
  BANNER_HOLD: 'banner_hold',
  STATS_IN: 'stats_in',
  STAT_REVEAL: 'stat_reveal',
  STAT_COUNTING: 'stat_counting',
  WAIT_FOR_INPUT: 'wait_for_input',
  DONE: 'done',
} as const;
export type LevelUpPhase = (typeof LEVEL_UP_PHASE)[keyof typeof LEVEL_UP_PHASE];

const STAT_KEYS: (keyof UnitStats)[] = ['hp', 'str', 'mag', 'skl', 'spd', 'luk', 'def', 'res', 'mov'];
const COUNTING_DURATION = 350; // ms for numbers to count up

export class LevelUpDisplay {
  readonly unitName: string;
  readonly newLevel: number;
  readonly oldStats: UnitStats;
  readonly newStats: UnitStats;
  readonly increases: string[];
  readonly counters: Map<keyof UnitStats, StatCounter>;

  private _elapsed = 0;
  phase: LevelUpPhase = LEVEL_UP_PHASE.BANNER_IN;

  // Timing constants (ms)
  private readonly bannerInDuration = 300;
  private readonly bannerHoldDuration = 800;
  private readonly statsInDuration = 400;
  private readonly statRevealDelay = 80; // ms between each stat reveal

  constructor(
    unitName: string,
    newLevel: number,
    oldStats: UnitStats,
    newStats: UnitStats,
    increases: string[],
  ) {
    this.unitName = unitName;
    this.newLevel = newLevel;
    this.oldStats = oldStats;
    this.newStats = newStats;
    this.increases = increases;

    // Create StatCounters for each stat that changed
    this.counters = new Map();
    for (const key of STAT_KEYS) {
      if (this.isIncreased(key)) {
        this.counters.set(key, new StatCounter(oldStats[key] ?? 0, newStats[key] ?? 0, COUNTING_DURATION));
      }
    }
  }

  get elapsed(): number {
    return this._elapsed;
  }

  update(deltaMs: number): void {
    if (this.phase === LEVEL_UP_PHASE.DONE) return;
    this._elapsed += deltaMs;

    // Update all active counters during counting phase
    if (this.phase === LEVEL_UP_PHASE.STAT_COUNTING) {
      for (const counter of this.counters.values()) {
        counter.update(deltaMs);
      }
    }

    while (true) {
      if (this.phase === LEVEL_UP_PHASE.BANNER_IN && this._elapsed >= this.bannerInDuration) {
        this.phase = LEVEL_UP_PHASE.BANNER_HOLD;
        continue;
      }
      if (this.phase === LEVEL_UP_PHASE.BANNER_HOLD && this._elapsed >= this.bannerInDuration + this.bannerHoldDuration) {
        this.phase = LEVEL_UP_PHASE.STATS_IN;
        continue;
      }
      if (this.phase === LEVEL_UP_PHASE.STATS_IN && this._elapsed >= this.bannerInDuration + this.bannerHoldDuration + this.statsInDuration) {
        this.phase = LEVEL_UP_PHASE.STAT_REVEAL;
        continue;
      }
      if (this.phase === LEVEL_UP_PHASE.STAT_REVEAL && this.allStatsRevealed()) {
        this.phase = LEVEL_UP_PHASE.STAT_COUNTING;
        // Update counters immediately so allCountersDone() works this frame
        for (const counter of this.counters.values()) {
          counter.update(deltaMs);
        }
        continue;
      }
      if (this.phase === LEVEL_UP_PHASE.STAT_COUNTING && this.allCountersDone()) {
        this.phase = LEVEL_UP_PHASE.WAIT_FOR_INPUT;
        continue;
      }
      break;
    }
  }

  getRevealProgress(statKey: keyof UnitStats): number {
    if (this.phase === LEVEL_UP_PHASE.DONE || this.phase === LEVEL_UP_PHASE.WAIT_FOR_INPUT || this.phase === LEVEL_UP_PHASE.STAT_COUNTING) {
      return 1;
    }
    if (this.phase !== LEVEL_UP_PHASE.STAT_REVEAL) {
      return 0;
    }
    const index = STAT_KEYS.indexOf(statKey);
    const revealStart =
      this.bannerInDuration + this.bannerHoldDuration + this.statsInDuration + index * this.statRevealDelay;
    const progress = Math.max(0, Math.min(1, (this._elapsed - revealStart) / this.statRevealDelay));
    return progress;
  }

  allStatsRevealed(): boolean {
    const lastIndex = STAT_KEYS.length - 1;
    const revealStart =
      this.bannerInDuration + this.bannerHoldDuration + this.statsInDuration + lastIndex * this.statRevealDelay;
    return this._elapsed >= revealStart + this.statRevealDelay;
  }

  /** Get the currently-displayed value for a stat (counting animation in progress). */
  getCurrentValue(statKey: keyof UnitStats): number {
    const counter = this.counters.get(statKey);
    if (counter) {
      return counter.current;
    }
    // Stat didn't change — return the stable value
    return (this.newStats[statKey] ?? 0);
  }

  /** Whether this stat is mid-counting animation. */
  isCounting(statKey: keyof UnitStats): boolean {
    const counter = this.counters.get(statKey);
    if (!counter) return false;
    return !counter.isComplete();
  }

  private allCountersDone(): boolean {
    for (const counter of this.counters.values()) {
      if (!counter.isComplete()) return false;
    }
    return true;
  }

  dismiss(): void {
    if (this.phase === LEVEL_UP_PHASE.WAIT_FOR_INPUT) {
      this.phase = LEVEL_UP_PHASE.DONE;
    }
  }

  isComplete(): boolean {
    return this.phase === LEVEL_UP_PHASE.DONE;
  }

  getDiff(statKey: keyof UnitStats): number {
    return (this.newStats[statKey] ?? 0) - (this.oldStats[statKey] ?? 0);
  }

  isIncreased(statKey: keyof UnitStats): boolean {
    return this.increases.includes(statKey as string);
  }
}
