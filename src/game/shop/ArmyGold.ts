export class ArmyGold {
  private _amount: number;

  constructor(startingAmount = 0) {
    this._amount = Math.max(0, startingAmount);
  }

  get amount(): number {
    return this._amount;
  }

  add(amount: number): void {
    if (amount > 0) {
      this._amount += amount;
    }
  }

  canAfford(amount: number): boolean {
    return this._amount >= amount;
  }

  spend(amount: number): boolean {
    if (amount <= 0 || !this.canAfford(amount)) {
      return false;
    }
    this._amount -= amount;
    return true;
  }
}
