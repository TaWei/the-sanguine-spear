import { Grid } from './map/Grid';
import { TerrainType } from './map/Terrain';
import { Unit, Faction, UnitClass } from './units/Unit';
import { UnitStats } from './units/Stats';
import { TurnManager } from './state/TurnManager';
import { ActionQueue, Action } from './state/ActionQueue';
import { computeMoveRange } from './movement/MoveRange';
import { WEAPON_DB } from './combat/Weapons';
import { Commander } from './ai/Commander';
import { AllyCommander } from './ai/AllyCommander';
import { ProgressionEngine } from './progression/ProgressionEngine';
import { getAdjacentEnemies } from './combat/Adjacency';
import { CombatEngine } from './combat/Engine';
import { WeaponData } from './combat/Weapons';
import { canWield } from './combat/WeaponRank';
import { createDurabilityTracker, DurabilityTracker } from './combat/DurabilityTracker';
import {
  createWeaponItem,
  WeaponItem,
  Item,
  createStaffItem,
  StaffItem,
  PromotionItem,
} from './items/ItemTypes';
import { StaffEngine, StaffResult } from './staves/StaffEngine';
import { getHealTargets } from './staves/getHealTargets';
import { StaffData, STAFF_DB } from './staves/Staves';
import { LevelObjectives, ObjectiveResult, type LevelObjectivesConfig } from './objectives/LevelObjectives';
import { SeizeObjective } from './objectives/SeizeObjective';
import { DefendObjective } from './objectives/DefendObjective';
import { EscapeObjective } from './objectives/EscapeObjective';
import { findPath } from './movement/Pathfinder';
import { GridNeighbor } from './map/Grid';
import { TerrainHazardEngine, HazardReport } from './hazards/TerrainHazardEngine';
import { LevelDefinition } from './levels/LevelDefinition';
import { CutsceneTriggerEngine } from './cutscene/TriggerEngine';
import { CutsceneTrigger, TriggerContext } from './cutscene/CutsceneTrigger';
import { PromotionEngine } from './promotion/PromotionEngine';
import { AiBehavior } from './ai/Behavior';
import { AiPersonality } from './ai/Personality';
import { SAVE_VERSION } from './save/SaveData';
import type { SaveData, TerrainSnapshot } from './save/SaveData';
import { serializeUnit, deserializeUnit } from './save/UnitSerializer';
import { ArmyGold } from './shop/ArmyGold';
import { ShopEngine, ShopItem } from './shop/ShopEngine';
import { TradeEngine } from './trade/TradeEngine';
import { RescueRules } from './units/RescueRules';
import { StealRules } from './units/StealRules';
import { DoorChestEngine } from './map/DoorChestEngine';
import { createItemByName } from './items/ItemFactory';
import { FogOfWar } from './fog/FogOfWar';
import { TalkEngine, type TalkConfig } from './recruitment/TalkEngine';
import { ReinforcementEngine } from './reinforcements/ReinforcementEngine';
import { VillageEngine } from './village/VillageEngine';
import { FortEngine } from './village/FortEngine';
import { SupportEngine } from './support/SupportEngine';

export class GameEngine {
  grid: Grid;
  readonly turnManager: TurnManager;
  readonly gold: ArmyGold;
  private units: Unit[] = [];
  private actionQueue: ActionQueue;
  private commander: Commander;
  private allyCommander: AllyCommander;
  private progressionEngine: ProgressionEngine;
  private hazardEngine: TerrainHazardEngine;
  private triggerEngine = new CutsceneTriggerEngine();
  private promotionEngine = new PromotionEngine();
  private tradeEngine = new TradeEngine();
  private doorChestEngine = new DoorChestEngine();
  private objectivesConfig: LevelObjectivesConfig = {};
  private fogOfWar = new FogOfWar();
  private talkEngine = new TalkEngine();
  private talkConfigs: TalkConfig[] = [];
  private reinforcementEngine = new ReinforcementEngine();
  private villageEngine = new VillageEngine();
  private fortEngine = new FortEngine();
  private supportEngine = new SupportEngine();

