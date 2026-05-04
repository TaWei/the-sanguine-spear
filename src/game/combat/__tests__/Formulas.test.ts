import { describe, it, expect } from 'vitest';
import {
  calcHitRate,
  calcAvoid,
  calcDisplayHit,
  calcCritRate,
  calcCritAvoid,
  calcDisplayCrit,
  getClassCritBonus,
  calcDamage,
  rollTrueHit,
  rollCrit,
} from '../Formulas';

function makeRng(sequence: number[]): () => number {
  let i = 0;
  return () => sequence[i++] ?? 0;
}

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

    it('adds class bonus when provided', () => {
      expect(calcCritRate(0, 10, 15)).toBe(20); // 0 + 5 + 15
    });
  });

  describe('getClassCritBonus', () => {
    it('swordmaster gets +15', () => {
      expect(getClassCritBonus('swordmaster')).toBe(15);
    });

    it('berserker gets +15', () => {
      expect(getClassCritBonus('berserker')).toBe(15);
    });

    it('other classes get 0', () => {
      expect(getClassCritBonus('lord')).toBe(0);
      expect(getClassCritBonus('mercenary')).toBe(0);
      expect(getClassCritBonus('mage')).toBe(0);
    });
  });

  describe('calcCritAvoid', () => {
    it('equals luk', () => {
      expect(calcCritAvoid(defenderStats.luk)).toBe(3);
    });
  });

  describe('calcDisplayCrit', () => {
    it('is attacker crit rate - defender crit avoid', () => {
      const crit = calcCritRate(30, 10); // weapon 30 + floor(10/2) = 35
      const avoid = calcCritAvoid(5); // 5
      expect(calcDisplayCrit(crit, avoid)).toBe(30);
    });

    it('clamps to 0 minimum', () => {
      expect(calcDisplayCrit(3, 10)).toBe(0);
    });

    it('clamps to 100 maximum', () => {
      expect(calcDisplayCrit(200, 0)).toBe(100);
    });

    it('0 display crit means no crit possible', () => {
      expect(calcDisplayCrit(0, 0)).toBe(0);
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

  describe('2RN True Hit', () => {
    it('hits when average of two RNs < display hit', () => {
      // display hit = 70, RNs: 60, 70 → avg 65 < 70 → hit
      const rng = makeRng([60, 70]);
      expect(rollTrueHit(70, rng)).toBe(true);
    });

    it('misses when average >= display hit', () => {
      // display hit = 70, RNs: 80, 60 → avg 70 >= 70 → miss
      const rng = makeRng([80, 60]);
      expect(rollTrueHit(70, rng)).toBe(false);
    });

    it('guaranteed hit at display 100', () => {
      // avg of any two 0-99 numbers is < 100 always
      const rng = makeRng([99, 99]);
      expect(rollTrueHit(100, rng)).toBe(true);
    });

    it('guaranteed miss at display 0', () => {
      const rng = makeRng([0, 0]);
      expect(rollTrueHit(0, rng)).toBe(false);
    });

    it('99 display hit is very reliable (only misses on avg=99)', () => {
      // RNs: 99, 99 → avg 99 >= 99 → miss
      const rng = makeRng([99, 99]);
      expect(rollTrueHit(99, rng)).toBe(false);
      // RNs: 98, 99 → avg 98.5 < 99 → hit
      const rng2 = makeRng([98, 99]);
      expect(rollTrueHit(99, rng2)).toBe(true);
    });

    it('1 display hit is very unlikely (only hits on avg=0)', () => {
      const rng = makeRng([0, 0]);
      expect(rollTrueHit(1, rng)).toBe(true);
      const rng2 = makeRng([0, 2]);
      expect(rollTrueHit(1, rng2)).toBe(false);
    });
  });

  describe('Crit Roll', () => {
    it('single RN crit: RN < displayCrit → crit', () => {
      const rng = makeRng([2]);
      expect(rollCrit(5, rng)).toBe(true);
    });

    it('no crit when RN >= displayCrit', () => {
      const rng = makeRng([5]);
      expect(rollCrit(5, rng)).toBe(false);
    });
  });
});
