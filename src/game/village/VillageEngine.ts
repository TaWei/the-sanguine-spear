import type { Unit } from '../units/Unit';
import { TerrainType } from '../map/Terrain';

export interface VillageReward {
  gold?: number;
  itemName?: string;
}

export class VillageEngine {
  private visitedVillages = new Set<string>();

  canVisit(unit: Unit, x: number, y: number, terrain: TerrainType): boolean {
    if (terrain !== TerrainType.VILLAGE) return false;
    if (unit.isEnemy || !unit.isAlive) return false;
    const key = `${x},${y}`;
    if (this.visitedVillages.has(key)) return false;
    return true;
  }

  visit(x: number, y: number): { success: boolean; reason?: string } {
    const key = `${x},${y}`;
    if (this.visitedVillages.has(key)) {
      return { success: false, reason: 'Already visited' };
    }
    this.visitedVillages.add(key);
    return { success: true };
  }

  isVisited(x: number, y: number): boolean {
    return this.visitedVillages.has(`${x},${y}`);
  }

  getVisitedVillages(): string[] {
    return Array.from(this.visitedVillages);
  }

  loadVisitedVillages(keys: string[]): void {
    this.visitedVillages = new Set(keys);
  }

  reset(): void {
    this.visitedVillages.clear();
  }
}
