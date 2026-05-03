import { describe, it, expect } from 'vitest';
import * as game from '../index';

describe('smoke test', () => {
  it('proves the test runner works', () => {
    expect(1 + 1).toBe(2);
  });

  it('can import progression types from game barrel', () => {
    expect(game.ProgressionEngine).toBeDefined();
    expect(game.createGrowthRates).toBeDefined();
    expect(game.CLASS_CAPS).toBeDefined();
    expect(game.levelUp).toBeDefined();
  });
});
