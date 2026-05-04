import { describe, it, expect } from 'vitest';
import { GrowthRates, createGrowthRates } from '../GrowthRates';

describe('GrowthRates', () => {
  it('creates growth rates for all stats', () => {
    const growths: GrowthRates = createGrowthRates({
      hp: 80,
      str: 55,
      mag: 20,
      skl: 50,
      spd: 60,
      luk: 45,
      def: 35,
      res: 25,
      mov: 0,
    });
    expect(growths.hp).toBe(80);
    expect(growths.str).toBe(55);
    expect(growths.mov).toBe(0);
  });

  it('defaults missing stats to 0', () => {
    const growths = createGrowthRates({ hp: 50 });
    expect(growths.hp).toBe(50);
    expect(growths.str).toBe(0);
    expect(growths.skl).toBe(0);
  });

  it('clamps negative growths to 0', () => {
    const growths = createGrowthRates({ hp: -10 });
    expect(growths.hp).toBe(0);
  });

  it('clamps growths above 100 to 100', () => {
    const growths = createGrowthRates({ hp: 150 });
    expect(growths.hp).toBe(100);
  });
});
