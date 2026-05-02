import { Grid } from './Grid';

export class Cursor {
  private _x: number = 0;
  private _y: number = 0;
  private grid: Grid;

  constructor(grid: Grid) {
    this.grid = grid;
  }

  get x(): number { return this._x; }
  get y(): number { return this._y; }

  move(dx: number, dy: number): void {
    this.setPosition(this._x + dx, this._y + dy);
  }

  setPosition(x: number, y: number): void {
    this._x = Math.max(0, Math.min(x, this.grid.cols - 1));
    this._y = Math.max(0, Math.min(y, this.grid.rows - 1));
  }
}
