import { describe, it, expect } from 'vitest';
import { Commander } from '../Commander';
import { Unit, Faction, UnitClass } from '../../units/Unit';
import { createStats } from '../../units/Stats';
import { Grid } from '../../map/Grid';
import { WEAPON_DB } from '../../combat/Weapons';
import { ActionType } from '../../state/ActionQueue';

describe('Commander', () => {
  it('generates actions for enemies to attack nearby players', () => {
    const grid = new Grid(10, 10);

    const enemyStats = createStats({ hp: 26, str: 9, mag: 0, skl: 4, spd: 5, luk: 3, def: 5, res: 1, mov: 5 });
    const enemy = new Unit('e1', 'Bandit', Faction.ENEMY, UnitClass.BRIGAND, enemyStats, 5, 5);
    grid.placeUnit(enemy, 5, 5);

    const playerStats = createStats({ hp: 22, str: 8, mag: 2, skl: 7, spd: 8, luk: 6, def: 6, res: 2, mov: 5 });
    const player = new Unit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, playerStats, 6, 5);
    grid.placeUnit(player, 6, 5);

    const commander = new Commander(grid, WEAPON_DB);
    const actions = commander.planEnemyTurn([enemy], [player]);

    expect(actions.length).toBeGreaterThan(0);
    const attackAction = actions.find(a => a.type === ActionType.ATTACK);
    expect(attackAction).toBeDefined();
    expect(attackAction!.targetX).toBe(6);
    expect(attackAction!.targetY).toBe(5);
  });

  it('returns empty actions when no players in range', () => {
    const grid = new Grid(10, 10);

    const enemyStats = createStats({ hp: 26, str: 9, mag: 0, skl: 4, spd: 5, luk: 3, def: 5, res: 1, mov: 1 });
    const enemy = new Unit('e1', 'Bandit', Faction.ENEMY, UnitClass.BRIGAND, enemyStats, 0, 0);
    grid.placeUnit(enemy, 0, 0);

    const playerStats = createStats({ hp: 22, str: 8, mag: 2, skl: 7, spd: 8, luk: 6, def: 6, res: 2, mov: 5 });
    const player = new Unit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, playerStats, 9, 9);
    grid.placeUnit(player, 9, 9);

    const commander = new Commander(grid, WEAPON_DB);
    const actions = commander.planEnemyTurn([enemy], [player]);

    expect(actions).toHaveLength(0);
  });

  it('enemy moves toward player if not in attack range', () => {
    const grid = new Grid(10, 10);

    const enemyStats = createStats({ hp: 26, str: 9, mag: 0, skl: 4, spd: 5, luk: 3, def: 5, res: 1, mov: 3 });
    const enemy = new Unit('e1', 'Bandit', Faction.ENEMY, UnitClass.BRIGAND, enemyStats, 5, 5);
    grid.placeUnit(enemy, 5, 5);

    const playerStats = createStats({ hp: 22, str: 8, mag: 2, skl: 7, spd: 8, luk: 6, def: 6, res: 2, mov: 5 });
    const player = new Unit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, playerStats, 5, 9);
    grid.placeUnit(player, 5, 9);

    const commander = new Commander(grid, WEAPON_DB);
    const actions = commander.planEnemyTurn([enemy], [player]);

    expect(actions.length).toBeGreaterThan(0);
    const moveAction = actions.find(a => a.type === ActionType.MOVE);
    expect(moveAction).toBeDefined();
    expect(moveAction!.y).toBeGreaterThan(5);
    const attackAction = actions.find(a => a.type === ActionType.ATTACK);
    expect(attackAction).toBeDefined();
  });

  it('dead enemies are skipped', () => {
    const grid = new Grid(10, 10);

    const deadEnemyStats = createStats({ hp: 0, str: 9, mag: 0, skl: 4, spd: 5, luk: 3, def: 5, res: 1, mov: 5 });
    const deadEnemy = new Unit('e1', 'Dead', Faction.ENEMY, UnitClass.BRIGAND, deadEnemyStats, 5, 5);

    const playerStats = createStats({ hp: 22, str: 8, mag: 2, skl: 7, spd: 8, luk: 6, def: 6, res: 2, mov: 5 });
    const player = new Unit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, playerStats, 6, 5);

    const commander = new Commander(grid, WEAPON_DB);
    const actions = commander.planEnemyTurn([deadEnemy], [player]);

    expect(actions).toHaveLength(0);
  });

  it('enemies with no reachable targets are skipped', () => {
    const grid = new Grid(10, 10);

    const enemyStats = createStats({ hp: 26, str: 9, mag: 0, skl: 4, spd: 5, luk: 3, def: 5, res: 1, mov: 2 });
    const enemy = new Unit('e1', 'Bandit', Faction.ENEMY, UnitClass.BRIGAND, enemyStats, 0, 0);
    grid.placeUnit(enemy, 0, 0);

    const playerStats = createStats({ hp: 22, str: 8, mag: 2, skl: 7, spd: 8, luk: 6, def: 6, res: 2, mov: 5 });
    const player = new Unit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, playerStats, 5, 5);
    grid.placeUnit(player, 5, 5);

    const commander = new Commander(grid, WEAPON_DB);
    const actions = commander.planEnemyTurn([enemy], [player]);

    expect(actions).toHaveLength(0);
  });

  it('does not emit MOVE if already in attack range', () => {
    const grid = new Grid(10, 10);

    const enemyStats = createStats({ hp: 26, str: 9, mag: 0, skl: 4, spd: 5, luk: 3, def: 5, res: 1, mov: 5 });
    const enemy = new Unit('e1', 'Bandit', Faction.ENEMY, UnitClass.BRIGAND, enemyStats, 5, 5);
    grid.placeUnit(enemy, 5, 5);

    const playerStats = createStats({ hp: 22, str: 8, mag: 2, skl: 7, spd: 8, luk: 6, def: 6, res: 2, mov: 5 });
    const player = new Unit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, playerStats, 6, 5);
    grid.placeUnit(player, 6, 5);

    const commander = new Commander(grid, WEAPON_DB);
    const actions = commander.planEnemyTurn([enemy], [player]);

    const moveAction = actions.find(a => a.type === ActionType.MOVE);
    expect(moveAction).toBeUndefined();
    expect(actions).toHaveLength(1);
    expect(actions[0].type).toBe(ActionType.ATTACK);
  });

  it('uses class-based weapon fallback', () => {
    const grid = new Grid(10, 10);

    const mageStats = createStats({ hp: 18, str: 2, mag: 8, skl: 6, spd: 7, luk: 5, def: 3, res: 6, mov: 5 });
    const mage = new Unit('e2', 'Dark Mage', Faction.ENEMY, UnitClass.MAGE, mageStats, 1, 1);
    grid.placeUnit(mage, 1, 1);

    const playerStats = createStats({ hp: 22, str: 8, mag: 2, skl: 7, spd: 8, luk: 6, def: 6, res: 2, mov: 5 });
    const player = new Unit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, playerStats, 2, 1);
    grid.placeUnit(player, 2, 1);

    const commander = new Commander(grid, WEAPON_DB);
    const actions = commander.planEnemyTurn([mage], [player]);

    expect(actions.length).toBeGreaterThan(0);
    expect(actions[actions.length - 1].type).toBe(ActionType.ATTACK);
  });
});
