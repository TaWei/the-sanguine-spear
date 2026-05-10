export const BANNER_PHASE = {
  FADE_IN: 'fade_in',
  HOLD: 'hold',
  FADE_OUT: 'fade_out',
  DONE: 'done',
} as const;
export type BannerPhase = (typeof BANNER_PHASE)[keyof typeof BANNER_PHASE];

export class TurnBannerTiming {
  private _elapsed = 0;
  private readonly fadeInDuration = 300;
  private readonly holdDuration = 2000;
  private readonly fadeOutDuration = 300;

  phase: BannerPhase = BANNER_PHASE.FADE_IN;

  get totalDuration(): number {
    return this.fadeInDuration + this.holdDuration + this.fadeOutDuration;
  }

  get textAlpha(): number {
    if (this.phase === BANNER_PHASE.DONE) return 0;
    if (this.phase === BANNER_PHASE.FADE_IN) {
      return Math.min(1, this._elapsed / this.fadeInDuration);
    }
    return 1; // HOLD and FADE_OUT: text at full alpha
  }

  get overlayAlpha(): number {
    if (this.phase === BANNER_PHASE.DONE) return 0;
    if (this.phase === BANNER_PHASE.FADE_OUT) {
      const fadeOutElapsed = this._elapsed - this.fadeInDuration - this.holdDuration;
      return Math.max(0, 1 - fadeOutElapsed / this.fadeOutDuration);
    }
    return 1;
  }

  get bannerProgress(): number {
    return Math.min(1, this._elapsed / this.fadeInDuration);
  }

  isComplete(): boolean {
    return this.phase === BANNER_PHASE.DONE;
  }

  update(deltaMs: number): void {
    if (this.phase === BANNER_PHASE.DONE) return;
    this._elapsed += deltaMs;

    const total = this._elapsed;
    if (this.phase === BANNER_PHASE.FADE_IN && total >= this.fadeInDuration) {
      this.phase = BANNER_PHASE.HOLD;
    }
    if (this.phase === BANNER_PHASE.HOLD && total >= this.fadeInDuration + this.holdDuration) {
      this.phase = BANNER_PHASE.FADE_OUT;
    }
    if (this.phase === BANNER_PHASE.FADE_OUT && total >= this.fadeInDuration + this.holdDuration + this.fadeOutDuration) {
      this.phase = BANNER_PHASE.DONE;
    }
  }
}
