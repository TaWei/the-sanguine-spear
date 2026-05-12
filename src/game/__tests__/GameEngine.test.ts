import { describe, it, expect } from 'vitest';
import { GameEngine } from '../GameEngine';
import { Faction, UnitClass } from '../units/Unit';
import { createStats } from '../units/Stats';
import { TerrainType } from '../map/Terrain';
import { UNIT_STATE } from '../state/UnitState';
import { getLevel } from '../levels/LevelData';
import { createWeaponItem, createRecoveryItem } from '../items/ItemTypes';
import { ArmyGold } from '../shop/ArmyGold';
import { ShopItem } from '../shop/ShopEngine';
import { createItemByName } from '../items/ItemFactory';

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
    engine.awardCombatExp(unit, 10, false);
    expect(unit.exp).toBe(10);
  });

  it('awards combat exp with kill bonus', () => {
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
    engine.awardCombatExp(unit, 10, true);
    expect(unit.exp).toBe(40);
  });

  it('getWeaponForUnit returns correct weapon by class', () => {
    const engine = new GameEngine(10, 10);
    const stats = createStats({
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
    const mage = engine.addUnit('m1', 'Mage', Faction.ENEMY, UnitClass.MAGE, stats, 0, 0);
    const brigand = engine.addUnit('b1', 'Bandit', Faction.ENEMY, UnitClass.BRIGAND, stats, 1, 1);
    expect(engine.getWeaponForUnit(mage).name).toBe('Fire');
    expect(engine.getWeaponForUnit(brigand).name).toBe('Iron Axe');
  });

  it('addUnit creates unit with inventory containing default weapon', () => {
    const engine = new GameEngine(10, 10);
    const stats = createStats({
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
    const mage = engine.addUnit('m1', 'Mage', Faction.ENEMY, UnitClass.MAGE, stats, 0, 0);
    const lord = engine.addUnit('l1', 'Lord', Faction.PLAYER, UnitClass.LORD, stats, 1, 1);
    expect(mage.inventory.size).toBe(2);
    expect(mage.inventory.items[0].kind).toBe('weapon');
    expect(mage.inventory.items[0].name).toBe('Fire');
    expect(mage.inventory.items[1].kind).toBe('staff');
    expect(mage.inventory.items[1].name).toBe('Heal');
    expect(lord.inventory.size).toBe(1);
    expect(lord.inventory.items[0].name).toBe('Iron Sword');
  });

  it('getAdjacentEnemies returns adjacent enemies after move', () => {
    const engine = new GameEngine(10, 10);
    const stats = createStats({
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
    const enemyStats = createStats({
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
    const player = engine.addUnit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, stats, 5, 5);
    engine.addUnit('e1', 'Bandit', Faction.ENEMY, UnitClass.BRIGAND, enemyStats, 6, 5);
    engine.fog.setEnabled(false);
    const enemies = engine.getAdjacentEnemies(player);
    expect(enemies).toHaveLength(1);
  });

  it('resolvePlayerCombat returns a CombatResult with log', () => {
    const engine = new GameEngine(10, 10);
    const stats = createStats({
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
    const enemyStats = createStats({
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
    const player = engine.addUnit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, stats, 5, 5);
    const enemy = engine.addUnit(
      'e1',
      'Bandit',
      Faction.ENEMY,
      UnitClass.BRIGAND,
      enemyStats,
      6,
      5,
    );

    const result = engine.resolvePlayerCombat(player, enemy, () => 0); // guaranteed hit
    expect(result.log.length).toBeGreaterThan(0);
    expect(result.log[0].attacker).toBe(player);
    expect(result.log[0].defender).toBe(enemy);
  });

  it('resolvePlayerCombat applies damage to units', () => {
    const engine = new GameEngine(10, 10);
    const stats = createStats({
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
    const enemyStats = createStats({
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
    const player = engine.addUnit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, stats, 5, 5);
    const enemy = engine.addUnit(
      'e1',
      'Bandit',
      Faction.ENEMY,
      UnitClass.BRIGAND,
      enemyStats,
      6,
      5,
    );
    const enemyHpBefore = enemy.stats.hp;

    engine.resolvePlayerCombat(player, enemy, () => 0);
    expect(enemy.stats.hp).toBeLessThan(enemyHpBefore);
  });

  it('getCombatPreview returns hit/crit/damage without applying damage', () => {
    const engine = new GameEngine(10, 10);
    const stats = createStats({
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
    const enemyStats = createStats({
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
    const player = engine.addUnit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, stats, 5, 5);
    const enemy = engine.addUnit(
      'e1',
      'Bandit',
      Faction.ENEMY,
      UnitClass.BRIGAND,
      enemyStats,
      6,
      5,
    );

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
    const stats = createStats({
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
    const enemyStats = createStats({
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
    const player = engine.addUnit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, stats, 5, 5);
    const enemy = engine.addUnit(
      'e1',
      'Bandit',
      Faction.ENEMY,
      UnitClass.BRIGAND,
      enemyStats,
      7,
      5,
    );

    const preview = engine.getCombatPreview(player, enemy);
    expect(preview.defender).toBeNull();
  });

  it('resolvePlayerCombat with attackerWeaponIndex uses the weapon at that inventory index', () => {
    const engine = new GameEngine(10, 10);
    const stats = createStats({
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
    const enemyStats = createStats({
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
    const player = engine.addUnit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, stats, 5, 5);
    const enemy = engine.addUnit('e1', 'Bandit', Faction.ENEMY, UnitClass.BRIGAND, enemyStats, 6, 5);

    player.inventory.add(createWeaponItem('Iron Axe', 'axe', 15, 70, 0, 1, 1, false));

    const enemyHpBefore = enemy.stats.hp;
    engine.resolvePlayerCombat(player, enemy, () => 0, 1);
    const damageWithIndex = enemyHpBefore - enemy.stats.hp;

    expect(damageWithIndex).toBe(18);
  });

  it('getCombatPreview reflects selected inventory weapon stats', () => {
    const engine = new GameEngine(10, 10);
    const stats = createStats({
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
    const enemyStats = createStats({
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
    const player = engine.addUnit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, stats, 5, 5);
    const enemy = engine.addUnit('e1', 'Bandit', Faction.ENEMY, UnitClass.BRIGAND, enemyStats, 6, 5);

    player.inventory.add(createWeaponItem('Iron Axe', 'axe', 15, 70, 0, 1, 1, false));

    const previewDefault = engine.getCombatPreview(player, enemy);
    const previewIndexed = engine.getCombatPreview(player, enemy, 1);

    expect(previewDefault.attacker.damage).toBe(9);
    expect(previewIndexed.attacker.damage).toBe(18);
  });

  it('reports victory when all enemies are dead', () => {
    const engine = new GameEngine(10, 8);
    const stats = createStats({
      hp: 20,
      str: 5,
      mag: 5,
      skl: 5,
      spd: 5,
      luk: 5,
      def: 5,
      res: 5,
      mov: 5,
    });
    engine.addUnit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, stats, 0, 0);
    const enemy = engine.addUnit('e1', 'Bandit', Faction.ENEMY, UnitClass.BRIGAND, stats, 1, 1);
    enemy.takeDamage(999);

    const result = engine.checkObjectives();
    expect(result.victory).toBe(true);
    expect(result.defeat).toBe(false);
  });

  it('reports defeat when all players are dead', () => {
    const engine = new GameEngine(10, 8);
    const stats = createStats({
      hp: 20,
      str: 5,
      mag: 5,
      skl: 5,
      spd: 5,
      luk: 5,
      def: 5,
      res: 5,
      mov: 5,
    });
    const player = engine.addUnit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, stats, 0, 0);
    player.takeDamage(999);
    engine.addUnit('e1', 'Bandit', Faction.ENEMY, UnitClass.BRIGAND, stats, 1, 1);

    const result = engine.checkObjectives();
    expect(result.defeat).toBe(true);
    expect(result.victory).toBe(false);
  });

  it('endTurn returns hazard report with lava damage', () => {
    const engine = new GameEngine(10, 10);
    const stats = createStats({
      hp: 20,
      str: 5,
      mag: 5,
      skl: 5,
      spd: 5,
      luk: 5,
      def: 5,
      res: 5,
      mov: 5,
    });
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
    const stats = createStats({
      hp: 20,
      str: 5,
      mag: 5,
      skl: 5,
      spd: 5,
      luk: 5,
      def: 5,
      res: 5,
      mov: 5,
    });
    engine.addUnit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, stats, 0, 0);
    engine.addUnit('e1', 'Bandit', Faction.ENEMY, UnitClass.BRIGAND, stats, 1, 1);

    const result = engine.checkObjectives();
    expect(result.ongoing).toBe(true);
    expect(result.victory).toBe(false);
    expect(result.defeat).toBe(false);
  });

  it('applies lava damage at start of enemy phase', () => {
    const engine = new GameEngine(5, 5);
    const stats = createStats({
      hp: 20,
      maxHp: 20,
      str: 5,
      mag: 5,
      skl: 5,
      spd: 5,
      luk: 5,
      def: 5,
      res: 5,
      mov: 5,
    });
    const unit = engine.addUnit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, stats, 2, 2);
    engine.setTerrain(2, 2, TerrainType.LAVA);
    const hpBefore = unit.stats.hp;
    engine.endTurn(); // player → enemy, should apply hazards
    expect(unit.stats.hp).toBe(hpBefore - 5);
  });

  it('does not apply hazard damage during same phase', () => {
    const engine = new GameEngine(5, 5);
    const stats = createStats({
      hp: 20,
      maxHp: 20,
      str: 5,
      mag: 5,
      skl: 5,
      spd: 5,
      luk: 5,
      def: 5,
      res: 5,
      mov: 5,
    });
    const unit = engine.addUnit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, stats, 2, 2);
    engine.setTerrain(2, 2, TerrainType.LAVA);
    const hpBefore = unit.stats.hp;
    // No phase change yet
    expect(unit.stats.hp).toBe(hpBefore);
  });

  it('removes dead units from the grid and units array', () => {
    const engine = new GameEngine(10, 8);
    const stats = createStats({
      hp: 20,
      str: 5,
      mag: 5,
      skl: 5,
      spd: 5,
      luk: 5,
      def: 5,
      res: 5,
      mov: 5,
    });
    const enemy = engine.addUnit('e1', 'Bandit', Faction.ENEMY, UnitClass.BRIGAND, stats, 3, 3);
    enemy.takeDamage(999);

    engine.removeDeadUnits();
    expect(engine.getUnit(3, 3)).toBeNull();
    expect(engine.getAllUnits()).toHaveLength(0);
    expect(engine.getUnitsByFaction(Faction.ENEMY)).toHaveLength(0);
  });

  it('cycles through all phases correctly after removeDeadUnits', () => {
    const engine = new GameEngine(10, 10);
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
    const enemy = engine.addUnit('e1', 'Bandit', Faction.ENEMY, UnitClass.BRIGAND, stats, 7, 5);

    enemy.takeDamage(999);
    engine.removeDeadUnits();

    // Should still cycle Player → Enemy → Ally → Player
    engine.endTurn();
    expect(engine.turnManager.isEnemyPhase()).toBe(true);

    engine.endTurn();
    expect(engine.turnManager.isAllyPhase()).toBe(true);

    engine.endTurn();
    expect(engine.turnManager.isPlayerPhase()).toBe(true);
    expect(engine.turnManager.turnNumber).toBe(2);
  });

  it('returns true when all live player units are exhausted', () => {
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
    const dead = engine.addUnit('p1', 'A', Faction.PLAYER, UnitClass.LORD, stats, 0, 0);
    dead.takeDamage(999);
    engine.addUnit('p2', 'B', Faction.PLAYER, UnitClass.MAGE, stats, 1, 1);
    expect(engine.allPlayerUnitsExhausted()).toBe(false);
  });

  it('getThreatenedTiles returns attackable tiles outside move range', () => {
    const engine = new GameEngine(10, 10);
    const stats = createStats({
      hp: 22,
      str: 8,
      mag: 2,
      skl: 7,
      spd: 8,
      luk: 6,
      def: 6,
      res: 2,
      mov: 2,
    });
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
    const eStats = createStats({
      hp: 26,
      str: 9,
      mag: 0,
      skl: 4,
      spd: 5,
      luk: 3,
      def: 5,
      res: 1,
      mov: 3,
    });
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
    const stats = createStats({
      hp: 22,
      str: 8,
      mag: 2,
      skl: 7,
      spd: 8,
      luk: 6,
      def: 6,
      res: 2,
      mov: 3,
    });
    const unit = engine.addUnit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, stats, 5, 5);
    const path = engine.findPath(unit, 7, 5);
    expect(path).not.toBeNull();
    expect(path).toHaveLength(2);
    expect(path![0]).toEqual({ x: 6, y: 5 });
    expect(path![1]).toEqual({ x: 7, y: 5 });
  });

  it('findPath returns null for unreachable tile', () => {
    const engine = new GameEngine(10, 10);
    const stats = createStats({
      hp: 22,
      str: 8,
      mag: 2,
      skl: 7,
      spd: 8,
      luk: 6,
      def: 6,
      res: 2,
      mov: 2,
    });
    const unit = engine.addUnit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, stats, 5, 5);
    const path = engine.findPath(unit, 8, 5);
    expect(path).toBeNull();
  });

  it('moveUnit throws when destination is occupied by another unit', () => {
    const engine = new GameEngine(10, 10);
    const stats = createStats({
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
    const player = engine.addUnit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, stats, 5, 5);
    engine.addUnit('e1', 'Bandit', Faction.ENEMY, UnitClass.BRIGAND, stats, 6, 5);
    expect(() => {
      engine.moveUnit(player, 6, 5);
    }).toThrow('occupied');
  });

  it('moveUnit is a no-op when moving to the current tile', () => {
    const engine = new GameEngine(10, 10);
    const stats = createStats({
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
    const player = engine.addUnit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, stats, 5, 5);
    expect(() => {
      engine.moveUnit(player, 5, 5);
    }).not.toThrow();
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
      const attackerStats = createStats({
        hp: 30,
        str: 12,
        mag: 2,
        skl: 20,
        spd: 10,
        luk: 5,
        def: 6,
        res: 2,
        mov: 5,
      });
      const defenderStats = createStats({
        hp: 18,
        maxHp: 18,
        str: 8,
        mag: 2,
        skl: 7,
        spd: 5,
        luk: 0,
        def: 4,
        res: 2,
        mov: 5,
      });
      const attacker = engine.addUnit(
        'p1',
        'Rowan',
        Faction.PLAYER,
        UnitClass.SWORDMASTER,
        attackerStats,
        5,
        5,
      );
      const defender = engine.addUnit(
        'e1',
        'Bandit',
        Faction.ENEMY,
        UnitClass.BRIGAND,
        defenderStats,
        5,
        6,
      );

      const preview = engine.getCombatPreview(attacker, defender);
      expect(preview.attacker.crit).toBeGreaterThan(0);
      // critRate = floor(20/2) + 30 + 15 = 55; critAvoid = 0; displayCrit = 55
      expect(preview.attacker.crit).toBe(55);
      // base damage = 12 + 9 - 4 = 17; crit damage = 51 which exceeds defender HP
      expect(preview.attacker.damage * 3).toBeGreaterThanOrEqual(defender.stats.hp);
    });

    it('high luck nullifies enemy crit entirely', () => {
      const engine = new GameEngine(10, 10);
      const attackerStats = createStats({
        hp: 30,
        str: 12,
        mag: 2,
        skl: 20,
        spd: 10,
        luk: 5,
        def: 6,
        res: 2,
        mov: 5,
      });
      const defenderStats = createStats({
        hp: 30,
        maxHp: 30,
        str: 8,
        mag: 2,
        skl: 7,
        spd: 5,
        luk: 70,
        def: 6,
        res: 2,
        mov: 5,
      });
      const attacker = engine.addUnit(
        'p1',
        'Rowan',
        Faction.PLAYER,
        UnitClass.SWORDMASTER,
        attackerStats,
        5,
        5,
      );
      const defender = engine.addUnit(
        'e1',
        'Bandit',
        Faction.ENEMY,
        UnitClass.BRIGAND,
        defenderStats,
        5,
        6,
      );

      const preview = engine.getCombatPreview(attacker, defender);
      // critRate = floor(20/2) + 30 + 15 = 65; critAvoid = 70; displayCrit = max(0, 65-70) = 0
      expect(preview.attacker.crit).toBe(0);
    });
  });

  describe('applyCombatExp', () => {
    it('grants exp from combat result and returns progression result', () => {
      const engine = new GameEngine(10, 10);
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

      const combatResult = { log: [], attackerDied: false, defenderDied: true, expAward: 30 };
      const progression = engine.applyCombatExp(unit, combatResult);

      expect(progression).not.toBeNull();
      expect(progression!.expGained).toBe(30);
      expect(unit.exp).toBe(30);
    });

    it('returns null when expAward is 0', () => {
      const engine = new GameEngine(10, 10);
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

      const combatResult = { log: [], attackerDied: false, defenderDied: false, expAward: 0 };
      const progression = engine.applyCombatExp(unit, combatResult);

      expect(progression).toBeNull();
      expect(unit.exp).toBe(0);
    });

    it('returns null when attacker is dead', () => {
      const engine = new GameEngine(10, 10);
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

      const combatResult = { log: [], attackerDied: true, defenderDied: true, expAward: 30 };
      const progression = engine.applyCombatExp(unit, combatResult);

      expect(progression).toBeNull();
    });

    it('triggers level-up when exp reaches 100', () => {
      const engine = new GameEngine(10, 10);
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
      unit.gainExp(80);

      const combatResult = { log: [], attackerDied: false, defenderDied: true, expAward: 30 };
      const progression = engine.applyCombatExp(unit, combatResult);

      expect(progression).not.toBeNull();
      expect(progression!.leveledUp).toBe(true);
      expect(unit.level).toBe(2);
      expect(unit.exp).toBe(10); // 80 + 30 = 110, overflow 10
    });
    it('can check promotion eligibility through GameEngine', () => {
      const engine = new GameEngine(10, 8);
      const stats = createStats({
        hp: 22, str: 8, mag: 2, skl: 7, spd: 8, luk: 6, def: 6, res: 2, mov: 5,
      });
      const unit = engine.addUnit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, stats, 2, 5);
      // Default level 1 — not eligible
      expect(engine.canPromote(unit)).toBe(false);
    });

    it('promotes a unit through GameEngine', () => {
      const engine = new GameEngine(10, 8);
      const stats = createStats({
        hp: 22, str: 8, mag: 2, skl: 7, spd: 8, luk: 6, def: 6, res: 2, mov: 5,
      });
      const unit = engine.addUnit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, stats, 2, 5);
      // Simulate level 10 via internal assignment for test
      (unit as unknown as { _level: number })._level = 10;
      const result = engine.promote(unit);
      expect(result.success).toBe(true);
      expect(unit.unitClass).toBe('paladin');
    });
  });

  describe('gold, shop, trade, and allies integration', () => {
    it('has starting gold of 0 by default', () => {
      const engine = new GameEngine(10, 8);
      expect(engine.gold.amount).toBe(0);
    });

    it('can add gold to army purse', () => {
      const engine = new GameEngine(10, 8);
      engine.gold.add(100);
      expect(engine.gold.amount).toBe(100);
    });

    it('can create a shop from level definition', () => {
      const engine = new GameEngine(10, 8);
      const stats = createStats({
        hp: 20, str: 5, mag: 5, skl: 5, spd: 5, luk: 5, def: 5, res: 5, mov: 5,
      });
      const unit = engine.addUnit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, stats, 0, 0);
      engine.gold.add(500);

      const shop = engine.createShop([{ name: 'Iron Sword', price: 100 }]);
      expect(shop.stock.length).toBe(1);
      expect(shop.stock[0].item.name).toBe('Iron Sword');

      const result = shop.buy(unit, shop.stock[0]);
      expect(result.success).toBe(true);
      expect(engine.gold.amount).toBe(400);
    });

    it('canTrade returns true for adjacent allies', () => {
      const engine = new GameEngine(10, 8);
      const stats = createStats({
        hp: 20, str: 5, mag: 5, skl: 5, spd: 5, luk: 5, def: 5, res: 5, mov: 5,
      });
      const a = engine.addUnit('p1', 'A', Faction.PLAYER, UnitClass.LORD, stats, 2, 2);
      const b = engine.addUnit('p2', 'B', Faction.PLAYER, UnitClass.MERCENARY, stats, 3, 2);
      expect(engine.canTrade(a, b)).toBe(true);
    });

    it('canTrade returns false for non-adjacent units', () => {
      const engine = new GameEngine(10, 8);
      const stats = createStats({
        hp: 20, str: 5, mag: 5, skl: 5, spd: 5, luk: 5, def: 5, res: 5, mov: 5,
      });
      const a = engine.addUnit('p1', 'A', Faction.PLAYER, UnitClass.LORD, stats, 2, 2);
      const b = engine.addUnit('p2', 'B', Faction.PLAYER, UnitClass.MERCENARY, stats, 5, 5);
      expect(engine.canTrade(a, b)).toBe(false);
    });

    it('executeTrade swaps items between units', () => {
      const engine = new GameEngine(10, 8);
      const stats = createStats({
        hp: 20, str: 5, mag: 5, skl: 5, spd: 5, luk: 5, def: 5, res: 5, mov: 5,
      });
      const a = engine.addUnit('p1', 'A', Faction.PLAYER, UnitClass.LORD, stats, 2, 2);
      const b = engine.addUnit('p2', 'B', Faction.PLAYER, UnitClass.MERCENARY, stats, 3, 2);

      a.inventory.add(createWeaponItem('Iron Sword', 'sword', 5, 90, 0, 1, 1, false));
      b.inventory.add(createRecoveryItem('Vulnerary', 10));

      const result = engine.executeTrade(a, 1, b, 1);
      expect(result.success).toBe(true);
      expect(a.inventory.items[1].name).toBe('Vulnerary');
      expect(b.inventory.items[1].name).toBe('Iron Sword');
    });

    it('getAdjacentAllies returns player units next to a unit', () => {
      const engine = new GameEngine(10, 8);
      const stats = createStats({
        hp: 20, str: 5, mag: 5, skl: 5, spd: 5, luk: 5, def: 5, res: 5, mov: 5,
      });
      const target = engine.addUnit('p1', 'Target', Faction.PLAYER, UnitClass.LORD, stats, 2, 2);
      const ally = engine.addUnit('p2', 'Ally', Faction.PLAYER, UnitClass.MERCENARY, stats, 3, 2);
      engine.addUnit('e1', 'Enemy', Faction.ENEMY, UnitClass.BRIGAND, stats, 2, 3);

      const adjacent = engine.getAdjacentAllies(target);
      expect(adjacent).toHaveLength(1);
      expect(adjacent[0].id).toBe('p2');
    });
  });

  describe('Rescue / Drop', () => {
    it('canRescue returns true for cavalry + adjacent lord', () => {
      const engine = new GameEngine(8, 8);
      engine.setTerrain(3, 3, 'plains');
      engine.setTerrain(4, 3, 'plains');
      const cav = engine.addUnit('u1', 'Seth', Faction.PLAYER, UnitClass.CAVALRY,
        createStats({ hp: 25, maxHp: 25, str: 10, mag: 0, skl: 10, spd: 10, luk: 3, def: 8, res: 2, mov: 7 }),
        3, 3);
      const lord = engine.addUnit('u2', 'Eirika', Faction.PLAYER, UnitClass.LORD,
        createStats({ hp: 18, maxHp: 18, str: 6, mag: 0, skl: 8, spd: 10, luk: 7, def: 5, res: 2, mov: 5 }),
        4, 3);
      expect(engine.canRescue(cav, lord)).toBe(true);
    });

    it('canRescue returns false for non-adjacent units', () => {
      const engine = new GameEngine(8, 8);
      const cav = engine.addUnit('u1', 'Seth', Faction.PLAYER, UnitClass.CAVALRY,
        createStats({ hp: 25, maxHp: 25, str: 10, mag: 0, skl: 10, spd: 10, luk: 3, def: 8, res: 2, mov: 7 }),
        3, 3);
      const lord = engine.addUnit('u2', 'Eirika', Faction.PLAYER, UnitClass.LORD,
        createStats({ hp: 18, maxHp: 18, str: 6, mag: 0, skl: 8, spd: 10, luk: 7, def: 5, res: 2, mov: 5 }),
        6, 3);
      expect(engine.canRescue(cav, lord)).toBe(false);
    });

    it('cannot rescue diagonally', () => {
      const engine = new GameEngine(8, 8);
      const cav = engine.addUnit('u1', 'Seth', Faction.PLAYER, UnitClass.CAVALRY,
        createStats({ hp: 25, maxHp: 25, str: 10, mag: 0, skl: 10, spd: 10, luk: 3, def: 8, res: 2, mov: 7 }),
        3, 3);
      const lord = engine.addUnit('u2', 'Eirika', Faction.PLAYER, UnitClass.LORD,
        createStats({ hp: 18, maxHp: 18, str: 6, mag: 0, skl: 8, spd: 10, luk: 7, def: 5, res: 2, mov: 5 }),
        4, 4);
      expect(engine.canRescue(cav, lord)).toBe(false);
    });

    it('rescue removes the rescued unit from the grid', () => {
      const engine = new GameEngine(8, 8);
      engine.setTerrain(3, 3, 'plains');
      engine.setTerrain(4, 3, 'plains');
      const cav = engine.addUnit('u1', 'Seth', Faction.PLAYER, UnitClass.CAVALRY,
        createStats({ hp: 25, maxHp: 25, str: 10, mag: 0, skl: 14, spd: 12, luk: 3, def: 8, res: 2, mov: 7 }),
        3, 3);
      const lord = engine.addUnit('u2', 'Eirika', Faction.PLAYER, UnitClass.LORD,
        createStats({ hp: 18, maxHp: 18, str: 6, mag: 0, skl: 8, spd: 10, luk: 7, def: 5, res: 2, mov: 5 }),
        4, 3);
      engine.rescue(cav, lord);
      // Lord is no longer on the grid
      expect(engine.getUnit(4, 3)).toBeNull();
      // Cav is carrying the lord
      expect(cav.rescuedUnit).toBe(lord);
      expect(lord.rescuedBy).toBe(cav);
    });

    it('drop places rescued unit on adjacent empty tile', () => {
      const engine = new GameEngine(8, 8);
      engine.setTerrain(3, 3, 'plains');
      engine.setTerrain(4, 3, 'plains');
      engine.setTerrain(3, 4, 'plains');
      const cav = engine.addUnit('u1', 'Seth', Faction.PLAYER, UnitClass.CAVALRY,
        createStats({ hp: 25, maxHp: 25, str: 10, mag: 0, skl: 14, spd: 12, luk: 3, def: 8, res: 2, mov: 7 }),
        3, 3);
      const lord = engine.addUnit('u2', 'Eirika', Faction.PLAYER, UnitClass.LORD,
        createStats({ hp: 18, maxHp: 18, str: 6, mag: 0, skl: 8, spd: 10, luk: 7, def: 5, res: 2, mov: 5 }),
        4, 3);
      engine.rescue(cav, lord);
      engine.drop(cav, 3, 4);
      expect(engine.getUnit(3, 4)).toBe(lord);
      expect(lord.gridX).toBe(3);
      expect(lord.gridY).toBe(4);
      expect(cav.rescuedUnit).toBeNull();
      expect(lord.rescuedBy).toBeNull();
      // Cav stats restored
      expect(cav.stats.skl).toBe(14);
    });

    it('throw if drop target is occupied', () => {
      const engine = new GameEngine(8, 8);
      engine.setTerrain(3, 3, 'plains');
      engine.setTerrain(4, 3, 'plains');
      engine.setTerrain(3, 4, 'plains');
      const cav = engine.addUnit('u1', 'Seth', Faction.PLAYER, UnitClass.CAVALRY,
        createStats({ hp: 25, maxHp: 25, str: 10, mag: 0, skl: 14, spd: 12, luk: 3, def: 8, res: 2, mov: 7 }),
        3, 3);
      const lord = engine.addUnit('u2', 'Eirika', Faction.PLAYER, UnitClass.LORD,
        createStats({ hp: 18, maxHp: 18, str: 6, mag: 0, skl: 8, spd: 10, luk: 7, def: 5, res: 2, mov: 5 }),
        4, 3);
      engine.addUnit('u3', 'Franz', Faction.PLAYER, UnitClass.CAVALRY,
        createStats({ hp: 22, maxHp: 22, str: 8, mag: 0, skl: 9, spd: 10, luk: 3, def: 7, res: 2, mov: 7 }),
        3, 4);
      engine.rescue(cav, lord);
      expect(() => engine.drop(cav, 3, 4)).toThrow(/occupied/);
    });
  });

  describe('Give / Take', () => {
    it('give transfers rescued unit to adjacent ally', () => {
      const engine = new GameEngine(8, 8);
      engine.setTerrain(3, 3, 'plains');
      engine.setTerrain(4, 3, 'plains');
      engine.setTerrain(4, 4, 'plains');
    engine.setTerrain(3, 4, 'plains');
      const cav = engine.addUnit('u1', 'Seth', Faction.PLAYER, UnitClass.CAVALRY,
        createStats({ hp: 25, maxHp: 25, str: 10, mag: 0, skl: 10, spd: 10, luk: 3, def: 8, res: 2, mov: 7 }),
        3, 3);
      const lord = engine.addUnit('u2', 'Eirika', Faction.PLAYER, UnitClass.LORD,
        createStats({ hp: 18, maxHp: 18, str: 6, mag: 0, skl: 8, spd: 10, luk: 7, def: 5, res: 2, mov: 5 }),
        4, 3);
      const cav2 = engine.addUnit('u3', 'Franz', Faction.PLAYER, UnitClass.CAVALRY,
        createStats({ hp: 22, maxHp: 22, str: 8, mag: 0, skl: 9, spd: 10, luk: 3, def: 7, res: 2, mov: 7 }),
        3, 4);
      engine.rescue(cav, lord);
      engine.giveUnit(cav, cav2);
      expect(cav.rescuedUnit).toBeNull();
      expect(cav2.rescuedUnit).toBe(lord);
      expect(lord.rescuedBy).toBe(cav2);
    });

    it('take steals rescued unit from adjacent carrier', () => {
      const engine = new GameEngine(8, 8);
      engine.setTerrain(3, 3, 'plains');
      engine.setTerrain(4, 3, 'plains');
      engine.setTerrain(4, 4, 'plains');
    engine.setTerrain(3, 4, 'plains');
      const cav = engine.addUnit('u1', 'Seth', Faction.PLAYER, UnitClass.CAVALRY,
        createStats({ hp: 25, maxHp: 25, str: 10, mag: 0, skl: 10, spd: 10, luk: 3, def: 8, res: 2, mov: 7 }),
        3, 3);
      const lord = engine.addUnit('u2', 'Eirika', Faction.PLAYER, UnitClass.LORD,
        createStats({ hp: 18, maxHp: 18, str: 6, mag: 0, skl: 8, spd: 10, luk: 7, def: 5, res: 2, mov: 5 }),
        4, 3);
      const cav2 = engine.addUnit('u3', 'Franz', Faction.PLAYER, UnitClass.CAVALRY,
        createStats({ hp: 22, maxHp: 22, str: 8, mag: 0, skl: 9, spd: 10, luk: 3, def: 7, res: 2, mov: 7 }),
        3, 4);
      engine.rescue(cav, lord);
      engine.takeUnit(cav2, cav);
      expect(cav.rescuedUnit).toBeNull();
      expect(cav2.rescuedUnit).toBe(lord);
      expect(lord.rescuedBy).toBe(cav2);
    });
  });

  describe('Rescue edge cases', () => {
    it('rescued unit dies when carrier dies', () => {
      const engine = new GameEngine(8, 8);
      engine.setTerrain(3, 3, 'plains');
      engine.setTerrain(4, 3, 'plains');
      const cav = engine.addUnit('u1', 'Seth', Faction.PLAYER, UnitClass.CAVALRY,
        createStats({ hp: 5, maxHp: 25, str: 10, mag: 0, skl: 10, spd: 10, luk: 3, def: 8, res: 2, mov: 7 }),
        3, 3);
      const lord = engine.addUnit('u2', 'Eirika', Faction.PLAYER, UnitClass.LORD,
        createStats({ hp: 18, maxHp: 18, str: 6, mag: 0, skl: 8, spd: 10, luk: 7, def: 5, res: 2, mov: 5 }),
        4, 3);
      engine.rescue(cav, lord);
      // Kill the carrier
      cav.takeDamage(999);
      engine.killPassengersIfCarrierDead();
      expect(lord.isAlive).toBe(false);
    });
  });

  describe('Objective save/load', () => {
    it('snapshot persists seized tile state', () => {
      const engine = new GameEngine(10, 10);
      const stats = createStats({
        hp: 20, maxHp: 20, str: 8, mag: 2, skl: 7, spd: 8, luk: 6, def: 6, res: 2, mov: 5,
      });
      engine.loadLevel({
        id: 'test',
        name: 'Test',
        cols: 10,
        rows: 10,
        terrain: [{ x: 5, y: 5, type: TerrainType.THRONE }],
        units: [{ id: 'p1', name: 'Rowan', faction: Faction.PLAYER, unitClass: UnitClass.LORD, stats, x: 5, y: 5 }],
        objectives: [{ type: 'seize' as const, seizeTiles: [{ x: 5, y: 5 }] }],
      });
      const unit = engine.getUnit(5, 5)!;
      engine.moveUnit(unit, 5, 5);
      const moveResult = engine.checkMoveObjective(unit);
      expect(moveResult.victory).toBe(true);

      const snap = engine.snapshot('test');
      expect(snap.objectiveState?.seizedTiles).toEqual([{ x: 5, y: 5 }]);
    });

    it('restore rehydrates seized tile state', () => {
      const engine = new GameEngine(10, 10);
      const stats = createStats({
        hp: 20, maxHp: 20, str: 8, mag: 2, skl: 7, spd: 8, luk: 6, def: 6, res: 2, mov: 5,
      });
      engine.loadLevel({
        id: 'test',
        name: 'Test',
        cols: 10,
        rows: 10,
        terrain: [{ x: 5, y: 5, type: TerrainType.THRONE }],
        units: [{ id: 'p1', name: 'Rowan', faction: Faction.PLAYER, unitClass: UnitClass.LORD, stats, x: 3, y: 3 }],
        objectives: [{ type: 'seize' as const, seizeTiles: [{ x: 5, y: 5 }, { x: 7, y: 7 }] }],
      });

      const snap = engine.snapshot('test');
      snap.objectiveState = { seizedTiles: [{ x: 5, y: 5 }] };

      const engine2 = new GameEngine(10, 10);
      engine2.restore(snap, {
        id: 'test',
        name: 'Test',
        cols: 10,
        rows: 10,
        terrain: [{ x: 5, y: 5, type: TerrainType.THRONE }],
        units: [{ id: 'p1', name: 'Rowan', faction: Faction.PLAYER, unitClass: UnitClass.LORD, stats, x: 3, y: 3 }],
        objectives: [{ type: 'seize' as const, seizeTiles: [{ x: 5, y: 5 }, { x: 7, y: 7 }] }],
      });

      // One tile already seized from save; seizing the second should trigger victory
      const unit = engine2.getUnit(3, 3)!;
      engine2.moveUnit(unit, 7, 7);
      const result = engine2.checkMoveObjective(unit);
      expect(result.victory).toBe(true);
    });
  });

  describe('Defend objective integration', () => {
    it('does not return victory during player phase even when turnNumber >= defendTurns', () => {
      const engine = new GameEngine(10, 10);
      const stats = createStats({
        hp: 20, maxHp: 20, str: 8, mag: 2, skl: 7, spd: 8, luk: 6, def: 6, res: 2, mov: 5,
      });
      engine.loadLevel({
        id: 'test',
        name: 'Test',
        cols: 10,
        rows: 10,
        terrain: [],
        units: [
          { id: 'p1', name: 'Rowan', faction: Faction.PLAYER, unitClass: UnitClass.LORD, stats, x: 0, y: 0 },
          { id: 'npc1', name: 'NPC', faction: Faction.ALLY, unitClass: UnitClass.SOLDIER, stats, x: 1, y: 1 },
          { id: 'e1', name: 'Bandit', faction: Faction.ENEMY, unitClass: UnitClass.BRIGAND, stats, x: 5, y: 5 },
        ],
        objectives: [{ type: 'defend' as const, defendTargetId: 'npc1', defendTurns: 1 }],
      });

      // Turn 1, player phase — should NOT trigger victory mid-turn
      engine.turnManager.turnNumber = 1;
      const result = engine.checkObjectives();
      expect(result.victory).toBe(false);
      expect(result.ongoing).toBe(true);
    });

    it('returns victory during enemy phase when turnNumber >= defendTurns', () => {
      const engine = new GameEngine(10, 10);
      const stats = createStats({
        hp: 20, maxHp: 20, str: 8, mag: 2, skl: 7, spd: 8, luk: 6, def: 6, res: 2, mov: 5,
      });
      engine.loadLevel({
        id: 'test',
        name: 'Test',
        cols: 10,
        rows: 10,
        terrain: [],
        units: [
          { id: 'p1', name: 'Rowan', faction: Faction.PLAYER, unitClass: UnitClass.LORD, stats, x: 0, y: 0 },
          { id: 'npc1', name: 'NPC', faction: Faction.ALLY, unitClass: UnitClass.SOLDIER, stats, x: 1, y: 1 },
          { id: 'e1', name: 'Bandit', faction: Faction.ENEMY, unitClass: UnitClass.BRIGAND, stats, x: 5, y: 5 },
        ],
        objectives: [{ type: 'defend' as const, defendTargetId: 'npc1', defendTurns: 1 }],
      });

      engine.turnManager.turnNumber = 1;
      engine.turnManager.currentPhase = 'enemy';
      const result = engine.checkObjectives();
      expect(result.victory).toBe(true);
    });

    it('returns defeat immediately when defend target dies', () => {
      const engine = new GameEngine(10, 10);
      const stats = createStats({
        hp: 20, maxHp: 20, str: 8, mag: 2, skl: 7, spd: 8, luk: 6, def: 6, res: 2, mov: 5,
      });
      engine.loadLevel({
        id: 'test',
        name: 'Test',
        cols: 10,
        rows: 10,
        terrain: [],
        units: [
          { id: 'p1', name: 'Rowan', faction: Faction.PLAYER, unitClass: UnitClass.LORD, stats, x: 0, y: 0 },
          { id: 'npc1', name: 'NPC', faction: Faction.ALLY, unitClass: UnitClass.SOLDIER, stats, x: 1, y: 1 },
          { id: 'e1', name: 'Bandit', faction: Faction.ENEMY, unitClass: UnitClass.BRIGAND, stats, x: 5, y: 5 },
        ],
        objectives: [{ type: 'defend' as const, defendTargetId: 'npc1', defendTurns: 5 }],
      });

      const npc = engine.getUnit(1, 1)!;
      npc.takeDamage(999);
      const result = engine.checkObjectives();
      expect(result.defeat).toBe(true);
      expect(result.victory).toBe(false);
    });
  });

  describe('Escape objective integration', () => {
    it('returns victory when escape unit reaches escape tile', () => {
      const engine = new GameEngine(10, 10);
      const stats = createStats({
        hp: 20, maxHp: 20, str: 8, mag: 2, skl: 7, spd: 8, luk: 6, def: 6, res: 2, mov: 5,
      });
      engine.loadLevel({
        id: 'test',
        name: 'Test',
        cols: 10,
        rows: 10,
        terrain: [{ x: 3, y: 3, type: TerrainType.ESCAPE }],
        units: [
          { id: 'p1', name: 'Rowan', faction: Faction.PLAYER, unitClass: UnitClass.LORD, stats, x: 3, y: 3 },
          { id: 'e1', name: 'Bandit', faction: Faction.ENEMY, unitClass: UnitClass.BRIGAND, stats, x: 5, y: 5 },
        ],
        objectives: [{ type: 'escape' as const, escapeUnitId: 'p1', escapeTiles: [{ x: 3, y: 3 }] }],
      });

      const unit = engine.getUnit(3, 3)!;
      const result = engine.checkMoveObjective(unit);
      expect(result.victory).toBe(true);
      expect(result.message).toBe('Escaped with the secret report!');
    });

    it('returns ongoing when wrong unit reaches escape tile', () => {
      const engine = new GameEngine(10, 10);
      const stats = createStats({
        hp: 20, maxHp: 20, str: 8, mag: 2, skl: 7, spd: 8, luk: 6, def: 6, res: 2, mov: 5,
      });
      engine.loadLevel({
        id: 'test',
        name: 'Test',
        cols: 10,
        rows: 10,
        terrain: [{ x: 3, y: 3, type: TerrainType.ESCAPE }],
        units: [
          { id: 'p1', name: 'Rowan', faction: Faction.PLAYER, unitClass: UnitClass.LORD, stats, x: 2, y: 2 },
          { id: 'p2', name: 'Mage', faction: Faction.PLAYER, unitClass: UnitClass.MAGE, stats, x: 3, y: 3 },
          { id: 'e1', name: 'Bandit', faction: Faction.ENEMY, unitClass: UnitClass.BRIGAND, stats, x: 5, y: 5 },
        ],
        objectives: [{ type: 'escape' as const, escapeUnitId: 'p1', escapeTiles: [{ x: 3, y: 3 }] }],
      });

      const mage = engine.getUnit(3, 3)!;
      const result = engine.checkMoveObjective(mage);
      expect(result.victory).toBe(false);
      expect(result.ongoing).toBe(true);
    });
  });

  describe('ally phase', () => {
    it('queues ally actions via executeAllyActions', () => {
      const engine = new GameEngine(10, 10);
      const stats = createStats({
        hp: 22, maxHp: 22, str: 8, mag: 2, skl: 7, spd: 8, luk: 6, def: 6, res: 2, mov: 5,
      });
      const enemyStats = createStats({
        hp: 26, maxHp: 26, str: 9, mag: 0, skl: 4, spd: 5, luk: 3, def: 5, res: 1, mov: 5,
      });
      engine.addUnit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, stats, 2, 2);
      engine.addUnit('e1', 'Bandit', Faction.ENEMY, UnitClass.BRIGAND, enemyStats, 3, 2);
      engine.addUnit('a1', 'Ally', Faction.ALLY, UnitClass.MERCENARY, stats, 1, 1);

      engine.endTurn(); // player -> enemy
      engine.endTurn(); // enemy -> ally
      expect(engine.turnManager.isAllyPhase()).toBe(true);

      engine.executeAllyActions();
      const actions = engine.getPendingActions();
      expect(actions.length).toBeGreaterThan(0);
      expect(actions.some((a) => a.actor.faction === 'ally')).toBe(true);
    });

    it('ally heals injured player unit with staff', () => {
      const engine = new GameEngine(10, 10);
      const stats = createStats({
        hp: 22, maxHp: 22, str: 8, mag: 2, skl: 7, spd: 8, luk: 6, def: 6, res: 2, mov: 5,
      });
      const allyStats = createStats({
        hp: 20, maxHp: 20, str: 5, mag: 6, skl: 5, spd: 5, luk: 5, def: 4, res: 6, mov: 5,
      });
      const player = engine.addUnit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, stats, 2, 2);
      engine.addUnit('a1', 'Cleric', Faction.ALLY, UnitClass.MAGE, allyStats, 2, 3);

      player.takeDamage(10); // hp = 12

      engine.endTurn(); // player -> enemy
      engine.endTurn(); // enemy -> ally
      engine.executeAllyActions();

      const healAction = engine.getPendingActions().find((a) => a.type === 'staff');
      expect(healAction).toBeDefined();
      expect(healAction!.actor.faction).toBe('ally');
      expect(healAction!.targetX).toBe(2);
      expect(healAction!.targetY).toBe(2);
    });

    it('save/load preserves ally phase state', () => {
      const engine = new GameEngine(8, 8);
      engine.addUnit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, createStats({
        hp: 22, maxHp: 22, str: 8, mag: 2, skl: 7, spd: 8, luk: 6, def: 6, res: 2, mov: 5,
      }), 2, 5);
      engine.addUnit('a1', 'Ally', Faction.ALLY, UnitClass.MERCENARY, createStats({
        hp: 20, maxHp: 20, str: 8, mag: 2, skl: 7, spd: 8, luk: 6, def: 6, res: 2, mov: 5,
      }), 3, 5);

      engine.endTurn(); // player -> enemy
      engine.endTurn(); // enemy -> ally
      expect(engine.turnManager.isAllyPhase()).toBe(true);

      const snapshot = engine.snapshot('test');
      const restoredEngine = new GameEngine(1, 1);
      restoredEngine.restore(snapshot);

      expect(restoredEngine.turnManager.isAllyPhase()).toBe(true);
      expect(restoredEngine.getUnitsByFaction(Faction.ALLY)).toHaveLength(1);
      const restoredAlly = restoredEngine.getUnit(3, 5)!;
      expect(restoredAlly.name).toBe('Ally');
      expect(restoredAlly.faction).toBe('ally');
    });
  });
});
