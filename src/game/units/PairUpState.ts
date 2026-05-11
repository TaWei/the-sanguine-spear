export class PairUpState {
  leadUnitId: string | null = null;
  guardUnitId: string | null = null;

  isPaired(): boolean {
    return this.leadUnitId !== null || this.guardUnitId !== null;
  }

  get isLead(): boolean {
    return this.guardUnitId !== null;
  }

  get isGuard(): boolean {
    return this.leadUnitId !== null;
  }

  clear(): void {
    this.leadUnitId = null;
    this.guardUnitId = null;
  }
}
