export class ConfirmationDialog {
  private _isOpen = false;
  private _confirmed: boolean | null = null;

  get isOpen(): boolean {
    return this._isOpen;
  }

  get confirmed(): boolean | null {
    return this._confirmed;
  }

  open(): void {
    this._isOpen = true;
    this._confirmed = null;
  }

  confirm(): void {
    this._confirmed = true;
    this._isOpen = false;
  }

  cancel(): void {
    this._confirmed = false;
    this._isOpen = false;
  }

  reset(): void {
    this._isOpen = false;
    this._confirmed = null;
  }
}
