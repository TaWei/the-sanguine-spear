export class ExpPopup {
  startExp: number;
  targetExp: number;
  currentExp: number;
  leveledUp: boolean;
  private progress: number;
  private readonly duration: number;
  private elapsed: number;

  constructor(startExp: number, targetExp: number, leveledUp: boolean) {
    this.startExp = startExp;
    this.targetExp = targetExp;
    this.leveledUp = leveledUp;
    this.currentExp = startExp;
    this.progress = 0;
    this.duration = 600;
    this.elapsed = 0;
  }

  update(deltaMs: number): void {
    if (this.isComplete()) return;
    this.elapsed += deltaMs;
    this.progress = Math.min(1, this.elapsed / this.duration);
    this.currentExp = Math.round(
      this.startExp + this.progress * (this.targetExp - this.startExp),
    );
  }

  isComplete(): boolean {
    if (this.startExp === this.targetExp) return true;
    return this.progress >= 1;
  }

  getFillRatio(): number {
    if (this.startExp === this.targetExp) return 0;
    return this.progress;
  }
}