  constructor(cols: number, rows: number) {
    this.grid = new Grid(cols, rows);
    this.turnManager = new TurnManager();
    this.gold = new ArmyGold();
    this.actionQueue = new ActionQueue();
    this.commander = new Commander(this.grid, WEAPON_DB);
    this.allyCommander = new AllyCommander(this.grid, WEAPON_DB);
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
    if (def.startingGold !== undefined) {
      (this as any).gold = new ArmyGold(def.startingGold);
    } else {
      (this as any).gold = new ArmyGold();
    }
    // Parse objectives config
    this.objectivesConfig = this._parseObjectives(def.objectives ?? []);
    // Initialize fog of war
    this.fogOfWar.setEnabled(def.fogOfWar ?? false);
    this.fogOfWar.reset();
    if (this.fogOfWar.isEnabled()) {
      this.fogOfWar.update(this.units, this.grid);
    }
    // Register talk configs
    this.talkConfigs = def.talks ?? [];
    this.talkEngine.reset();
    // Register reinforcements
    this.reinforcementEngine.register(def.reinforcements ?? []);
  }

  private _parseObjectives(objectives: import('./levels/LevelDefinition').ObjectiveConfig[]): LevelObjectivesConfig {
    const config: LevelObjectivesConfig = {};
    let hasNonRout = false;
    const seizeTiles: { x: number; y: number }[] = [];
    for (const obj of objectives) {
      switch (obj.type) {
        case 'rout':
          config.routEnabled = obj.routEnabled !== false;
          if (obj.allyMustSurvive) {
            config.allyMustSurvive = true;
          }
          break;
        case 'seize':
          if (obj.seizeTile) {
            seizeTiles.push(obj.seizeTile);
            hasNonRout = true;
          }
          break;
        case 'defend':
          if (obj.defendTargetId && obj.defendTurns !== undefined) {
            config.defend = new DefendObjective(obj.defendTargetId, obj.defendTurns);
            hasNonRout = true;
          }
          break;
        case 'escape':
          if (obj.escapeUnitId && obj.escapeTile) {
            config.escape = new EscapeObjective(obj.escapeUnitId, obj.escapeTile.x, obj.escapeTile.y);
            hasNonRout = true;
          }
          break;
      }
    }
    if (seizeTiles.length > 0) {
      config.seize = new SeizeObjective(seizeTiles);
    }
    // If objectives include non-rout types, disable rout by default unless explicitly enabled
    if (hasNonRout && config.routEnabled === undefined) {
      config.routEnabled = false;
    }
    return config;
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
      gold: this.gold.amount,
      consumedTalks: this.talkEngine.getConsumedTalks(),
      visitedVillages: this.villageEngine.getVisitedVillages(),
      spawnedReinforcementIds: this.reinforcementEngine.getSpawnedGroupIds(),
      supportPairs: this.supportEngine.getSupportData(),
    };
  }

  restore(data: SaveData, def?: LevelDefinition): void {
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

    // Restore rescue relationships (second pass after all units exist)
    for (const snap of data.units) {
      if (snap.rescuedUnitId) {
        const carrier = this.units.find((u) => u.id === snap.id);
        const carried = this.units.find((u) => u.id === snap.rescuedUnitId);
        if (carrier && carried) {
          carrier.setRescuedUnit(carried);
        }
      }
    }
    this.turnManager.turnNumber = data.turnNumber;
    this.turnManager.currentPhase = data.currentPhase;
    this.triggerEngine.setConsumed(new Set(data.consumedTriggers));
    this.triggerEngine.setFirstCombatOccurred(data.firstCombatOccurred);
    (this as any).gold = new ArmyGold(data.gold ?? 0);

    // Re-register level-specific data if definition is provided
    if (def) {
      this.triggerEngine.register(def.triggers ?? []);
      this.objectivesConfig = this._parseObjectives(def.objectives ?? []);
      this.talkConfigs = def.talks ?? [];
      this.talkEngine.reset();
      this.reinforcementEngine.register(def.reinforcements ?? []);
    }

    // Restore engine states
    this.talkEngine.loadConsumedTalks(data.consumedTalks ?? []);
    this.villageEngine.loadVisitedVillages(data.visitedVillages ?? []);
    this.reinforcementEngine.loadSpawnedGroupIds(data.spawnedReinforcementIds ?? []);
    this.supportEngine.loadSupportData(data.supportPairs ?? []);

    // Initialize fog of war
    this.fogOfWar.setEnabled(def?.fogOfWar ?? false);
    this.fogOfWar.reset();
    if (this.fogOfWar.isEnabled()) {
      this.fogOfWar.update(this.units, this.grid);
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

  createShop(stockDefs: Array<{ name: string; price: number; stock?: number }>): ShopEngine {
    const stock: ShopItem[] = stockDefs.map((def) => {
      const item = createItemByName(def.name);
      if (!item) {
        throw new Error(`Unknown item: ${def.name}`);
      }
      return { item, price: def.price, stock: def.stock };
    });
    return new ShopEngine(this.gold, stock);
  }

  canTrade(unitA: Unit, unitB: Unit): boolean {
    return this.tradeEngine.canTrade(unitA, unitB, this.grid);
  }

  executeTrade(
    unitA: Unit,
    itemIndexA: number,
    unitB: Unit,
    itemIndexB: number,
  ): import('./trade/TradeEngine').TradeResult {
    return this.tradeEngine.trade(unitA, itemIndexA, unitB, itemIndexB);
  }

  // ---- Rescue / Drop / Give / Take ----

  canRescue(rescuer: Unit, target: Unit): boolean {
    if (!this.areAdjacent(rescuer, target)) return false;
    return RescueRules.canRescue(rescuer, target);
  }

  rescue(rescuer: Unit, target: Unit): void {
    if (!this.canRescue(rescuer, target)) {
      throw new Error(`${rescuer.name} cannot rescue ${target.name}`);
    }
    // Remove target from grid
    this.grid.removeUnit(target.gridX, target.gridY);
    // Set rescue relationship
    rescuer.setRescuedUnit(target);
  }

  drop(carrier: Unit, x: number, y: number): void {
    if (!carrier.isCarrying) {
      throw new Error(`${carrier.name} is not carrying anyone`);
    }
    if (!this.areAdjacent(carrier, { gridX: x, gridY: y } as Unit)) {
      throw new Error(`Drop target (${String(x)},${String(y)}) is not adjacent to ${carrier.name}`);
    }
    if (this.grid.getUnit(x, y)) {
      throw new Error(`Drop target (${String(x)},${String(y)}) is occupied`);
    }

    const passenger = carrier.rescuedUnit!;
    carrier.clearRescuedUnit();
    passenger.moveTo(x, y);
    this.grid.placeUnit(passenger, x, y);
  }

  giveUnit(giver: Unit, receiver: Unit): void {
    if (!giver.isCarrying) {
      throw new Error(`${giver.name} is not carrying anyone`);
    }
    if (!RescueRules.canCarry(receiver, giver.rescuedUnit!)) {
      throw new Error(`${receiver.name} cannot carry the rescued unit`);
    }
    if (!this.areAdjacent(giver, receiver)) {
      throw new Error(`${receiver.name} is not adjacent to ${giver.name}`);
    }

    const passenger = giver.rescuedUnit!;
    giver.clearRescuedUnit();
    receiver.setRescuedUnit(passenger);
  }

  takeUnit(taker: Unit, carrier: Unit): void {
    if (!carrier.isCarrying) {
      throw new Error(`${carrier.name} is not carrying anyone`);
    }
    if (!RescueRules.canCarry(taker, carrier.rescuedUnit!)) {
      throw new Error(`${taker.name} cannot carry the rescued unit`);
    }
    if (!this.areAdjacent(taker, carrier)) {
      throw new Error(`${taker.name} is not adjacent to ${carrier.name}`);
    }

    const passenger = carrier.rescuedUnit!;
    carrier.clearRescuedUnit();
    taker.setRescuedUnit(passenger);
  }

  private areAdjacent(
    a: Unit | { gridX: number; gridY: number },
    b: Unit | { gridX: number; gridY: number },
  ): boolean {
    const dx = Math.abs(a.gridX - b.gridX);
    const dy = Math.abs(a.gridY - b.gridY);
    return dx + dy === 1;
  }

  // ---- Adjacent allies ----

  getAdjacentAllies(unit: Unit): Unit[] {
    const allies: Unit[] = [];
    const directions = [
      { dx: 0, dy: -1 },
      { dx: 0, dy: 1 },
      { dx: -1, dy: 0 },
      { dx: 1, dy: 0 },
    ];
    for (const { dx, dy } of directions) {
      const x = unit.gridX + dx;
      const y = unit.gridY + dy;
      if (this.grid.isInBounds(x, y)) {
        const other = this.grid.getUnit(x, y);
        if (other && other !== unit && !other.isEnemy) {
          allies.push(other);
        }
      }
    }
    return allies;
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
    const canUse = (w: WeaponItem): boolean => {
      if (w.requiredRank === undefined) return true;
      return canWield(unit.getWeaponRank(w.weaponType).rank, w.requiredRank);
    };

    if (
      weaponIndex !== undefined &&
      weaponIndex >= 0 &&
      weaponIndex < unit.inventory.items.length
    ) {
      const item = unit.inventory.items[weaponIndex];
      if (item && item.kind === 'weapon') {
        const w = item as WeaponItem;
        if (canUse(w)) {
          return {
            name: w.name,
            type: w.weaponType,
            mt: w.mt,
            hit: w.hit,
            crit: w.crit,
            minRange: w.minRange,
            maxRange: w.maxRange,
            usesMagic: w.usesMagic,
            consecutiveAttacks: w.consecutiveAttacks,
            weight: w.weight,
          };
        }
      }
    }
    // Find first eligible weapon by rank
    for (let i = 0; i < unit.inventory.items.length; i++) {
      const item = unit.inventory.items[i];
      if (item.kind === 'weapon') {
        const w = item as WeaponItem;
        if (canUse(w)) {
          return {
            name: w.name,
            type: w.weaponType,
            mt: w.mt,
            hit: w.hit,
            crit: w.crit,
            minRange: w.minRange,
            maxRange: w.maxRange,
            usesMagic: w.usesMagic,
            consecutiveAttacks: w.consecutiveAttacks,
            weight: w.weight,
          };
        }
      }
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
    if (unit.unitClass === 'thief') {
      return WEAPON_DB['Iron Sword'];
    }
    if (unit.unitClass === 'assassin') {
      return WEAPON_DB['Killer Sword'];
    }
    if (unit.unitClass === 'wraith_knight') {
      return WEAPON_DB['Steel Lance'];
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
    // Look up STAFF_DB to propagate dynamic getRange (Physic etc.)
    const dbEntry = STAFF_DB[item.name];
    if (!dbEntry) {
      console.warn(`Staff "${item.name}" not found in STAFF_DB — getRange will be undefined`);
    }
    return {
      data: {
        name: item.name,
        healAmount: item.healAmount,
        minRange: item.minRange,
        maxRange: item.maxRange,
        getRange: dbEntry?.getRange,
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

  applyStaffExp(
    unit: Unit,
    staffResult: StaffResult,
  ): import('./progression/ProgressionEngine').ProgressionResult | null {
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

    // Create durability trackers from inventory weapons
    const attTracker = this._createDurabilityTracker(attacker, attackerWeaponIndex);
    const defTracker = this._createDurabilityTracker(defender);

    const result = combat.resolveCombat(
      attacker,
      defender,
      attWeapon,
      defWeapon,
      rng,
      attTracker,
      defTracker,
    );

    // Sync durability back to inventory
    this._syncWeaponDurability(attacker, attackerWeaponIndex, attTracker);
    this._syncWeaponDurability(defender, undefined, defTracker);

    return result;
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
    return new LevelObjectives(this.units, this.objectivesConfig).check(this.turnManager.turnNumber);
  }

  /** Check move-based objectives (seize/escape) after a unit moves */
  checkMoveObjective(unit: Unit): ObjectiveResult {
    return new LevelObjectives(this.units, this.objectivesConfig).checkMoveObjective(unit);
  }

  removeDeadUnits(): void {
    this.killPassengersIfCarrierDead();
    for (const unit of this.units) {
      if (!unit.isAlive) {
        this.grid.removeUnit(unit.gridX, unit.gridY);
      }
    }
    this.units = this.units.filter((u) => u.isAlive);
  }

  killPassengersIfCarrierDead(): void {
    for (const unit of this.units) {
      if (!unit.isAlive && unit.isCarrying) {
        const passenger = unit.rescuedUnit!;
        passenger.takeDamage(passenger.stats.hp); // kill
        unit.clearRescuedUnit();
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

  findBestAttackSquare(unit: Unit, enemy: Unit): { x: number; y: number } | null {
    const moveRange = computeMoveRange(unit, this.grid);
    const weapon = this.getWeaponForUnit(unit);
    let bestTile: { x: number; y: number } | null = null;
    let bestCost = Infinity;
    let bestDistToEnemy = Infinity;

    for (const [key, cost] of moveRange) {
      const [x, y] = key.split(',').map(Number);
      const dist = Math.abs(x - enemy.gridX) + Math.abs(y - enemy.gridY);
      if (dist < weapon.minRange || dist > weapon.maxRange) {
        continue;
      }
      if (cost < bestCost || (cost === bestCost && dist < bestDistToEnemy)) {
        bestCost = cost;
        bestDistToEnemy = dist;
        bestTile = { x, y };
      }
    }
    return bestTile;
  }

  endTurn(): HazardReport {
    const liveUnits = this.getLiveUnits();
    this.turnManager.advancePhase(liveUnits);

    // Update fog of war
    if (this.fogOfWar.isEnabled()) {
      this.fogOfWar.update(this.units, this.grid);
    }

    // Process reinforcements
    const spawns = this.reinforcementEngine.checkSpawn(
      this.turnManager.turnNumber,
      this.turnManager.isEnemyPhase(),
      this.turnManager.isAllyPhase(),
    );
    for (const spawn of spawns) {
      for (const def of spawn.units) {
        const pos = this.reinforcementEngine.findSpawnTile(this.grid, def.spawnX, def.spawnY);
        if (pos) {
          this.addUnit(def.id, def.name, spawn.group.faction, def.unitClass, def.stats, pos.x, pos.y);
        }
      }
    }

    // Process support points for adjacent allies at end of each phase
    this.processAdjacentSupports();

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
      const actions = this.commander.planEnemyTurn(
        enemies,
        players,
        configs.size > 0 ? configs : undefined,
      );
      for (const action of actions) {
        this.actionQueue.enqueue(action);
      }
    } else if (this.turnManager.isAllyPhase()) {
      const allies = this.getUnitsByFaction(Faction.ALLY);
      const enemies = this.getUnitsByFaction(Faction.ENEMY);
      const players = this.getUnitsByFaction(Faction.PLAYER);
      const actions = this.allyCommander.planAllyTurn(allies, enemies, players);
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

  getFirstCombatOccurred(): boolean {
    return this.triggerEngine.getFirstCombatOccurred();
  }

  canPromote(unit: Unit): boolean {
    return this.promotionEngine.canPromote(unit);
  }

  promote(unit: Unit): import('./promotion/PromotionEngine').PromotionResult {
    return this.promotionEngine.promote(unit);
  }

  useItem(
    unit: Unit,
    itemIndex: number,
  ): {
    success: boolean;
    reason?: string;
    promotionResult?: import('./promotion/PromotionEngine').PromotionResult;
  } {
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
      return { success: true, promotionResult: result };
    }

    return { success: false, reason: 'Promotion conditions not met' };
  }

  // ---- Steal / Door / Chest ----

  // ---- Fog of War ----

  get fog(): FogOfWar { return this.fogOfWar; }

  updateFogOfWar(): void {
    this.fogOfWar.update(this.units, this.grid);
  }

  isUnitVisibleToPlayer(unit: Unit): boolean {
    return this.fogOfWar.isUnitVisible(unit, Faction.PLAYER);
  }

  // ---- Talk / Recruitment ----

  canTalk(initiator: Unit, target: Unit): boolean {
    if (!this.areAdjacent(initiator, target)) return false;
    return this.talkEngine.canTalk(initiator, target, this.talkConfigs);
  }

  talk(initiator: Unit, target: Unit): { success: boolean; reason?: string; recruitItems?: { name: string }[] } {
    return this.talkEngine.talk(initiator, target, this.talkConfigs);
  }

  getTalkableUnits(unit: Unit): Unit[] {
    return this.units.filter(u => this.canTalk(unit, u));
  }

  // ---- Village / Fort ----

  canVisitVillage(unit: Unit, x: number, y: number): boolean {
    return this.villageEngine.canVisit(unit, x, y, this.grid.getTerrain(x, y));
  }

  visitVillage(x: number, y: number): { success: boolean; reason?: string } {
    return this.villageEngine.visit(x, y);
  }

  applyFortHealing(unit: Unit): number {
    return this.fortEngine.applyFortHealing(unit, this.grid.getTerrain(unit.gridX, unit.gridY));
  }

  // ---- Support ----

  getSupportBonus(attacker: Unit, supporter: Unit): { hit: number; avoid: number; crit: number; critAvoid: number } {
    return this.supportEngine.getCombatBonus(attacker, supporter);
  }

  processAdjacentSupports(): void {
    for (const unit of this.getLiveUnits()) {
      const adj = this.getAdjacentAllies(unit);
      for (const ally of adj) {
        if (unit.id < ally.id) {
          this.supportEngine.processSupportPoints(unit, ally);
        }
      }
    }
  }

  // ---- Steal / Door / Chest ----

  canSteal(thief: Unit, target: Unit): boolean {
    if (!this.areAdjacent(thief, target)) return false;
    return StealRules.canSteal(thief, target);
  }

  steal(thief: Unit, target: Unit, itemIndex: number): Item {
    if (!this.canSteal(thief, target)) throw new Error('Cannot steal');
    const item = StealRules.steal(thief, target, itemIndex);
    thief.hasActed = true;
    return item;
  }

  canOpenDoor(unit: Unit, x: number, y: number): boolean {
    return this.doorChestEngine.canOpenDoor(unit, this.grid, x, y);
  }

  openDoor(unit: Unit, x: number, y: number): void {
    this.doorChestEngine.openDoor(this.grid, unit, x, y);
  }

  canOpenChest(unit: Unit, x: number, y: number): boolean {
    return this.doorChestEngine.canOpenChest(unit, this.grid, x, y);
  }

  openChest(unit: Unit, x: number, y: number): void {
    this.doorChestEngine.openChest(this.grid, unit, x, y);
  }

  private _createDurabilityTracker(
    unit: Unit,
    weaponIndex?: number,
  ): DurabilityTracker | undefined {
    const items = unit.inventory.items;
    if (weaponIndex !== undefined && weaponIndex >= 0 && weaponIndex < items.length) {
      const item = items[weaponIndex];
      if (item.kind === 'weapon') return createDurabilityTracker(item.uses);
    }
    // Auto-find first weapon in inventory
    for (let i = 0; i < items.length; i++) {
      if (items[i].kind === 'weapon') {
        if (weaponIndex === undefined || i === weaponIndex) {
          return createDurabilityTracker(items[i].uses);
        }
      }
    }
    return undefined; // no weapon (class default used)
  }

  private _syncWeaponDurability(
    unit: Unit,
    weaponIndex: number | undefined,
    tracker: DurabilityTracker | undefined,
  ): void {
    if (!tracker || !tracker.wasUsed) return;

    // Find the actual weapon index if not provided
    let index = weaponIndex;
    if (index === undefined || index < 0) {
      const items = unit.inventory.items;
      for (let i = 0; i < items.length; i++) {
        if (items[i].kind === 'weapon') {
          index = i;
          break;
        }
      }
    }

    if (index === undefined || index < 0 || index >= unit.inventory.items.length) return;

    if (tracker.isBroken) {
      unit.inventory.removeAt(index);
    } else {
      // Directly mutate uses field (WeaponItem.uses is a writable number)
      const item = unit.inventory.items[index];
      if (item.kind === 'weapon') {
        (item as WeaponItem).uses = tracker.uses;
      }
    }
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
  } else if (unitClass === 'thief') {
    items.push(createWeaponItem('Iron Sword', 'sword', 5, 90, 0, 1, 1, false));
  } else if (unitClass === 'assassin') {
    items.push(createWeaponItem('Killer Sword', 'sword', 7, 85, 30, 1, 1, false));
  } else if (unitClass === 'wraith_knight') {
    items.push(createWeaponItem('Steel Lance', 'lance', 10, 70, 0, 1, 1, false));
  } else {
    items.push(createWeaponItem('Iron Sword', 'sword', 5, 90, 0, 1, 1, false));
  }

  return items;
}
