import { describe, it, expect } from 'vitest';
import { GameEngine } from '../GameEngine';
import { Faction, UnitClass } from '../units/Unit';
import { createStats } from '../units/Stats';
import { TerrainType } from '../map/Terrain';
import { UNIT_STATE } from '../state/UnitState';
import { getLevel } from '../levels/LevelData';

describe('GameEngine', () => {
  it('initializes with a grid of specified size', () => {
    const engine = new GameEngine(16, 12);
    expect(engine.grid.cols).toBe(16);
    expect(engine.grid.rows).toBe(12);
  });

  it('starts in player phase', () => {
    const engine = new GameEngine(10, 8);
    expect(engine.turnManager.isPlayerPhase()).toBe(true);
  });

  it('can add units and query them', () => {
    const engine = new GameEngine(10, 8);
    const stats = createStats({
      hp: 20,
      str: 8,
      mag: 2,
      skl: 7,
      spd: 8,
      luk: 6,
      def: 6,
      res: 2,
      mov: 5,
    });
    const unit = engine.addUnit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, stats, 2, 5);
    expect(unit.gridX).toBe(2);
    expect(unit.gridY).toBe(5);
    expect(engine.getUnit(2, 5)).toBe(unit);
  });

  it('can get all units by faction', () => {
    const engine = new GameEngine(10, 8);
    const stats = createStats({
      hp: 20,
      str: 8,
      mag: 2,
      skl: 7,
      spd: 8,
      luk: 6,
      def: 6,
      res: 2,
      mov: 5,
    });
    engine.addUnit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, stats, 2, 5);
    engine.addUnit('e1', 'Bandit', Faction.ENEMY, UnitClass.BRIGAND, stats, 7, 5);

    expect(engine.getUnitsByFaction(Faction.PLAYER)).toHaveLength(1);
    expect(engine.getUnitsByFaction(Faction.ENEMY)).toHaveLength(1);
  });

  it('can compute move range for a unit', () => {
    const engine = new GameEngine(10, 8);
    const stats = createStats({
      hp: 20,
      str: 8,
      mag: 2,
      skl: 7,
      spd: 8,
      luk: 6,
      def: 6,
      res: 2,
      mov: 3,
    });
    const unit = engine.addUnit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, stats, 5, 4);
    const range = engine.getMoveRange(unit);
    expect(range.has('5,4')).toBe(true);
  });

  it('can move a unit and update grid', () => {
    const engine = new GameEngine(10, 8);
    const stats = createStats({
      hp: 20,
      str: 8,
      mag: 2,
      skl: 7,
      spd: 8,
      luk: 6,
      def: 6,
      res: 2,
      mov: 5,
    });
    const unit = engine.addUnit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, stats, 2, 5);
    engine.moveUnit(unit, 4, 7);
    expect(unit.gridX).toBe(4);
    expect(unit.gridY).toBe(7);
    expect(engine.getUnit(4, 7)).toBe(unit);
    expect(engine.getUnit(2, 5)).toBeNull();
  });

  it('can advance turns and reset units', () => {
    const engine = new GameEngine(10, 8);
    const stats = createStats({
      hp: 20,
      str: 8,
      mag: 2,
      skl: 7,
      spd: 8,
      luk: 6,
      def: 6,
      res: 2,
      mov: 5,
    });
    const unit = engine.addUnit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, stats, 2, 5);
    unit.hasActed = true;
    engine.endTurn();
    expect(unit.hasActed).toBe(false);
  });

  it('runs enemy AI on enemy phase', () => {
    const engine = new GameEngine(10, 8);
    const pStats = createStats({
      hp: 22,
      str: 8,
      mag: 2,
      skl: 7,
      spd: 8,
      luk: 6,
      def: 6,
      res: 2,
      mov: 5,
    });
    const eStats = createStats({
      hp: 26,
      str: 9,
      mag: 0,
      skl: 4,
      spd: 5,
      luk: 3,
      def: 5,
      res: 1,
      mov: 5,
    });
    engine.addUnit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, pStats, 6, 5);
    engine.addUnit('e1', 'Bandit', Faction.ENEMY, UnitClass.BRIGAND, eStats, 5, 5);

    engine.endTurn(); // player → enemy
    const actions = engine.getPendingActions();
    expect(actions.length).toBeGreaterThan(0);
  });

  it('getAllUnits returns all added units', () => {
    const engine = new GameEngine(10, 8);
    const stats = createStats({
      hp: 20,
      str: 8,
      mag: 2,
      skl: 7,
      spd: 8,
      luk: 6,
      def: 6,
      res: 2,
      mov: 5,
    });
    engine.addUnit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, stats, 2, 5);
    engine.addUnit('e1', 'Bandit', Faction.ENEMY, UnitClass.BRIGAND, stats, 7, 5);
    expect(engine.getAllUnits()).toHaveLength(2);
  });

  it('getLiveUnits excludes dead units', () => {
    const engine = new GameEngine(10, 8);
    const stats = createStats({
      hp: 20,
      str: 8,
      mag: 2,
      skl: 7,
      spd: 8,
      luk: 6,
      def: 6,
      res: 2,
      mov: 5,
    });
    const unit = engine.addUnit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, stats, 2, 5);
    unit.takeDamage(999);
    expect(engine.getLiveUnits()).toHaveLength(0);
  });

  it('setTerrain updates grid terrain', () => {
    const engine = new GameEngine(10, 8);
    engine.setTerrain(3, 3, TerrainType.FOREST);
    expect(engine.grid.getTerrain(3, 3)).toBe('forest');
  });

  it('awards combat exp for dealing damage', () => {
    const engine = new GameEngine(10, 8);
    const stats = createStats({ hp: 20, str: 8, mag: 2, skl: 7, spd: 8, luk: 6, def: 6, res: 2, mov: 5 });
    const unit = engine.addUnit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, stats, 2, 5);
    engine.awardCombatExp(unit, 10, false);
    expect(unit.exp).toBe(10);
  });

  it('awards combat exp with kill bonus', () => {
    const engine = new GameEngine(10, 8);
    const stats = createStats({ hp: 20, str: 8, mag: 2, skl: 7, spd: 8, luk: 6, def: 6, res: 2, mov: 5 });
    const unit = engine.addUnit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, stats, 2, 5);
    engine.awardCombatExp(unit, 10, true);
    expect(unit.exp).toBe(40);
  });

  it('getWeaponForUnit returns correct weapon by class', () => {
    const engine = new GameEngine(10, 10);
    const stats = createStats({ hp: 22, str: 8, mag: 2, skl: 7, spd: 8, luk: 6, def: 6, res: 2, mov: 5 });
    const mage = engine.addUnit('m1', 'Mage', Faction.ENEMY, UnitClass.MAGE, stats, 0, 0);
    const brigand = engine.addUnit('b1', 'Bandit', Faction.ENEMY, UnitClass.BRIGAND, stats, 1, 1);
    expect(engine.getWeaponForUnit(mage).name).toBe('Fire');
    expect(engine.getWeaponForUnit(brigand).name).toBe('Iron Axe');
  });

  it('getAdjacentEnemies returns adjacent enemies after move', () => {
    const engine = new GameEngine(10, 10);
    const stats = createStats({ hp: 22, str: 8, mag: 2, skl: 7, spd: 8, luk: 6, def: 6, res: 2, mov: 5 });
    const enemyStats = createStats({ hp: 26, str: 9, mag: 0, skl: 4, spd: 5, luk: 3, def: 5, res: 1, mov: 5 });
    const player = engine.addUnit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, stats, 5, 5);
    engine.addUnit('e1', 'Bandit', Faction.ENEMY, UnitClass.BRIGAND, enemyStats, 6, 5);
    const enemies = engine.getAdjacentEnemies(player);
    expect(enemies).toHaveLength(1);
  });

  it('resolvePlayerCombat returns a CombatResult with log', () => {
    const engine = new GameEngine(10, 10);
    const stats = createStats({ hp: 22, str: 8, mag: 2, skl: 7, spd: 8, luk: 6, def: 6, res: 2, mov: 5 });
    const enemyStats = createStats({ hp: 26, str: 9, mag: 0, skl: 4, spd: 5, luk: 3, def: 5, res: 1, mov: 5 });
    const player = engine.addUnit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, stats, 5, 5);
    const enemy = engine.addUnit('e1', 'Bandit', Faction.ENEMY, UnitClass.BRIGAND, enemyStats, 6, 5);

    const result = engine.resolvePlayerCombat(player, enemy, () => 0); // guaranteed hit
    expect(result.log.length).toBeGreaterThan(0);
    expect(result.log[0].attacker).toBe(player);
    expect(result.log[0].defender).toBe(enemy);
  });

  it('resolvePlayerCombat applies damage to units', () => {
    const engine = new GameEngine(10, 10);
    const stats = createStats({ hp: 22, str: 8, mag: 2, skl: 7, spd: 8, luk: 6, def: 6, res: 2, mov: 5 });
    const enemyStats = createStats({ hp: 26, str: 9, mag: 0, skl: 4, spd: 5, luk: 3, def: 5, res: 1, mov: 5 });
    const player = engine.addUnit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, stats, 5, 5);
    const enemy = engine.addUnit('e1', 'Bandit', Faction.ENEMY, UnitClass.BRIGAND, enemyStats, 6, 5);
    const enemyHpBefore = enemy.stats.hp;

    engine.resolvePlayerCombat(player, enemy, () => 0);
    expect(enemy.stats.hp).toBeLessThan(enemyHpBefore);
  });

  it('getCombatPreview returns hit/crit/damage without applying damage', () => {
    const engine = new GameEngine(10, 10);
    const stats = createStats({ hp: 22, str: 8, mag: 2, skl: 7, spd: 8, luk: 6, def: 6, res: 2, mov: 5 });
    const enemyStats = createStats({ hp: 26, str: 9, mag: 0, skl: 4, spd: 5, luk: 3, def: 5, res: 1, mov: 5 });
    const player = engine.addUnit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, stats, 5, 5);
    const enemy = engine.addUnit('e1', 'Bandit', Faction.ENEMY, UnitClass.BRIGAND, enemyStats, 6, 5);

    const preview = engine.getCombatPreview(player, enemy);

    expect(preview.attacker.hit).toBeGreaterThan(0);
    expect(preview.attacker.damage).toBe(9); // str(8)+mt(5)+tri(1)-def(5)=9
    expect(preview.attacker.doubleAttack).toBe(false); // spd 8 vs 5 (diff 3)
    expect(preview.defender).not.toBeNull();
    expect(preview.defender!.hit).toBeGreaterThan(0);

    // No damage applied
    expect(enemy.stats.hp).toBe(enemyStats.hp);
    expect(player.stats.hp).toBe(stats.hp);
  });

  it('getCombatPreview defender is null when out of range', () => {
    const engine = new GameEngine(10, 10);
    const stats = createStats({ hp: 22, str: 8, mag: 2, skl: 7, spd: 8, luk: 6, def: 6, res: 2, mov: 5 });
    const enemyStats = createStats({ hp: 26, str: 9, mag: 0, skl: 4, spd: 5, luk: 3, def: 5, res: 1, mov: 5 });
    const player = engine.addUnit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, stats, 5, 5);
    const enemy = engine.addUnit('e1', 'Bandit', Faction.ENEMY, UnitClass.BRIGAND, enemyStats, 7, 5);

    const preview = engine.getCombatPreview(player, enemy);
    expect(preview.defender).toBeNull();
  });

  it('reports victory when all enemies are dead', () => {
    const engine = new GameEngine(10, 8);
    const stats = createStats({ hp: 20, str: 5, mag: 5, skl: 5, spd: 5, luk: 5, def: 5, res: 5, mov: 5 });
    engine.addUnit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, stats, 0, 0);
    const enemy = engine.addUnit('e1', 'Bandit', Faction.ENEMY, UnitClass.BRIGAND, stats, 1, 1);
    enemy.takeDamage(999);

    const result = engine.checkObjectives();
    expect(result.victory).toBe(true);
    expect(result.defeat).toBe(false);
  });

  it('reports defeat when all players are dead', () => {
    const engine = new GameEngine(10, 8);
    const stats = createStats({ hp: 20, str: 5, mag: 5, skl: 5, spd: 5, luk: 5, def: 5, res: 5, mov: 5 });
    const player = engine.addUnit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, stats, 0, 0);
    player.takeDamage(999);
    engine.addUnit('e1', 'Bandit', Faction.ENEMY, UnitClass.BRIGAND, stats, 1, 1);

    const result = engine.checkObjectives();
    expect(result.defeat).toBe(true);
    expect(result.victory).toBe(false);
  });

  it('endTurn returns hazard report with lava damage', () => {
    const engine = new GameEngine(10, 10);
    const stats = createStats({ hp: 20, str: 5, mag: 5, skl: 5, spd: 5, luk: 5, def: 5, res: 5, mov: 5 });
    const unit = engine.addUnit('p1', 'Test', Faction.PLAYER, UnitClass.LORD, stats, 2, 2);
    engine.setTerrain(2, 2, TerrainType.LAVA);
    const report = engine.endTurn();
    expect(report.damagedUnits.length).toBe(1);
    expect(report.damagedUnits[0].unit).toBe(unit);
    expect(report.damagedUnits[0].damage).toBe(5);
    expect(report.damagedUnits[0].terrain).toBe('lava');
  });

  it('reports ongoing when both sides are alive', () => {
    const engine = new GameEngine(10, 8);
    const stats = createStats({ hp: 20, str: 5, mag: 5, skl: 5, spd: 5, luk: 5, def: 5, res: 5, mov: 5 });
    engine.addUnit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, stats, 0, 0);
    engine.addUnit('e1', 'Bandit', Faction.ENEMY, UnitClass.BRIGAND, stats, 1, 1);

    const result = engine.checkObjectives();
    expect(result.ongoing).toBe(true);
    expect(result.victory).toBe(false);
    expect(result.defeat).toBe(false);
  });

  it('applies lava damage at start of enemy phase', () => {
    const engine = new GameEngine(5, 5);
    const stats = createStats({ hp: 20, maxHp: 20, str: 5, mag: 5, skl: 5, spd: 5, luk: 5, def: 5, res: 5, mov: 5 });
    const unit = engine.addUnit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, stats, 2, 2);
    engine.setTerrain(2, 2, TerrainType.LAVA);
    const hpBefore = unit.stats.hp;
    engine.endTurn(); // player → enemy, should apply hazards
    expect(unit.stats.hp).toBe(hpBefore - 5);
  });

  it('does not apply hazard damage during same phase', () => {
    const engine = new GameEngine(5, 5);
    const stats = createStats({ hp: 20, maxHp: 20, str: 5, mag: 5, skl: 5, spd: 5, luk: 5, def: 5, res: 5, mov: 5 });
    const unit = engine.addUnit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, stats, 2, 2);
    engine.setTerrain(2, 2, TerrainType.LAVA);
    const hpBefore = unit.stats.hp;
    // No phase change yet
    expect(unit.stats.hp).toBe(hpBefore);
  });

  it('removes dead units from the grid', () => {
    const engine = new GameEngine(10, 8);
    const stats = createStats({ hp: 20, str: 5, mag: 5, skl: 5, spd: 5, luk: 5, def: 5, res: 5, mov: 5 });
    const enemy = engine.addUnit('e1', 'Bandit', Faction.ENEMY, UnitClass.BRIGAND, stats, 3, 3);
    enemy.takeDamage(999);

    engine.removeDeadUnits();
    expect(engine.getUnit(3, 3)).toBeNull();
  });

  it('returns true when all live player units are exhausted', () => {
    const engine = new GameEngine(10, 8);
    const stats = createStats({ hp: 20, str: 8, mag: 2, skl: 7, spd: 8, luk: 6, def: 6, res: 2, mov: 5 });
    engine.addUnit('p1', 'A', Faction.PLAYER, UnitClass.LORD, stats, 0, 0);
    engine.addUnit('p2', 'B', Faction.PLAYER, UnitClass.MAGE, stats, 1, 1);
    expect(engine.allPlayerUnitsExhausted()).toBe(false);
    for (const u of engine.getUnitsByFaction(Faction.PLAYER)) {
      u.state.transition(UNIT_STATE.MOVING);
      u.state.transition(UNIT_STATE.MENU);
      u.state.transition(UNIT_STATE.EXHAUSTED);
    }
    expect(engine.allPlayerUnitsExhausted()).toBe(true);
  });

  it('ignores dead units when checking exhaustion', () => {
    const engine = new GameEngine(10, 8);
    const stats = createStats({ hp: 20, str: 8, mag: 2, skl: 7, spd: 8, luk: 6, def: 6, res: 2, mov: 5 });
    const dead = engine.addUnit('p1', 'A', Faction.PLAYER, UnitClass.LORD, stats, 0, 0);
    dead.takeDamage(999);
    engine.addUnit('p2', 'B', Faction.PLAYER, UnitClass.MAGE, stats, 1, 1);
    expect(engine.allPlayerUnitsExhausted()).toBe(false);
  });

  it('getThreatenedTiles returns attackable tiles outside move range', () => {
    const engine = new GameEngine(10, 10);
    const stats = createStats({ hp: 22, str: 8, mag: 2, skl: 7, spd: 8, luk: 6, def: 6, res: 2, mov: 2 });
    const player = engine.addUnit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, stats, 5, 5);
    const threatened = engine.getThreatenedTiles(player);
    // From (5,5) with move 2 and weapon range 1, cardinal tiles at distance 3 are threatened
    expect(threatened.has('5,2')).toBe(true);
    expect(threatened.has('5,8')).toBe(true);
    expect(threatened.has('2,5')).toBe(true);
    expect(threatened.has('8,5')).toBe(true);
    // Tiles within move range are not threatened
    expect(threatened.has('5,5')).toBe(false);
    expect(threatened.has('5,4')).toBe(false);
  });

  it('full player combat flow: move adjacent, detect enemy, resolve combat', () => {
    const engine = new GameEngine(10, 10);
    const pStats = createStats({ hp: 22, str: 8, mag: 2, skl: 7, spd: 8, luk: 6, def: 6, res: 2, mov: 5 });
    const eStats = createStats({ hp: 26, str: 9, mag: 0, skl: 4, spd: 5, luk: 3, def: 5, res: 1, mov: 5 });
    const player = engine.addUnit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, pStats, 4, 5);
    const enemy = engine.addUnit('e1', 'Bandit', Faction.ENEMY, UnitClass.BRIGAND, eStats, 6, 5);

    // Move player adjacent to enemy
    engine.moveUnit(player, 5, 5);

    // Verify enemy is detected as adjacent
    const enemies = engine.getAdjacentEnemies(player);
    expect(enemies).toHaveLength(1);
    expect(enemies[0].id).toBe('e1');

    // Resolve combat with guaranteed hit
    const enemyHpBefore = enemy.stats.hp;
    const result = engine.resolvePlayerCombat(player, enemy, () => 0);
    expect(result.log.length).toBeGreaterThan(0);
    expect(enemy.stats.hp).toBeLessThan(enemyHpBefore);
  });

  it('can compute move range and threatened tiles for enemy units', () => {
    const engine = new GameEngine(10, 10);
    const eStats = createStats({ hp: 26, str: 9, mag: 0, skl: 4, spd: 5, luk: 3, def: 5, res: 1, mov: 3 });
    const enemy = engine.addUnit('e1', 'Bandit', Faction.ENEMY, UnitClass.BRIGAND, eStats, 5, 5);

    const moveRange = engine.getMoveRange(enemy);
    expect(moveRange.has('5,5')).toBe(true);
    expect(moveRange.has('5,8')).toBe(true);
    expect(moveRange.has('8,5')).toBe(true);

    const threatened = engine.getThreatenedTiles(enemy);
    // With move 3 and weapon range 1, tiles at cardinal distance 4 from origin are threatened
    expect(threatened.has('5,1')).toBe(true);
    expect(threatened.has('5,9')).toBe(true);
    expect(threatened.has('1,5')).toBe(true);
    expect(threatened.has('9,5')).toBe(true);
    // Tiles within move range are not in threatened set
    expect(threatened.has('5,5')).toBe(false);
    expect(threatened.has('5,6')).toBe(false);
  });

  it('can find path to a reachable tile', () => {
    const engine = new GameEngine(10, 10);
    const stats = createStats({ hp: 22, str: 8, mag: 2, skl: 7, spd: 8, luk: 6, def: 6, res: 2, mov: 3 });
    const unit = engine.addUnit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, stats, 5, 5);
    const path = engine.findPath(unit, 7, 5);
    expect(path).not.toBeNull();
    expect(path).toHaveLength(2);
    expect(path![0]).toEqual({ x: 6, y: 5 });
    expect(path![1]).toEqual({ x: 7, y: 5 });
  });

  it('findPath returns null for unreachable tile', () => {
    const engine = new GameEngine(10, 10);
    const stats = createStats({ hp: 22, str: 8, mag: 2, skl: 7, spd: 8, luk: 6, def: 6, res: 2, mov: 2 });
    const unit = engine.addUnit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, stats, 5, 5);
    const path = engine.findPath(unit, 8, 5);
    expect(path).toBeNull();
  });

  it('moveUnit throws when destination is occupied by another unit', () => {
    const engine = new GameEngine(10, 10);
    const stats = createStats({ hp: 22, str: 8, mag: 2, skl: 7, spd: 8, luk: 6, def: 6, res: 2, mov: 5 });
    const player = engine.addUnit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, stats, 5, 5);
    engine.addUnit('e1', 'Bandit', Faction.ENEMY, UnitClass.BRIGAND, stats, 6, 5);
    expect(() => engine.moveUnit(player, 6, 5)).toThrow('occupied');
  });

  it('moveUnit is a no-op when moving to the current tile', () => {
    const engine = new GameEngine(10, 10);
    const stats = createStats({ hp: 22, str: 8, mag: 2, skl: 7, spd: 8, luk: 6, def: 6, res: 2, mov: 5 });
    const player = engine.addUnit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, stats, 5, 5);
    expect(() => engine.moveUnit(player, 5, 5)).not.toThrow();
    expect(player.gridX).toBe(5);
    expect(player.gridY).toBe(5);
    expect(engine.getUnit(5, 5)).toBe(player);
  });

  it('can load a level definition', () => {
    const level = getLevel('level-1')!;
    const engine = new GameEngine(level.cols, level.rows);
    engine.loadLevel(level);
    expect(engine.getAllUnits()).toHaveLength(level.units.length);
    expect(engine.grid.getTerrain(0, 0)).toBe('mountain');
  });

  it('can load level 2 with lava and cliffs', () => {
    const level = getLevel('level-2')!;
    const engine = new GameEngine(level.cols, level.rows);
    engine.loadLevel(level);
    const lavaTiles = level.terrain.filter((t) => t.type === TerrainType.LAVA);
    const cliffTiles = level.terrain.filter((t) => t.type === TerrainType.CLIFF);
    expect(lavaTiles.length).toBeGreaterThan(0);
    expect(cliffTiles.length).toBeGreaterThan(0);
    expect(engine.getAllUnits()).toHaveLength(level.units.length);
    const sylvie = engine.getUnit(3, 4);
    expect(sylvie).not.toBeNull();
    expect(sylvie!.unitClass).toBe(UnitClass.PEGASUS_KNIGHT);
  });

  describe('critical attack integration', () => {
    it('killer weapon + high skill yields lethal crit preview', () => {
      const engine = new GameEngine(10, 10);
      const attackerStats = createStats({ hp: 30, str: 12, mag: 2, skl: 20, spd: 10, luk: 5, def: 6, res: 2, mov: 5 });
      const defenderStats = createStats({ hp: 18, maxHp: 18, str: 8, mag: 2, skl: 7, spd: 5, luk: 0, def: 4, res: 2, mov: 5 });
      const attacker = engine.addUnit('p1', 'Rowan', Faction.PLAYER, UnitClass.SWORDMASTER, attackerStats, 5, 5);
      const defender = engine.addUnit('e1', 'Bandit', Faction.ENEMY, UnitClass.BRIGAND, defenderStats, 5, 6);

      const preview = engine.getCombatPreview(attacker, defender);
      expect(preview.attacker.crit).toBeGreaterThan(0);
      // critRate = floor(20/2) + 30 + 15 = 55; critAvoid = 0; displayCrit = 55
      expect(preview.attacker.crit).toBe(55);
      // base damage = 12 + 9 - 4 = 17; crit damage = 51 which exceeds defender HP
      expect(preview.attacker.damage * 3).toBeGreaterThanOrEqual(defender.stats.hp);
    });

    it('high luck nullifies enemy crit entirely', () => {
      const engine = new GameEngine(10, 10);
      const attackerStats = createStats({ hp: 30, str: 12, mag: 2, skl: 20, spd: 10, luk: 5, def: 6, res: 2, mov: 5 });
      const defenderStats = createStats({ hp: 30, maxHp: 30, str: 8, mag: 2, skl: 7, spd: 5, luk: 70, def: 6, res: 2, mov: 5 });
      const attacker = engine.addUnit('p1', 'Rowan', Faction.PLAYER, UnitClass.SWORDMASTER, attackerStats, 5, 5);
      const defender = engine.addUnit('e1', 'Bandit', Faction.ENEMY, UnitClass.BRIGAND, defenderStats, 5, 6);

      const preview = engine.getCombatPreview(attacker, defender);
      // critRate = floor(20/2) + 30 + 15 = 65; critAvoid = 70; displayCrit = max(0, 65-70) = 0
      expect(preview.attacker.crit).toBe(0);
    });
  });

  describe('applyCombatExp', () => {
    it('grants exp from combat result and returns progression result', () => {
      const engine = new GameEngine(10, 10);
      const stats = createStats({ hp: 20, str: 8, mag: 2, skl: 7, spd: 8, luk: 6, def: 6, res: 2, mov: 5 });
      const unit = engine.addUnit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, stats, 2, 5);

      const combatResult = { log: [], attackerDied: false, defenderDied: true, expAward: 30 };
      const progression = engine.applyCombatExp(unit, combatResult);

      expect(progression).not.toBeNull();
      expect(progression!.expGained).toBe(30);
      expect(unit.exp).toBe(30);
    });

    it('returns null when expAward is 0', () => {
      const engine = new GameEngine(10, 10);
      const stats = createStats({ hp: 20, str: 8, mag: 2, skl: 7, spd: 8, luk: 6, def: 6, res: 2, mov: 5 });
      const unit = engine.addUnit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, stats, 2, 5);

      const combatResult = { log: [], attackerDied: false, defenderDied: false, expAward: 0 };
      const progression = engine.applyCombatExp(unit, combatResult);

      expect(progression).toBeNull();
      expect(unit.exp).toBe(0);
    });

    it('returns null when attacker is dead', () => {
      const engine = new GameEngine(10, 10);
      const stats = createStats({ hp: 20, str: 8, mag: 2, skl: 7, spd: 8, luk: 6, def: 6, res: 2, mov: 5 });
      const unit = engine.addUnit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, stats, 2, 5);
      unit.takeDamage(999);

      const combatResult = { log: [], attackerDied: true, defenderDied: true, expAward: 30 };
      const progression = engine.applyCombatExp(unit, combatResult);

      expect(progression).toBeNull();
    });

    it('triggers level-up when exp reaches 100', () => {
      const engine = new GameEngine(10, 10);
      const stats = createStats({ hp: 20, str: 8, mag: 2, skl: 7, spd: 8, luk: 6, def: 6, res: 2, mov: 5 });
      const unit = engine.addUnit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, stats, 2, 5);
      unit.gainExp(80);

      const combatResult = { log: [], attackerDied: false, defenderDied: true, expAward: 30 };
      const progression = engine.applyCombatExp(unit, combatResult);

      expect(progression).not.toBeNull();
      expect(progression!.leveledUp).toBe(true);
      expect(unit.level).toBe(2);
      expect(unit.exp).toBe(10); // 80 + 30 = 110, overflow 10
    });
  });
});
