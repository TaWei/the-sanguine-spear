import { describe, it, expect } from 'vitest';
import { LevelUpDisplay, LEVEL_UP_PHASE } from '../LevelUpDisplay';
import { createStats } from '../../units/Stats';

describe('LevelUpDisplay', () => {
  const oldStats = createStats({ hp: 20, str: 8, mag: 2, skl: 7, spd: 8, luk: 6, def: 6, res: 2, mov: 5 });
  const newStats = createStats({ hp: 21, str: 8, mag: 2, skl: 8, spd: 8, luk: 6, def: 6, res: 2, mov: 5 });
  const increases = ['hp', 'skl'];

  it('starts in BANNER_IN phase', () => {
    const d = new LevelUpDisplay('Rowan', 2, oldStats, newStats, increases);
    expect(d.phase).toBe(LEVEL_UP_PHASE.BANNER_IN);
    expect(d.isComplete()).toBe(false);
  });

  it('advances from BANNER_IN to BANNER_HOLD after bannerDuration', () => {
    const d = new LevelUpDisplay('Rowan', 2, oldStats, newStats, increases);
    d.update(400); // bannerInDuration = 300ms
    expect(d.phase).toBe(LEVEL_UP_PHASE.BANNER_HOLD);
  });

  it('advances to STATS_IN after bannerHoldDuration', () => {
    const d = new LevelUpDisplay('Rowan', 2, oldStats, newStats, increases);
    d.update(300 + 800 + 10);
    expect(d.phase).toBe(LEVEL_UP_PHASE.STATS_IN);
  });

  it('reveals stats one-by-one after stats settle', () => {
    const d = new LevelUpDisplay('Rowan', 2, oldStats, newStats, increases);
    d.update(300 + 800 + 400 + 10); // into STAT_REVEAL
    expect(d.phase).toBe(LEVEL_UP_PHASE.STAT_REVEAL);
    expect(d.getRevealProgress('hp')).toBeGreaterThan(0);
  });

  it('marks all stats revealed after enough time', () => {
    const d = new LevelUpDisplay('Rowan', 2, oldStats, newStats, increases);
    d.update(10000);
    expect(d.allStatsRevealed()).toBe(true);
    expect(d.phase).toBe(LEVEL_UP_PHASE.WAIT_FOR_INPUT);
  });

  it('can be dismissed in WAIT_FOR_INPUT', () => {
    const d = new LevelUpDisplay('Rowan', 2, oldStats, newStats, increases);
    d.update(10000);
    d.dismiss();
    expect(d.phase).toBe(LEVEL_UP_PHASE.DONE);
    expect(d.isComplete()).toBe(true);
  });

  it('reports correct stat diffs', () => {
    const d = new LevelUpDisplay('Rowan', 2, oldStats, newStats, increases);
    expect(d.getDiff('hp')).toBe(1);
    expect(d.getDiff('str')).toBe(0);
    expect(d.isIncreased('hp')).toBe(true);
    expect(d.isIncreased('str')).toBe(false);
  });
});
