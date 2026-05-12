import { describe, it, expect } from 'vitest';
import { Commander } from '../Commander';
import { Unit, Faction, UnitClass } from '../../units/Unit';
import { createStats } from '../../units/Stats';
import { Grid } from '../../map/Grid';
import { WEAPON_DB } from '../../combat/Weapons';
import { ActionType } from '../../state/ActionQueue';
import { AiPersonality } from '../Personality';
import { AiBehavior } from '../Behavior';
import { TerrainType } from '../../map/Terrain';
import { createWeaponItem } from '../../items/ItemTypes';

describe('Commander', () => {
  it('generates actions for enemies to attack nearby players', () => {
    const grid = new Grid(10, 10);

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
    const enemy = new Unit('e1', 'Bandit', Faction.ENEMY, UnitClass.BRIGAND, enemyStats, 5, 5);
    grid.placeUnit(enemy, 5, 5);

    const playerStats = createStats({
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
    const player = new Unit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, playerStats, 6, 5);
    grid.placeUnit(player, 6, 5);

    const commander = new Commander(grid, WEAPON_DB);
    const actions = commander.planEnemyTurn([enemy], [player]);

    expect(actions.length).toBeGreaterThan(0);
    const attackAction = actions.find((a) => a.type === ActionType.ATTACK);
    expect(attackAction).toBeDefined();
    expect(attackAction!.targetX).toBe(6);
    expect(attackAction!.targetY).toBe(5);
  });

  it('returns empty actions when no players in range', () => {
    const grid = new Grid(10, 10);

    const enemyStats = createStats({
      hp: 26,
      str: 9,
      mag: 0,
      skl: 4,
      spd: 5,
      luk: 3,
      def: 5,
      res: 1,
      mov: 1,
    });
    const enemy = new Unit('e1', 'Bandit', Faction.ENEMY, UnitClass.BRIGAND, enemyStats, 0, 0);
    grid.placeUnit(enemy, 0, 0);

    const playerStats = createStats({
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
    const player = new Unit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, playerStats, 9, 9);
    grid.placeUnit(player, 9, 9);

    const commander = new Commander(grid, WEAPON_DB);
    const actions = commander.planEnemyTurn([enemy], [player]);

    expect(actions).toHaveLength(0);
  });

  it('enemy moves toward player if not in attack range', () => {
    const grid = new Grid(10, 10);

    const enemyStats = createStats({
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
    const enemy = new Unit('e1', 'Bandit', Faction.ENEMY, UnitClass.BRIGAND, enemyStats, 5, 5);
    grid.placeUnit(enemy, 5, 5);

    const playerStats = createStats({
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
    const player = new Unit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, playerStats, 5, 9);
    grid.placeUnit(player, 5, 9);

    const commander = new Commander(grid, WEAPON_DB);
    const actions = commander.planEnemyTurn([enemy], [player]);

    expect(actions.length).toBeGreaterThan(0);
    const moveAction = actions.find((a) => a.type === ActionType.MOVE);
    expect(moveAction).toBeDefined();
    expect(moveAction!.y).toBeGreaterThan(5);
    const attackAction = actions.find((a) => a.type === ActionType.ATTACK);
    expect(attackAction).toBeDefined();
  });

  it('MOVE action includes a cardinal path when enemy moves', () => {
    const grid = new Grid(10, 10);

    const enemyStats = createStats({
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
    const enemy = new Unit('e1', 'Bandit', Faction.ENEMY, UnitClass.BRIGAND, enemyStats, 5, 5);
    grid.placeUnit(enemy, 5, 5);

    const playerStats = createStats({
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
    const player = new Unit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, playerStats, 5, 9);
    grid.placeUnit(player, 5, 9);

    const commander = new Commander(grid, WEAPON_DB);
    const actions = commander.planEnemyTurn([enemy], [player]);

    const moveAction = actions.find((a) => a.type === ActionType.MOVE);
    expect(moveAction).toBeDefined();
    expect(moveAction!.path).toBeDefined();
    expect(moveAction!.path!.length).toBeGreaterThan(0);

    // Each step must be cardinal (Manhattan distance === 1)
    const path = moveAction!.path!;
    for (let i = 1; i < path.length; i++) {
      const prev = path[i - 1];
      const curr = path[i];
      const manhattan = Math.abs(curr.x - prev.x) + Math.abs(curr.y - prev.y);
      expect(manhattan).toBe(1);
    }

    // Path must end at destination
    expect(path[path.length - 1]).toEqual({ x: moveAction!.x, y: moveAction!.y });

    // First step must be adjacent to the enemy's starting tile
    const first = path[0];
    const startDist = Math.abs(first.x - enemy.gridX) + Math.abs(first.y - enemy.gridY);
    expect(startDist).toBe(1);
  });

  it('dead enemies are skipped', () => {
    const grid = new Grid(10, 10);

    const deadEnemyStats = createStats({
      hp: 0,
      str: 9,
      mag: 0,
      skl: 4,
      spd: 5,
      luk: 3,
      def: 5,
      res: 1,
      mov: 5,
    });
    const deadEnemy = new Unit(
      'e1',
      'Dead',
      Faction.ENEMY,
      UnitClass.BRIGAND,
      deadEnemyStats,
      5,
      5,
    );

    const playerStats = createStats({
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
    const player = new Unit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, playerStats, 6, 5);

    const commander = new Commander(grid, WEAPON_DB);
    const actions = commander.planEnemyTurn([deadEnemy], [player]);

    expect(actions).toHaveLength(0);
  });

  it('enemies with no reachable targets are skipped', () => {
    const grid = new Grid(10, 10);

    const enemyStats = createStats({
      hp: 26,
      str: 9,
      mag: 0,
      skl: 4,
      spd: 5,
      luk: 3,
      def: 5,
      res: 1,
      mov: 2,
    });
    const enemy = new Unit('e1', 'Bandit', Faction.ENEMY, UnitClass.BRIGAND, enemyStats, 0, 0);
    grid.placeUnit(enemy, 0, 0);

    const playerStats = createStats({
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
    const player = new Unit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, playerStats, 5, 5);
    grid.placeUnit(player, 5, 5);

    const commander = new Commander(grid, WEAPON_DB);
    const actions = commander.planEnemyTurn([enemy], [player]);

    expect(actions).toHaveLength(0);
  });

  it('does not emit MOVE if already in attack range', () => {
    const grid = new Grid(10, 10);

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
    const enemy = new Unit('e1', 'Bandit', Faction.ENEMY, UnitClass.BRIGAND, enemyStats, 5, 5);
    grid.placeUnit(enemy, 5, 5);

    const playerStats = createStats({
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
    const player = new Unit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, playerStats, 6, 5);
    grid.placeUnit(player, 6, 5);

    const commander = new Commander(grid, WEAPON_DB);
    const actions = commander.planEnemyTurn([enemy], [player]);

    const moveAction = actions.find((a) => a.type === ActionType.MOVE);
    expect(moveAction).toBeUndefined();
    expect(actions).toHaveLength(1);
    expect(actions[0].type).toBe(ActionType.ATTACK);
  });

  it('uses class-based weapon fallback', () => {
    const grid = new Grid(10, 10);

    const mageStats = createStats({
      hp: 18,
      str: 2,
      mag: 8,
      skl: 6,
      spd: 7,
      luk: 5,
      def: 3,
      res: 6,
      mov: 5,
    });
    const mage = new Unit('e2', 'Dark Mage', Faction.ENEMY, UnitClass.MAGE, mageStats, 1, 1);
    grid.placeUnit(mage, 1, 1);

    const playerStats = createStats({
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
    const player = new Unit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, playerStats, 2, 1);
    grid.placeUnit(player, 2, 1);

    const commander = new Commander(grid, WEAPON_DB);
    const actions = commander.planEnemyTurn([mage], [player]);

    expect(actions.length).toBeGreaterThan(0);
    expect(actions[actions.length - 1].type).toBe(ActionType.ATTACK);
  });

  it('does not plan multiple enemies to the same destination tile', () => {
    const grid = new Grid(10, 10);

    const enemyStats = createStats({
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
    // Both enemies start north of the player; optimal tile to attack is (5,6)
    const enemyA = new Unit('e1', 'Bandit A', Faction.ENEMY, UnitClass.BRIGAND, enemyStats, 5, 3);
    grid.placeUnit(enemyA, 5, 3);
    const enemyB = new Unit('e2', 'Bandit B', Faction.ENEMY, UnitClass.BRIGAND, enemyStats, 5, 4);
    grid.placeUnit(enemyB, 5, 4);

    const playerStats = createStats({
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
    const player = new Unit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, playerStats, 5, 7);
    grid.placeUnit(player, 5, 7);

    const commander = new Commander(grid, WEAPON_DB);
    const actions = commander.planEnemyTurn([enemyA, enemyB], [player]);

    const moveActions = actions.filter((a) => a.type === ActionType.MOVE);
    const destinations = new Set(moveActions.map((a) => `${String(a.x)},${String(a.y)}`));

    // Each MOVE action must have a unique destination
    expect(destinations.size).toBe(moveActions.length);
  });

  it('getWeapon uses equipped weapon when equippedWeaponIndex is set', () => {
    const grid = new Grid(10, 10);
    const mageStats = createStats({ hp: 18, str: 2, mag: 8, skl: 6, spd: 7, luk: 5, def: 3, res: 6, mov: 5 });
    const mage = new Unit('e1', 'Dark Mage', Faction.ENEMY, UnitClass.MAGE, mageStats, 1, 1);
    mage.inventory.add(createWeaponItem('Iron Sword', 'sword', 5, 90, 0, 1, 1, false));
    mage.equippedWeaponIndex = 0;

    const commander = new Commander(grid, WEAPON_DB);
    const weapon = (commander as any).getWeapon(mage);
    expect(weapon).toBe(WEAPON_DB['Iron Sword']);
  });

  it('getWeapon uses first inventory weapon when no equipped weapon', () => {
    const grid = new Grid(10, 10);
    const mageStats = createStats({ hp: 18, str: 2, mag: 8, skl: 6, spd: 7, luk: 5, def: 3, res: 6, mov: 5 });
    const mage = new Unit('e1', 'Dark Mage', Faction.ENEMY, UnitClass.MAGE, mageStats, 1, 1);
    mage.inventory.add(createWeaponItem('Iron Sword', 'sword', 5, 90, 0, 1, 1, false));

    const commander = new Commander(grid, WEAPON_DB);
    const weapon = (commander as any).getWeapon(mage);
    expect(weapon).toBe(WEAPON_DB['Iron Sword']);
  });

  it('getWeapon falls back to class default when inventory has no weapons', () => {
    const grid = new Grid(10, 10);
    const mageStats = createStats({ hp: 18, str: 2, mag: 8, skl: 6, spd: 7, luk: 5, def: 3, res: 6, mov: 5 });
    const mage = new Unit('e1', 'Dark Mage', Faction.ENEMY, UnitClass.MAGE, mageStats, 1, 1);

    const commander = new Commander(grid, WEAPON_DB);
    const weapon = (commander as any).getWeapon(mage);
    expect(weapon).toBe(WEAPON_DB.Fire);
  });
});

describe('Commander with AI config', () => {
  it('PURSUE enemy moves toward nearest player even when out of attack range', () => {
    const grid = new Grid(10, 10);
    const enemyStats = createStats({ hp: 26, str: 9, mag: 0, skl: 4, spd: 5, luk: 3, def: 5, res: 1, mov: 2 });
    const enemy = new Unit('e1', 'Bandit', Faction.ENEMY, UnitClass.BRIGAND, enemyStats, 0, 0);
    grid.placeUnit(enemy, 0, 0);

    const playerStats = createStats({ hp: 22, str: 8, mag: 2, skl: 7, spd: 8, luk: 6, def: 6, res: 2, mov: 5 });
    const player = new Unit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, playerStats, 9, 9);
    grid.placeUnit(player, 9, 9);

    const commander = new Commander(grid, WEAPON_DB);
    const configs = new Map([[enemy, { personality: AiPersonality.BALANCED, behavior: AiBehavior.PURSUE }]]);
    const actions = commander.planEnemyTurn([enemy], [player], configs);

    const moveAction = actions.find((a) => a.type === ActionType.MOVE);
    expect(moveAction).toBeDefined();
    // Should move south-east toward player
    expect(moveAction!.x + moveAction!.y).toBeGreaterThan(0);
  });

  it('ATTACK_IN_RANGE enemy does not move when no target is reachable', () => {
    const grid = new Grid(10, 10);
    const enemyStats = createStats({ hp: 26, str: 9, mag: 0, skl: 4, spd: 5, luk: 3, def: 5, res: 1, mov: 2 });
    const enemy = new Unit('e1', 'Bandit', Faction.ENEMY, UnitClass.BRIGAND, enemyStats, 0, 0);
    grid.placeUnit(enemy, 0, 0);

    const playerStats = createStats({ hp: 22, str: 8, mag: 2, skl: 7, spd: 8, luk: 6, def: 6, res: 2, mov: 5 });
    const player = new Unit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, playerStats, 9, 9);
    grid.placeUnit(player, 9, 9);

    const commander = new Commander(grid, WEAPON_DB);
    const configs = new Map([[enemy, { personality: AiPersonality.BALANCED, behavior: AiBehavior.ATTACK_IN_RANGE }]]);
    const actions = commander.planEnemyTurn([enemy], [player], configs);

    expect(actions).toHaveLength(0);
  });

  it('GUARD enemy never moves or attacks outside guard zone', () => {
    const grid = new Grid(10, 10);
    const enemyStats = createStats({ hp: 26, str: 9, mag: 0, skl: 4, spd: 5, luk: 3, def: 5, res: 1, mov: 5 });
    const enemy = new Unit('e1', 'Sentry', Faction.ENEMY, UnitClass.SOLDIER, enemyStats, 5, 5);
    grid.placeUnit(enemy, 5, 5);

    const playerStats = createStats({ hp: 22, str: 8, mag: 2, skl: 7, spd: 8, luk: 6, def: 6, res: 2, mov: 5 });
    const player = new Unit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, playerStats, 6, 5);
    grid.placeUnit(player, 6, 5);

    const commander = new Commander(grid, WEAPON_DB);
    const configs = new Map([[enemy, { personality: AiPersonality.BALANCED, behavior: AiBehavior.GUARD }]]);
    const actions = commander.planEnemyTurn([enemy], [player], configs);

    // GUARD means attack-in-range only; since player is adjacent (range 1), it CAN attack
    // but should not move. Let's verify no move action.
    const moveAction = actions.find((a) => a.type === ActionType.MOVE);
    expect(moveAction).toBeUndefined();
  });

  it('CAUTIOUS personality prefers defensive terrain tiles', () => {
    const grid = new Grid(10, 10);
    // Place forest at (5,6) for defensive bonus
    grid.setTerrain(5, 6, TerrainType.FOREST);

    const enemyStats = createStats({ hp: 26, str: 9, mag: 0, skl: 4, spd: 5, luk: 3, def: 5, res: 1, mov: 3 });
    // Start at (5,4) so (5,6) forest is reachable: 5,4->5,5(1) + 5,5->5,6(2) = 3
    const enemy = new Unit('e1', 'Bandit', Faction.ENEMY, UnitClass.BRIGAND, enemyStats, 5, 4);
    grid.placeUnit(enemy, 5, 4);

    const playerStats = createStats({ hp: 22, str: 8, mag: 2, skl: 7, spd: 8, luk: 6, def: 6, res: 2, mov: 5 });
    const player = new Unit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, playerStats, 5, 7);
    grid.placeUnit(player, 5, 7);

    const commander = new Commander(grid, WEAPON_DB);
    const configs = new Map([[enemy, { personality: AiPersonality.CAUTIOUS, behavior: AiBehavior.PURSUE }]]);
    const actions = commander.planEnemyTurn([enemy], [player], configs);

    const moveAction = actions.find((a) => a.type === ActionType.MOVE);
    expect(moveAction).toBeDefined();
    // With CAUTIOUS, should prefer the forest tile (5,6) if it's in range and can attack
    expect(moveAction!.x).toBe(5);
    expect(moveAction!.y).toBe(6);
  });
});
