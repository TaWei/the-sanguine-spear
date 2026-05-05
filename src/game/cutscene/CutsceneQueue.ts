export class CutsceneQueue {
  private pending: string[] = [];
  private _isActive = false;
  private playFn: ((id: string, onComplete: () => void) => void) | null = null;
  private onDone: (() => void) | null = null;

  get isActive(): boolean {
    return this._isActive;
  }

  get pendingCount(): number {
    return this.pending.length;
  }

  enqueue(cutsceneId: string): void {
    this.pending.push(cutsceneId);
  }

  start(
    play: (id: string, onComplete: () => void) => void,
    onDone?: () => void,
  ): void {
    if (this._isActive || this.pending.length === 0) {
      return;
    }
    this.playFn = play;
    this.onDone = onDone ?? null;
    this._isActive = true;
    this.processNext();
  }

  setOnDone(onDone: () => void): void {
    this.onDone = onDone;
  }

  clear(): void {
    this.pending = [];
    this._isActive = false;
    this.playFn = null;
    this.onDone = null;
  }

  private processNext(): void {
    if (this.pending.length === 0) {
      this._isActive = false;
      this.playFn = null;
      this.onDone?.();
      this.onDone = null;
      return;
    }

    const id = this.pending.shift()!;
    this.playFn?.(id, () => {
      this.processNext();
    });
  }
}
