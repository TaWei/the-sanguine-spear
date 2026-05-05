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
import { createWeaponItem, WeaponItem, Item, createStaffItem, StaffItem, PromotionItem } from './items/ItemTypes';
import { StaffEngine, StaffResult } from './staves/StaffEngine';
import { getHealTargets } from './staves/getHealTargets';
import { StaffData, STAFF_DB } from './staves/Staves';
import { LevelObjectives, ObjectiveResult } from './objectives/LevelObjectives';
import { findPath } from './movement/Pathfinder';
import { GridNeighbor } from './map/Grid';
import { TerrainHazardEngine, HazardReport } from './hazards/TerrainHazardEngine';
import { LevelDefinition } from './levels/LevelDefinition';
import { CutsceneTriggerEngine } from './cutscene/TriggerEngine';
import { CutsceneTrigger, TriggerContext } from './cutscene/CutsceneTrigger';
import { PromotionEngine } from './promotion/PromotionEngine';
import { AiBehavior } from './ai/Behavior';
import { AiPersonality } from './ai/Personality';
import { SaveData, SAVE_VERSION, TerrainSnapshot } from './save/SaveData';
import { serializeUnit, deserializeUnit } from './save/UnitSerializer';

export class GameEngine {
  grid: Grid;
  readonly turnManager: TurnManager;
  private units: Unit[] = [];
  private actionQueue: ActionQueue;
  private commander: Commander;
  private progressionEngine: ProgressionEngine;
  private hazardEngine: TerrainHazardEngine;
  private triggerEngine = new CutsceneTriggerEngine();
  private promotionEngine = new PromotionEngine();

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
    options?: import('./units/Unit').UnitOptions,
  ): Unit {
    const unit = new Unit(id, name, faction, unitClass, stats, gridX, gridY, options);
    const startingItems = getStartingItems(unitClass);
    for (const item of startingItems) {
      unit.inventory.add(item);
    }
    this.units.push(unit);
    this.grid.placeUnit(unit, gridX, gridY);
    return unit;
  }

  loadLevel(def: LevelDefinition): void {
    // Reset existing state
    this.units = [];
    this.triggerEngine.reset();
    // Re-initialize grid with new dimensions if needed
    if (this.grid.cols !== def.cols || this.grid.rows !== def.rows) {
      this.grid = new Grid(def.cols, def.rows);
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
      this.addUnit(u.id, u.name, u.faction, u.unitClass, u.stats, u.x, u.y, {
        aiBehavior: u.aiBehavior,
        aiPersonality: u.aiPersonality,
      });
    }
    // Register triggers
    this.triggerEngine.register(def.triggers ?? []);
  }

  snapshot(levelId: string): SaveData {
    const terrain: TerrainSnapshot[] = [];
    for (let y = 0; y < this.grid.rows; y++) {
      for (let x = 0; x < this.grid.cols; x++) {
        terrain.push({ x, y, type: this.grid.getTerrain(x, y) });
      }
    }
    return {
      version: SAVE_VERSION,
      timestamp: Date.now(),
      levelId,
      turnNumber: this.turnManager.turnNumber,
      currentPhase: this.turnManager.currentPhase,
      gridCols: this.grid.cols,
      gridRows: this.grid.rows,
      terrain,
      units: this.units.map(serializeUnit),
      consumedTriggers: Array.from(this.triggerEngine.getConsumed()),
      firstCombatOccurred: this.triggerEngine.getFirstCombatOccurred(),
    };
  }

  restore(data: SaveData): void {
    this.grid = new Grid(data.gridCols, data.gridRows);
    for (const t of data.terrain) {
      this.grid.setTerrain(t.x, t.y, t.type);
    }
    this.units = [];
    for (const snap of data.units) {
      const unit = deserializeUnit(snap);
      this.units.push(unit);
      this.grid.placeUnit(unit, unit.gridX, unit.gridY);
    }
    this.turnManager.turnNumber = data.turnNumber;
    this.turnManager.currentPhase = data.currentPhase;
    this.triggerEngine.setConsumed(new Set(data.consumedTriggers));
    this.triggerEngine.setFirstCombatOccurred(data.firstCombatOccurred);
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

  getWeaponForUnit(unit: Unit, weaponIndex?: number): WeaponData {
    if (
      weaponIndex !== undefined &&
      weaponIndex >= 0 &&
      weaponIndex < unit.inventory.items.length
    ) {
      const item = unit.inventory.items[weaponIndex];
      if (item && item.kind === 'weapon') {
        const w = item as WeaponItem;
        return {
          name: w.name,
          type: w.weaponType,
          mt: w.mt,
          hit: w.hit,
          crit: w.crit,
          minRange: w.minRange,
          maxRange: w.maxRange,
          usesMagic: w.usesMagic,
        };
      }
    }
    const invWeapon = unit.inventory.items.find((i) => i.kind === 'weapon') as WeaponItem | undefined;
    if (invWeapon) {
      return {
        name: invWeapon.name,
        type: invWeapon.weaponType,
        mt: invWeapon.mt,
        hit: invWeapon.hit,
        crit: invWeapon.crit,
        minRange: invWeapon.minRange,
        maxRange: invWeapon.maxRange,
        usesMagic: invWeapon.usesMagic,
      };
    }
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

  getStaffForUnit(unit: Unit): { data: StaffData; index: number } | null {
    const index = unit.inventory.items.findIndex((i) => i.kind === 'staff');
    if (index === -1) return null;
    const item = unit.inventory.items[index] as StaffItem;
    return {
      data: {
        name: item.name,
        healAmount: item.healAmount,
        minRange: item.minRange,
        maxRange: item.maxRange,
      },
      index,
    };
  }

  getHealTargets(unit: Unit): Unit[] {
    const staffInfo = this.getStaffForUnit(unit);
    if (!staffInfo) return [];
    return getHealTargets(unit, this.grid, staffInfo.data);
  }

  resolveStaffHeal(healer: Unit, target: Unit): StaffResult {
    const staffInfo = this.getStaffForUnit(healer);
    if (!staffInfo) {
      throw new Error(`${healer.name} has no staff`);
    }
    const engine = new StaffEngine();
    return engine.resolve(healer, target, staffInfo.data, healer.inventory, staffInfo.index);
  }

  applyStaffExp(unit: Unit, staffResult: StaffResult): import('./progression/ProgressionEngine').ProgressionResult | null {
    if (!unit.isAlive || staffResult.expAward <= 0) {
      return null;
    }
    return this.progressionEngine.grantExp(unit, staffResult.expAward);
  }

  resolvePlayerCombat(
    attacker: Unit,
    defender: Unit,
    rng?: () => number,
    attackerWeaponIndex?: number,
  ): import('./combat/Engine').CombatResult {
    const combat = new CombatEngine(this.grid);
    const attWeapon = this.getWeaponForUnit(attacker, attackerWeaponIndex);
    const defWeapon = this.getWeaponForUnit(defender);
    return combat.resolveCombat(attacker, defender, attWeapon, defWeapon, rng);
  }

  getCombatPreview(
    attacker: Unit,
    defender: Unit,
    attackerWeaponIndex?: number,
  ): import('./combat/Engine').CombatPreview {
    const combat = new CombatEngine(this.grid);
    const attWeapon = this.getWeaponForUnit(attacker, attackerWeaponIndex);
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
    this.units = this.units.filter((u) => u.isAlive);
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
      const configs = new Map<Unit, import('./ai/Commander').AiConfig>();
      for (const enemy of enemies) {
        if (enemy.aiBehavior || enemy.aiPersonality) {
          configs.set(enemy, {
            behavior: enemy.aiBehavior ?? AiBehavior.ATTACK_IN_RANGE,
            personality: enemy.aiPersonality ?? AiPersonality.BALANCED,
          });
        }
      }
      const actions = this.commander.planEnemyTurn(enemies, players, configs.size > 0 ? configs : undefined);
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

  evaluateTrigger(ctx: TriggerContext): CutsceneTrigger | null {
    return this.triggerEngine.evaluate(ctx);
  }

  markFirstCombat(): void {
    this.triggerEngine.markFirstCombat();
  }

  canPromote(unit: Unit): boolean {
    return this.promotionEngine.canPromote(unit);
  }

  promote(unit: Unit): import('./promotion/PromotionEngine').PromotionResult {
    return this.promotionEngine.promote(unit);
  }

  useItem(unit: Unit, itemIndex: number): { success: boolean; reason?: string } {
    const item = unit.inventory.items[itemIndex];
    if (!item || item.kind !== 'promotion') {
      return { success: false, reason: 'Item cannot be used this way' };
    }

    const promoItem = item as PromotionItem;
    if (promoItem.targetClasses && promoItem.targetClasses.indexOf(unit.unitClass) === -1) {
      return { success: false, reason: 'Seal does not support this class' };
    }

    if (unit.tier !== 'base') {
      return { success: false, reason: 'Unit is already promoted' };
    }

    const result = this.promotionEngine.promote(unit, true);
    if (result.success) {
      unit.inventory.useAt(itemIndex);
      return { success: true };
    }

    return { success: false, reason: 'Promotion conditions not met' };
  }
}

function getStartingItems(unitClass: UnitClass): Item[] {
  const items: Item[] = [];

  if (unitClass === 'mage') {
    items.push(createWeaponItem('Fire', 'magic', 5, 90, 0, 1, 2, true));
    items.push(createStaffItem('Heal', 10, 1, 1));
  } else if (unitClass === 'brigand') {
    items.push(createWeaponItem('Iron Axe', 'axe', 8, 70, 0, 1, 1, false));
  } else if (unitClass === 'berserker') {
    items.push(createWeaponItem('Killer Axe', 'axe', 9, 70, 30, 1, 1, false));
  } else if (unitClass === 'soldier') {
    items.push(createWeaponItem('Iron Lance', 'lance', 6, 80, 0, 1, 1, false));
  } else if (unitClass === 'swordmaster') {
    items.push(createWeaponItem('Killer Sword', 'sword', 7, 85, 30, 1, 1, false));
  } else if (unitClass === 'archer') {
    items.push(createWeaponItem('Iron Bow', 'bow', 6, 85, 0, 2, 2, false));
  } else {
    items.push(createWeaponItem('Iron Sword', 'sword', 5, 90, 0, 1, 1, false));
  }

  return items;
}
