import { Faction, type Unit } from '../units/Unit';
import type { Faction as FactionType } from '../units/Unit';
import type { Grid } from '../map/Grid';
import { computeVisibility, type VisibilityGrid } from './VisibilityMap';
import { FogTileState } from './FogTileState';

export class FogOfWar {
  /** Visibility per faction: PLAYER and ENEMY each have their own view */
  private playerVisibility: VisibilityGrid = new Map();
  private enemyVisibility: VisibilityGrid = new Map();
  private allyVisibility: VisibilityGrid = new Map();
  private enabled = false;

  setEnabled(value: boolean): void {
    this.enabled = value;
    if (!value) {
      this.playerVisibility = new Map();
      this.enemyVisibility = new Map();
      this.allyVisibility = new Map();
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
    this.allyVisibility = computeVisibility(
      allUnits,
      grid,
      Faction.ALLY,
      this.allyVisibility,
    );
  }

  /** Get visibility for a specific faction */
  getVisibility(faction: FactionType): VisibilityGrid {
    if (faction === Faction.PLAYER) return this.playerVisibility;
    if (faction === Faction.ENEMY) return this.enemyVisibility;
    return this.allyVisibility;
  }

  /** Check if a unit is visible to the given faction */
  isUnitVisible(unit: Unit, viewerFaction: FactionType): boolean {
    if (!this.enabled) return true;
    const key = `${unit.gridX},${unit.gridY}`;
    const visibility = this.getVisibility(viewerFaction);
    return visibility.get(key) === FogTileState.VISIBLE;
  }

  /** Check if a unit is revealed (VISIBLE or DIMMED) to the given faction */
  isUnitRevealed(unit: Unit, viewerFaction: FactionType): boolean {
    if (!this.enabled) return true;
    const state = this.getUnitTileState(unit, viewerFaction);
    return state === FogTileState.VISIBLE || state === FogTileState.DIMMED;
  }

  /** Get the fog state of a tile for a faction */
  getTileState(x: number, y: number, faction: FactionType): FogTileState {
    if (!this.enabled) return FogTileState.VISIBLE;
    const visibility = this.getVisibility(faction);
    return visibility.get(`${x},${y}`) ?? FogTileState.UNSEEN;
  }

  /** Get the fog state of the tile a unit is standing on */
  getUnitTileState(unit: Unit, faction: FactionType): FogTileState {
    return this.getTileState(unit.gridX, unit.gridY, faction);
  }

  /** Check if a unit is targetable by the given faction in fog */
  isUnitTargetable(unit: Unit, viewerFaction: FactionType): boolean {
    if (!this.enabled) return true;
    const state = this.getUnitTileState(unit, viewerFaction);
    return state === FogTileState.VISIBLE || state === FogTileState.DIMMED;
  }

  reset(): void {
    this.playerVisibility = new Map();
    this.enemyVisibility = new Map();
    this.allyVisibility = new Map();
  }
}
