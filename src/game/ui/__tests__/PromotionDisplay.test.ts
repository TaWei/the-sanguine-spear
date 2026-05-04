import { describe, it, expect } from 'vitest';
import { PromotionDisplay, PROMOTION_PHASE } from '../PromotionDisplay';
import { createStats } from '../../units/Stats';

describe('PromotionDisplay', () => {
  const oldStats = createStats({ hp: 22, str: 8, mag: 2, skl: 7, spd: 8, luk: 6, def: 6, res: 2, mov: 5 });
  const newStats = createStats({ hp: 26, str: 11, mag: 2, skl: 9, spd: 10, luk: 8, def: 9, res: 4, mov: 6 });
  const diff = { hp: 4, str: 3, skl: 2, spd: 2, luk: 2, def: 3, res: 2, mov: 1 };

  it('starts in BANNER_IN phase', () => {
    const d = new PromotionDisplay('Rowan', 'lord', 'paladin', oldStats, newStats, diff);
    expect(d.phase).toBe(PROMOTION_PHASE.BANNER_IN);
    expect(d.isComplete()).toBe(false);
  });

  it('advances from BANNER_IN to BANNER_HOLD after bannerDuration', () => {
    const d = new PromotionDisplay('Rowan', 'lord', 'paladin', oldStats, newStats, diff);
    d.update(400);
    expect(d.phase).toBe(PROMOTION_PHASE.BANNER_HOLD);
  });

  it('advances to CLASS_REVEAL after banner hold', () => {
    const d = new PromotionDisplay('Rowan', 'lord', 'paladin', oldStats, newStats, diff);
    d.update(300 + 600 + 10);
    expect(d.phase).toBe(PROMOTION_PHASE.CLASS_REVEAL);
  });

  it('advances to STATS_IN after class reveal', () => {
    const d = new PromotionDisplay('Rowan', 'lord', 'paladin', oldStats, newStats, diff);
    d.update(300 + 600 + 400 + 10);
    expect(d.phase).toBe(PROMOTION_PHASE.STATS_IN);
  });

  it('reveals stats one-by-one after stats settle', () => {
    const d = new PromotionDisplay('Rowan', 'lord', 'paladin', oldStats, newStats, diff);
    d.update(300 + 600 + 400 + 400 + 10);
    expect(d.phase).toBe(PROMOTION_PHASE.STAT_REVEAL);
    expect(d.getRevealProgress('hp')).toBeGreaterThan(0);
  });

  it('marks all stats revealed after enough time', () => {
    const d = new PromotionDisplay('Rowan', 'lord', 'paladin', oldStats, newStats, diff);
    d.update(10000);
    expect(d.allStatsRevealed()).toBe(true);
    expect(d.phase).toBe(PROMOTION_PHASE.WAIT_FOR_INPUT);
  });

  it('can be dismissed in WAIT_FOR_INPUT', () => {
    const d = new PromotionDisplay('Rowan', 'lord', 'paladin', oldStats, newStats, diff);
    d.update(10000);
    d.dismiss();
    expect(d.phase).toBe(PROMOTION_PHASE.DONE);
    expect(d.isComplete()).toBe(true);
  });

  it('reports correct stat diffs', () => {
    const d = new PromotionDisplay('Rowan', 'lord', 'paladin', oldStats, newStats, diff);
    expect(d.getDiff('hp')).toBe(4);
    expect(d.getDiff('str')).toBe(3);
    expect(d.getDiff('mag')).toBe(0);
  });

  it('exposes old and new class names', () => {
    const d = new PromotionDisplay('Rowan', 'lord', 'paladin', oldStats, newStats, diff);
    expect(d.oldClass).toBe('lord');
    expect(d.newClass).toBe('paladin');
  });

  it('exposes unit name', () => {
    const d = new PromotionDisplay('Rowan', 'lord', 'paladin', oldStats, newStats, diff);
    expect(d.unitName).toBe('Rowan');
  });
});
