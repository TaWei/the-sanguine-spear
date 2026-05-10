export class StatCounter {
  readonly oldValue: number;
  readonly newValue: number;
  private readonly duration: number;
  private _elapsed = 0;

  constructor(oldValue: number, newValue: number, duration: number) {
    this.oldValue = oldValue;
    this.newValue = newValue;
    this.duration = duration;
  }

  get hasChanged(): boolean {
    return this.oldValue !== this.newValue;
  }

  get progress(): number {
    if (this.duration <= 0 || this.oldValue === this.newValue) return 1;
    return Math.min(1, this._elapsed / this.duration);
  }

  get current(): number {
    if (this.oldValue === this.newValue) return this.newValue;
    if (this._elapsed >= this.duration) return this.newValue;
    const t = this._elapsed / this.duration;
    const interpolated = this.oldValue + (this.newValue - this.oldValue) * t;
    // Ceil when counting up, floor when counting down, to reach final value cleanly
    return this.newValue > this.oldValue ? Math.ceil(interpolated) : Math.floor(interpolated);
  }

  isComplete(): boolean {
    return this._elapsed >= this.duration || this.oldValue === this.newValue;
  }

  update(deltaMs: number): void {
    this._elapsed += deltaMs;
  }
}
