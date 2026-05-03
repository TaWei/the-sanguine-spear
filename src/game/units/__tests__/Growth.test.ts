import { describe, it, expect } from 'vitest';
import { rollLevelUp } from '../Growth';

function makeRng(sequence: number[]): () => number {
  let i = 0;
  return () => sequence[i++] ?? 0;
}

describe('Growth', () => {
  it('returns stat names that proc when RNG < growth rate', () => {
    // hp growth 80%: RN 0.5 * 100 = 50 < 80 → proc
    // str growth 55%: RN 0.5 * 100 = 50 < 55 → proc
    // mag growth 20%: RN 0.5 * 100 = 50 >= 20 → no proc
    const rng = makeRng([0.5, 0.5, 0.5]);
    const growths = { hp: 80, str: 55, mag: 20 };
    const result = rollLevelUp(growths, rng);
    expect(result).toContain('hp');
    expect(result).toContain('str');
    expect(result).not.toContain('mag');
  });

  it('returns empty array when no stats proc', () => {
    // All growths 0% or RN too high
    const rng = makeRng([0.99, 0.99, 0.99]);
    const growths = { hp: 50, str: 50, mag: 50 };
    const result = rollLevelUp(growths, rng);
    expect(result).toEqual([]);
  });

  it('returns all stats when RNG is 0 and growths are positive', () => {
    const rng = makeRng([0, 0, 0]);
    const growths = { hp: 1, str: 1, mag: 1 };
    const result = rollLevelUp(growths, rng);
    expect(result).toHaveLength(3);
    expect(result).toContain('hp');
    expect(result).toContain('str');
    expect(result).toContain('mag');
  });

  it('ignores stats with 0 or negative growth rates', () => {
    const rng = makeRng([0, 0]);
    const growths = { hp: 0, str: -5, mag: 100 };
    const result = rollLevelUp(growths, rng);
    expect(result).toEqual(['mag']);
  });

  it('uses rng() * 100 < rate formula', () => {
    // Exactly at threshold: rate 50, rng 0.5 → 0.5*100 = 50, 50 < 50 is false
    const rng = makeRng([0.5]);
    const growths = { hp: 50 };
    const result = rollLevelUp(growths, rng);
    expect(result).toEqual([]);

    // Just below threshold: rate 50, rng 0.499 → 49.9 < 50 → true
    const rng2 = makeRng([0.499]);
    const result2 = rollLevelUp(growths, rng2);
    expect(result2).toEqual(['hp']);
  });
});
