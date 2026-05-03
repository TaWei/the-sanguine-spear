import { describe, it, expect } from 'vitest';
import { createStats } from '../Stats';

describe('UnitStats', () => {
  it('creates stats from required values', () => {
    const stats = createStats({
      hp: 20, str: 8, mag: 2, skl: 7, spd: 8,
      luk: 6, def: 6, res: 2, mov: 5,
    });
    expect(stats.hp).toBe(20);
    expect(stats.maxHp).toBe(20);
    expect(stats.str).toBe(8);
    expect(stats.mov).toBe(5);
  });

  it('hp starts at maxHp when not specified', () => {
    const stats = createStats({
      hp: 20, str: 5, mag: 5, skl: 5, spd: 5,
      luk: 5, def: 5, res: 5, mov: 5,
    });
    expect(stats.hp).toBe(20);
    expect(stats.maxHp).toBe(20);
  });

  it('hp can differ from maxHp', () => {
    const stats = createStats({
      hp: 15, maxHp: 22, str: 5, mag: 5, skl: 5, spd: 5,
      luk: 5, def: 5, res: 5, mov: 5,
    });
    expect(stats.hp).toBe(15);
    expect(stats.maxHp).toBe(22);
  });

  it('clamps hp to maxHp', () => {
    const stats = createStats({
      hp: 999, maxHp: 30, str: 5, mag: 5, skl: 5, spd: 5,
      luk: 5, def: 5, res: 5, mov: 5,
    });
    expect(stats.hp).toBe(30);
  });

  it('clamps hp to 0 minimum', () => {
    const stats = createStats({
      hp: -5, str: 5, mag: 5, skl: 5, spd: 5,
      luk: 5, def: 5, res: 5, mov: 5,
    });
    expect(stats.hp).toBe(0);
  });
});
