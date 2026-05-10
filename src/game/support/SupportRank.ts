export enum SupportRank {
  NONE = 0,
  C = 1,
  B = 2,
  A = 3,
}

export const RANK_THRESHOLDS: Record<SupportRank, number> = {
  [SupportRank.C]: 80,
  [SupportRank.B]: 160,
  [SupportRank.A]: 240,
  [SupportRank.NONE]: 0,
};

export const RANK_BONUSES: Record<SupportRank, { hit: number; avoid: number; crit: number; critAvoid: number }> = {
  [SupportRank.NONE]: { hit: 0, avoid: 0, crit: 0, critAvoid: 0 },
  [SupportRank.C]: { hit: 2, avoid: 2, crit: 2, critAvoid: 2 },
  [SupportRank.B]: { hit: 5, avoid: 5, crit: 5, critAvoid: 5 },
  [SupportRank.A]: { hit: 10, avoid: 10, crit: 10, critAvoid: 10 },
};

export function getRankFromPoints(points: number): SupportRank {
  if (points >= RANK_THRESHOLDS[SupportRank.A]) return SupportRank.A;
  if (points >= RANK_THRESHOLDS[SupportRank.B]) return SupportRank.B;
  if (points >= RANK_THRESHOLDS[SupportRank.C]) return SupportRank.C;
  return SupportRank.NONE;
}
