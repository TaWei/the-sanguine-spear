import { Grid } from './map/Grid';
import { TerrainType } from './map/Terrain';
import { Unit, Faction, UnitClass } from './units/Unit';
import { UnitStats } from './units/Stats';
import { TurnManager } from './state/TurnManager';
import { ActionQueue, Action } from './state/ActionQueue';
import { computeMoveRange } from './movement/MoveRange';
import { WEAPON_DB } from './combat/Weapons';
import { Commander } from './ai/Commander';

export class GameEngine {
  readonly grid: Grid;
  readonly turnManager: TurnManager;
  private units: Unit[] = [];
  private actionQueue: ActionQueue;
  private commander: Commander;

  constructor(cols: number, rows: number) {
    this.grid = new Grid(cols, rows);
    this.turnManager = new TurnManager();
    this.actionQueue = new ActionQueue();
    this.commander = new Commander(this.grid, WEAPON_DB);
  }

  addUnit(
    id: string,
    name: string,
    faction: Faction,
    unitClass: UnitClass,
    stats: UnitStats,
    gridX: number,
    gridY: number,
  ): Unit {
    const unit = new Unit(id, name, faction, unitClass, stats, gridX, gridY);
    this.units.push(unit);
    this.grid.placeUnit(unit, gridX, gridY);
    return unit;
  }

  getUnit(x: number, y: number): Unit | null {
    return this.grid.getUnit(x, y);
  }

  getUnitsByFaction(faction: Faction): Unit[] {
    return this.units.filter((u) => u.faction === faction);
  }

  getAllUnits(): Unit[] {
    return this.units;
  }

  getLiveUnits(): Unit[] {
    return this.units.filter((u) => u.isAlive);
  }

  getMoveRange(unit: Unit): Map<string, number> {
    return computeMoveRange(unit, this.grid);
  }

  moveUnit(unit: Unit, x: number, y: number): void {
    const oldX = unit.gridX;
    const oldY = unit.gridY;
    this.grid.removeUnit(oldX, oldY);
    unit.moveTo(x, y);
    this.grid.placeUnit(unit, x, y);
  }

  setTerrain(x: number, y: number, type: TerrainType): void {
    this.grid.setTerrain(x, y, type);
  }

  endTurn(): void {
    const liveUnits = this.getLiveUnits();
    this.turnManager.advancePhase(liveUnits);

    if (this.turnManager.isEnemyPhase()) {
      const enemies = this.getUnitsByFaction(Faction.ENEMY);
      const players = this.getUnitsByFaction(Faction.PLAYER);
      const actions = this.commander.planEnemyTurn(enemies, players);
      for (const action of actions) {
        this.actionQueue.enqueue(action);
      }
    }
  }

  getPendingActions(): Action[] {
    const actions: Action[] = [];
    while (!this.actionQueue.isEmpty()) {
      const a = this.actionQueue.dequeue();
      if (a) {
        actions.push(a);
      }
    }
    return actions;
  }
}
