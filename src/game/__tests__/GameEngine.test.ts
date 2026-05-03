import { describe, it, expect } from 'vitest';
import { GameEngine } from '../GameEngine';
import { Faction, UnitClass } from '../units/Unit';
import { createStats } from '../units/Stats';
import { TerrainType } from '../map/Terrain';

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
});
