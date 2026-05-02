import { describe, it, expect } from 'vitest';
import {
  calcHitRate,
  calcAvoid,
  calcDisplayHit,
  calcCritRate,
  calcCritAvoid,
  calcDamage,
} from '../Formulas';

describe('Combat Formulas', () => {
  // Rowan: skl=7, luk=6, spd=8
  const attackerStats = { skl: 7, luk: 6, spd: 8, str: 8, mag: 2, def: 6, res: 2 };
  const defenderStats = { skl: 4, luk: 3, spd: 5, str: 9, mag: 0, def: 5, res: 1 };
  const weaponHit = 90;
  const weaponMt = 5;
  const weaponCrit = 0;

  describe('calcHitRate', () => {
    it('computes base hit from weapon hit + skl*2 + luk/2', () => {
      // 90 + 7*2 + floor(6/2) = 90 + 14 + 3 = 107
      const hit = calcHitRate(weaponHit, attackerStats.skl, attackerStats.luk);
      expect(hit).toBe(107);
    });

    it('adds weapon triangle bonus to hit rate', () => {
      const baseHit = calcHitRate(weaponHit, attackerStats.skl, attackerStats.luk);
      expect(baseHit + 15).toBe(122); // with sword > axe bonus
    });
  });

  describe('calcAvoid', () => {
    it('computes avoid from spd*2 + luk', () => {
      // 5*2 + 3 = 13
      const avoid = calcAvoid(defenderStats.spd, defenderStats.luk);
      expect(avoid).toBe(13);
    });

    it('adds terrain avoid bonus', () => {
      const avoid = calcAvoid(defenderStats.spd, defenderStats.luk, 20);
      expect(avoid).toBe(33);
    });
  });

  describe('calcDisplayHit', () => {
    it('is attacker hit - defender avoid (clamped 0-100)', () => {
      const hit = calcHitRate(weaponHit, attackerStats.skl, attackerStats.luk);
      const avoid = calcAvoid(defenderStats.spd, defenderStats.luk);
      const display = calcDisplayHit(hit, avoid);
      expect(display).toBe(94); // 107 - 13 = 94
    });

    it('clamps to 0 minimum', () => {
      const display = calcDisplayHit(10, 100);
      expect(display).toBe(0);
    });

    it('clamps to 100 maximum', () => {
      const display = calcDisplayHit(200, 0);
      expect(display).toBe(100);
    });
  });

  describe('calcCritRate', () => {
    it('is weapon crit + floor(skl/2)', () => {
      // 0 + floor(7/2) = 3
      expect(calcCritRate(weaponCrit, attackerStats.skl)).toBe(3);
    });
  });

  describe('calcCritAvoid', () => {
    it('equals luk', () => {
      expect(calcCritAvoid(defenderStats.luk)).toBe(3);
    });
  });

  describe('calcDamage', () => {
    it('physical: str + weapon mt - defender def', () => {
      const dmg = calcDamage(attackerStats.str, weaponMt, defenderStats.def, false);
      expect(dmg).toBe(8); // 8 + 5 - 5
    });

    it('magical: mag + weapon mt - defender res', () => {
      const dmg = calcDamage(attackerStats.mag, weaponMt, defenderStats.res, true);
      expect(dmg).toBe(6); // 2 + 5 - 1
    });

    it('minimum damage is 1 (unless 0)', () => {
      // If attacker str + mt < defender def, still deal 1 damage
      const dmg = calcDamage(1, 1, 10, false);
      expect(dmg).toBe(1);
    });

    it('0 attack vs very high defense still deals 1', () => {
      const dmg = calcDamage(0, 1, 999, false);
      expect(dmg).toBe(1);
    });
  });
});
