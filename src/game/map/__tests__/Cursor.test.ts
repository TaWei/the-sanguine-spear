import { describe, it, expect } from 'vitest';
import { Cursor } from '../Cursor';
import { Grid } from '../Grid';

describe('Cursor', () => {
  it('starts at (0, 0)', () => {
    const grid = new Grid(10, 8);
    const cursor = new Cursor(grid);
    expect(cursor.x).toBe(0);
    expect(cursor.y).toBe(0);
  });

  it('moves right within bounds', () => {
    const grid = new Grid(10, 8);
    const cursor = new Cursor(grid);
    cursor.move(1, 0);
    expect(cursor.x).toBe(1);
    expect(cursor.y).toBe(0);
  });

  it('moves down within bounds', () => {
    const grid = new Grid(10, 8);
    const cursor = new Cursor(grid);
    cursor.move(0, 1);
    expect(cursor.x).toBe(0);
    expect(cursor.y).toBe(1);
  });

  it('clamps x to left edge (0)', () => {
    const grid = new Grid(10, 8);
    const cursor = new Cursor(grid);
    cursor.move(-5, 0);
    expect(cursor.x).toBe(0);
  });

  it('clamps x to right edge (cols - 1)', () => {
    const grid = new Grid(10, 8);
    const cursor = new Cursor(grid);
    cursor.move(99, 0);
    expect(cursor.x).toBe(9);
  });

  it('clamps y to top edge (0)', () => {
    const grid = new Grid(10, 8);
    const cursor = new Cursor(grid);
    cursor.move(0, -5);
    expect(cursor.y).toBe(0);
  });

  it('clamps y to bottom edge (rows - 1)', () => {
    const grid = new Grid(10, 8);
    const cursor = new Cursor(grid);
    cursor.move(0, 99);
    expect(cursor.y).toBe(7);
  });

  it('setPosition clamps to bounds', () => {
    const grid = new Grid(5, 5);
    const cursor = new Cursor(grid);
    cursor.setPosition(-10, -10);
    expect(cursor.x).toBe(0);
    expect(cursor.y).toBe(0);
    cursor.setPosition(99, 99);
    expect(cursor.x).toBe(4);
    expect(cursor.y).toBe(4);
  });
});
