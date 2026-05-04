import { Grid } from './map/Grid';
import { TerrainType } from './map/Terrain';
import { Unit, Faction, UnitClass } from './units/Unit';
import { UnitStats } from './units/Stats';
import { TurnManager } from './state/TurnManager';
import { ActionQueue, Action } from './state/ActionQueue';
import { computeMoveRange } from './movement/MoveRange';
import { WEAPON_DB } from './combat/Weapons';
import { Commander } from './ai/Commander';
import { ProgressionEngine } from './progression/ProgressionEngine';
import { getAdjacentEnemies } from './combat/Adjacency';
import { CombatEngine } from './combat/Engine';
import { WeaponData } from './combat/Weapons';
import { LevelObjectives, ObjectiveResult } from './objectives/LevelObjectives';
import { findPath } from './movement/Pathfinder';
import { GridNeighbor } from './map/Grid';
import { TerrainHazardEngine, HazardReport } from './hazards/TerrainHazardEngine';
import { LevelDefinition } from './levels/LevelDefinition';

export class GameEngine {
  readonly grid: Grid;
  readonly turnManager: TurnManager;
  private units: Unit[] = [];
  private actionQueue: ActionQueue;
  private commander: Commander;
  private progressionEngine: ProgressionEngine;
  private hazardEngine: TerrainHazardEngine;

