import { Faction, type Unit } from '../units/Unit';
import type { Faction as FactionType } from '../units/Unit';
import type { Grid } from '../map/Grid';
import { computeVisibility, type VisibilityGrid } from './VisibilityMap';
import { FogTileState } from './FogTileState';

export class FogOfWar {
  /** Visibility per faction: PLAYER and ENEMY each have their own view */
  private playerVisibility: VisibilityGrid = new Map();
  private enemyVisibility: VisibilityGrid = new Map();
  private enabled = true;

  setEnabled(value: boolean): void {
    this.enabled = value;
    if (!value) {
      this.playerVisibility = new Map();
      this.enemyVisibility = new Map();
    }
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  update(allUnits: Unit[], grid: Grid): void {
    if (!this.enabled) return;
    this.playerVisibility = computeVisibility(
      allUnits,
      grid,
      Faction.PLAYER,
      this.playerVisibility,
    );
    this.enemyVisibility = computeVisibility(
      allUnits,
      grid,
      Faction.ENEMY,
      this.enemyVisibility,
    );
  }

  /** Get visibility for a specific faction */
  getVisibility(faction: FactionType): VisibilityGrid {
    return faction === Faction.PLAYER ? this.playerVisibility : this.enemyVisibility;
  }

  /** Check if a unit is visible to the given faction */
  isUnitVisible(unit: Unit, viewerFaction: FactionType): boolean {
    if (!this.enabled) return true;
    const key = `${unit.gridX},${unit.gridY}`;
    const visibility = this.getVisibility(viewerFaction);
    return visibility.get(key) === FogTileState.VISIBLE;
  }

  /** Get the fog state of a tile for a faction */
  getTileState(x: number, y: number, faction: FactionType): FogTileState {
    if (!this.enabled) return FogTileState.VISIBLE;
    const visibility = this.getVisibility(faction);
    return visibility.get(`${x},${y}`) ?? FogTileState.UNSEEN;
  }

  reset(): void {
    this.playerVisibility = new Map();
    this.enemyVisibility = new Map();
  }
}
