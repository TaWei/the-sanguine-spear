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

  private get visualDistance(): number {
    if (this.startExp === this.targetExp) {
      return 0;
    }
    if (this.leveledUp) {
      return (100 - this.startExp) + this.targetExp;
    }
    return this.targetExp - this.startExp;
  }

  private get visualExp(): number {
    const dist = this.visualDistance;
    if (dist === 0) {
      return this.startExp;
    }
    const traveled = this.progress * dist;
    if (this.leveledUp) {
      const toCap = 100 - this.startExp;
      if (traveled <= toCap) {
        return this.startExp + traveled;
      }
      return traveled - toCap;
    }
    return this.startExp + traveled;
  }

  update(deltaMs: number): void {
    if (this.isComplete()) {
      return;
    }
    this.elapsed += deltaMs;
    this.progress = Math.min(1, this.elapsed / this.duration);
    this.currentExp = Math.round(this.visualExp);
  }

  isComplete(): boolean {
    if (this.startExp === this.targetExp) {
      return true;
    }
    return this.progress >= 1;
  }

  getFillRatio(): number {
    if (this.startExp === this.targetExp) {
      return 0;
    }
    return this.visualExp / 100;
  }
}