  constructor(cols: number, rows: number) {
    this.grid = new Grid(cols, rows);
    this.turnManager = new TurnManager();
    this.actionQueue = new ActionQueue();
    this.commander = new Commander(this.grid, WEAPON_DB);
    this.progressionEngine = new ProgressionEngine();
    this.hazardEngine = new TerrainHazardEngine();
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

  loadLevel(def: LevelDefinition): void {
    // Reset existing state
    this.units = [];
    // Re-initialize grid with new dimensions if needed
    if (this.grid.cols !== def.cols || this.grid.rows !== def.rows) {
      (this as any).grid = new Grid(def.cols, def.rows);
    } else {
      // Clear existing grid
      for (let y = 0; y < this.grid.rows; y++) {
        for (let x = 0; x < this.grid.cols; x++) {
          this.grid.setTerrain(x, y, TerrainType.PLAINS);
          if (this.grid.getUnit(x, y)) {
            this.grid.removeUnit(x, y);
          }
        }
      }
    }
    // Apply terrain
    for (const t of def.terrain) {
      this.grid.setTerrain(t.x, t.y, t.type);
    }
    // Place units
    for (const u of def.units) {
      this.addUnit(u.id, u.name, u.faction, u.unitClass, u.stats, u.x, u.y);
    }
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

  findPath(unit: Unit, destX: number, destY: number): GridNeighbor[] | null {
    return findPath(unit, this.grid, destX, destY);
  }

  moveUnit(unit: Unit, x: number, y: number): void {
    const oldX = unit.gridX;
    const oldY = unit.gridY;
    if (oldX === x && oldY === y) {
      return;
    }

    const target = this.grid.getUnit(x, y);
    if (target && target !== unit) {
      throw new Error(
        `Cannot move ${unit.name} to (${String(x)},${String(y)}): occupied by ${target.name}`,
      );
    }

    this.grid.removeUnit(oldX, oldY);
    unit.moveTo(x, y);
    this.grid.placeUnit(unit, x, y);
  }

  setTerrain(x: number, y: number, type: TerrainType): void {
    this.grid.setTerrain(x, y, type);
  }

  awardCombatExp(unit: Unit, _damageDealt: number, killed: boolean): void {
    const amount = killed ? 40 : 10;
    this.progressionEngine.grantExp(unit, amount);
  }

  applyCombatExp(
    unit: Unit,
    combatResult: import('./combat/Engine').CombatResult,
  ): import('./progression/ProgressionEngine').ProgressionResult | null {
    if (!unit.isAlive || combatResult.expAward <= 0) {
      return null;
    }
    return this.progressionEngine.grantExp(unit, combatResult.expAward);
  }

  getWeaponForUnit(unit: Unit): WeaponData {
    if (unit.unitClass === 'mage') {
      return WEAPON_DB.Fire;
    }
    if (unit.unitClass === 'brigand') {
      return WEAPON_DB['Iron Axe'];
    }
    if (unit.unitClass === 'berserker') {
      return WEAPON_DB['Killer Axe'];
    }
    if (unit.unitClass === 'soldier') {
      return WEAPON_DB['Iron Lance'];
    }
    if (unit.unitClass === 'swordmaster') {
      return WEAPON_DB['Killer Sword'];
    }
    return WEAPON_DB['Iron Sword'];
  }

  getAdjacentEnemies(unit: Unit): Unit[] {
    return getAdjacentEnemies(unit, this.grid, this.getWeaponForUnit(unit));
  }

  resolvePlayerCombat(
    attacker: Unit,
    defender: Unit,
    rng?: () => number,
  ): import('./combat/Engine').CombatResult {
    const combat = new CombatEngine(this.grid);
    const attWeapon = this.getWeaponForUnit(attacker);
    const defWeapon = this.getWeaponForUnit(defender);
    return combat.resolveCombat(attacker, defender, attWeapon, defWeapon, rng);
  }

  getCombatPreview(attacker: Unit, defender: Unit): import('./combat/Engine').CombatPreview {
    const combat = new CombatEngine(this.grid);
    const attWeapon = this.getWeaponForUnit(attacker);
    const defWeapon = this.getWeaponForUnit(defender);
    return combat.previewCombat(attacker, defender, attWeapon, defWeapon);
  }

  checkObjectives(): ObjectiveResult {
    return new LevelObjectives(this.units).check();
  }

  removeDeadUnits(): void {
    for (const unit of this.units) {
      if (!unit.isAlive) {
        this.grid.removeUnit(unit.gridX, unit.gridY);
      }
    }
  }

  allPlayerUnitsExhausted(): boolean {
    const livePlayers = this.getUnitsByFaction(Faction.PLAYER).filter((u) => u.isAlive);
    if (livePlayers.length === 0) {
      return true;
    }
    return livePlayers.every((u) => u.state.isExhausted());
  }

  getThreatenedTiles(unit: Unit): Set<string> {
    const moveRange = computeMoveRange(unit, this.grid);
    const weapon = this.getWeaponForUnit(unit);
    const threatened = new Set<string>();
    const directions = [
      { dx: 0, dy: -1 },
      { dx: 0, dy: 1 },
      { dx: -1, dy: 0 },
      { dx: 1, dy: 0 },
    ];

    moveRange.forEach((_cost, moveKey) => {
      const [mx, my] = moveKey.split(',').map(Number);
      for (const { dx, dy } of directions) {
        for (let dist = weapon.minRange; dist <= weapon.maxRange; dist++) {
          const ax = mx + dx * dist;
          const ay = my + dy * dist;
          if (!this.grid.isInBounds(ax, ay)) {
            continue;
          }
          const key = `${String(ax)},${String(ay)}`;
          if (!moveRange.has(key)) {
            threatened.add(key);
          }
        }
      }
    });

    return threatened;
  }

  endTurn(): HazardReport {
    const liveUnits = this.getLiveUnits();
    this.turnManager.advancePhase(liveUnits);

    // Apply terrain hazards at the start of the new phase
    const hazardReport = this.hazardEngine.applyHazards(this.getLiveUnits(), this.grid);

    if (this.turnManager.isEnemyPhase()) {
      const enemies = this.getUnitsByFaction(Faction.ENEMY);
      const players = this.getUnitsByFaction(Faction.PLAYER);
      const actions = this.commander.planEnemyTurn(enemies, players);
      for (const action of actions) {
        this.actionQueue.enqueue(action);
      }
    }

    return hazardReport;
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
