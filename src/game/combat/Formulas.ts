export function calcHitRate(weaponHit: number, skl: number, luk: number): number {
  return weaponHit + skl * 2 + Math.floor(luk / 2);
}

export function calcAvoid(spd: number, luk: number, terrainAvoid: number = 0): number {
  return spd * 2 + luk + terrainAvoid;
}

export function calcDisplayHit(hitRate: number, avoid: number): number {
  return Math.max(0, Math.min(100, hitRate - avoid));
}

export function calcCritRate(weaponCrit: number, skl: number): number {
  return weaponCrit + Math.floor(skl / 2);
}

export function calcCritAvoid(luk: number): number {
  return luk;
}

export function calcDamage(
  attackStat: number,
  weaponMt: number,
  defenseStat: number,
  _isMagical: boolean,
): number {
  const rawDamage = attackStat + weaponMt - defenseStat;
  return Math.max(1, rawDamage);
}

export function rollTrueHit(displayHit: number, rng: () => number): boolean {
  const rn1 = rng();
  const rn2 = rng();
  const avg = (rn1 + rn2) / 2;
  return avg < displayHit;
}

export function rollCrit(displayCrit: number, rng: () => number): boolean {
  return rng() < displayCrit;
}
