import { describe, it, expect, beforeEach } from 'vitest';
import { SupportEngine } from '../SupportEngine';
import { SupportRank, getRankFromPoints } from '../SupportRank';
import { Unit, Faction } from '../../units/Unit';
import { createStats } from '../../units/Stats';

function createUnit(id: string, faction: Faction = Faction.PLAYER): Unit {
  return new Unit(id, id, faction, 'lord', createStats({
    hp: 20, maxHp: 20, str: 8, mag: 2, skl: 7, spd: 8, luk: 6, def: 6, res: 2, mov: 5,
  }), 0, 0);
}

describe('SupportEngine', () => {
  let engine: SupportEngine;

  beforeEach(() => {
    engine = new SupportEngine();
  });

  it('accumulates support points when units end turn adjacent', () => {
    const a = createUnit('a');
    const b = createUnit('b');

    engine.processSupportPoints(a, b);

    expect(engine.getRank('a', 'b')).toBe(SupportRank.NONE);
    // Points should be 10
    const pair = engine.getSupportData()[0];
    expect(pair.points).toBe(10);
  });

  it('ranks up from NONE to C at threshold', () => {
    const a = createUnit('a');
    const b = createUnit('b');

    // 8 turns adjacent = 80 points = C rank
    for (let i = 0; i < 8; i++) {
      engine.processSupportPoints(a, b);
    }

    expect(engine.getRank('a', 'b')).toBe(SupportRank.C);
  });

  it('ranks up from C to B at threshold', () => {
    const a = createUnit('a');
    const b = createUnit('b');

    // First chapter: build up to C rank (80 points cap)
    for (let i = 0; i < 8; i++) {
      engine.processSupportPoints(a, b);
    }
    expect(engine.getRank('a', 'b')).toBe(SupportRank.C);

    // Reset chapter points (simulating chapter transition)
    engine.resetChapterPoints();

    // Second chapter: build up to B rank
    for (let i = 0; i < 8; i++) {
      engine.processSupportPoints(a, b);
    }

    expect(engine.getRank('a', 'b')).toBe(SupportRank.B);
  });

  it('provides combat bonuses based on rank', () => {
    const a = createUnit('a');
    const b = createUnit('b');

    // Build up to C rank
    for (let i = 0; i < 8; i++) {
      engine.processSupportPoints(a, b);
    }

    const bonus = engine.getCombatBonus(a, b);
    expect(bonus.hit).toBeGreaterThan(0);
    expect(bonus.avoid).toBeGreaterThan(0);
  });

  it('caps support points per chapter', () => {
    const a = createUnit('a');
    const b = createUnit('b');

    // Try to gain more than 80 points this chapter
    for (let i = 0; i < 12; i++) {
      engine.processSupportPoints(a, b);
    }

    const pair = engine.getSupportData()[0];
    expect(pair.chapterPoints).toBeLessThanOrEqual(80);
  });

  it('can reset chapter points without losing total', () => {
    const a = createUnit('a');
    const b = createUnit('b');

    // Gain 10 points
    engine.processSupportPoints(a, b);

    const totalBefore = engine.getSupportData()[0].points;
    engine.resetChapterPoints();
    const chapterAfter = engine.getSupportData()[0].chapterPoints;

    expect(chapterAfter).toBe(0);
    expect(engine.getSupportData()[0].points).toBe(totalBefore);
  });
});

describe('getRankFromPoints', () => {
  it('returns NONE for 0 points', () => {
    expect(getRankFromPoints(0)).toBe(SupportRank.NONE);
  });

  it('returns C for 80+ points', () => {
    expect(getRankFromPoints(80)).toBe(SupportRank.C);
  });

  it('returns B for 160+ points', () => {
    expect(getRankFromPoints(160)).toBe(SupportRank.B);
  });

  it('returns A for 240+ points', () => {
    expect(getRankFromPoints(240)).toBe(SupportRank.A);
  });
});
