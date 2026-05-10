import type { Unit } from '../units/Unit';
import { SupportRank, getRankFromPoints, RANK_BONUSES } from './SupportRank';

export interface SupportPair {
  unitAId: string;
  unitBId: string;
  points: number;
  rank: SupportRank;
  /** Points gained this chapter (capped per chapter) */
  chapterPoints: number;
}

const MAX_POINTS_PER_CHAPTER = 80;
const BASE_POINTS_PER_TURN = 10;

export class SupportEngine {
  private pairs: SupportPair[] = [];

  /**
   * Process support points for units that ended their turns adjacent.
   */
  processSupportPoints(unitA: Unit, unitB: Unit): void {
    if (unitA.faction !== unitB.faction) return;
    if (!unitA.isAlive || !unitB.isAlive) return;

    const pair = this.getOrCreatePair(unitA.id, unitB.id);

    // Cap per chapter
    if (pair.chapterPoints >= MAX_POINTS_PER_CHAPTER) return;

    const gain = Math.min(BASE_POINTS_PER_TURN, MAX_POINTS_PER_CHAPTER - pair.chapterPoints);
    pair.points += gain;
    pair.chapterPoints += gain;

    // Check rank up
    const newRank = getRankFromPoints(pair.points);
    if (newRank > pair.rank) {
      pair.rank = newRank;
    }
  }

  /**
   * Get support rank between two units.
   */
  getRank(unitAId: string, unitBId: string): SupportRank {
    const pair = this.findPair(unitAId, unitBId);
    return pair?.rank ?? SupportRank.NONE;
  }

  /**
   * Get combat bonuses for an attacker when a support partner is adjacent.
   */
  getCombatBonus(attacker: Unit, adjacentSupporter: Unit): {
    hit: number;
    avoid: number;
    crit: number;
    critAvoid: number;
  } {
    const rank = this.getRank(attacker.id, adjacentSupporter.id);
    return RANK_BONUSES[rank];
  }

  /**
   * Reset chapter points at end of chapter (not total points).
   */
  resetChapterPoints(): void {
    for (const pair of this.pairs) {
      pair.chapterPoints = 0;
    }
  }

  /**
   * Get all support data (for save/load).
   */
  getSupportData(): SupportPair[] {
    return this.pairs;
  }

  /**
   * Load support data (for save/load).
   */
  loadSupportData(data: SupportPair[]): void {
    this.pairs = data.map(p => ({ ...p }));
  }

  private getOrCreatePair(idA: string, idB: string): SupportPair {
    let pair = this.findPair(idA, idB);
    if (!pair) {
      pair = {
        unitAId: idA,
        unitBId: idB,
        points: 0,
        rank: SupportRank.NONE,
        chapterPoints: 0,
      };
      this.pairs.push(pair);
    }
    return pair;
  }

  private findPair(idA: string, idB: string): SupportPair | undefined {
    return this.pairs.find(
      p =>
        (p.unitAId === idA && p.unitBId === idB) ||
        (p.unitAId === idB && p.unitBId === idA),
    );
  }
}
