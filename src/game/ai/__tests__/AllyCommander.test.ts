import { describe, it, expect, beforeEach } from 'vitest';
import { AllyCommander } from '../AllyCommander';
import { Unit, Faction } from '../../units/Unit';
import { createStats } from '../../units/Stats';
import { Grid } from '../../map/Grid';
import { WEAPON_DB } from '../../combat/Weapons';
import { ActionType } from '../../state/ActionQueue';
function createUnit(
  id: string,
  name: string,
  faction: Faction,
  unitClass: string,
  x: number,
  y: number,
  hp?: number,
  maxHp?: number,
): Unit {
  const max = maxHp ?? 20;
  return new Unit(id, name, faction, unitClass, createStats({
    hp: hp ?? max, maxHp: max, str: 8, mag: 2, skl: 7, spd: 8, luk: 6, def: 6, res: 2, mov: 5,
  }), x, y);
}

describe('AllyCommander', () => {
  let grid: Grid;
  let commander: AllyCommander;

  beforeEach(() => {
    grid = new Grid(10, 10);
    commander = new AllyCommander(grid, WEAPON_DB);
  });

  it('plans movement for all ally units', () => {
    const ally1 = createUnit('a1', 'Ally1', Faction.ALLY, 'lord', 1, 1);
    const ally2 = createUnit('a2', 'Ally2', Faction.ALLY, 'soldier', 2, 1);
    grid.placeUnit(ally1, 1, 1);
    grid.placeUnit(ally2, 2, 1);
    const enemies = [createUnit('e1', 'Enemy', Faction.ENEMY, 'brigand', 8, 8)];
    grid.placeUnit(enemies[0], 8, 8);

    const actions = commander.planAllyTurn([ally1, ally2], enemies, []);

    // Should have move actions for at least one ally
    const moveActions = actions.filter(a => a.type === ActionType.MOVE);
    expect(moveActions.length).toBeGreaterThan(0);
  });

  it('allies attack enemies in range', () => {
    const ally = createUnit('a1', 'Ally', Faction.ALLY, 'lord', 5, 5);
    const enemy = createUnit('e1', 'Enemy', Faction.ENEMY, 'brigand', 6, 5);
    grid.placeUnit(ally, 5, 5);
    grid.placeUnit(enemy, 6, 5);

    const actions = commander.planAllyTurn([ally], [enemy], []);

    const attackActions = actions.filter(a => a.type === ActionType.ATTACK);
    expect(attackActions.length).toBeGreaterThan(0);
    expect(attackActions[0].actor).toBe(ally);
  });

  it('allies avoid attacking player units', () => {
    const ally = createUnit('a1', 'Ally', Faction.ALLY, 'lord', 5, 5);
    const player = createUnit('p1', 'Player', Faction.PLAYER, 'lord', 6, 5);
    const enemy = createUnit('e1', 'Enemy', Faction.ENEMY, 'brigand', 7, 5);
    grid.placeUnit(ally, 5, 5);
    grid.placeUnit(player, 6, 5);
    grid.placeUnit(enemy, 7, 5);

    const actions = commander.planAllyTurn([ally], [enemy], [player]);

    // Should never attack a player
    const attackActions = actions.filter(a => a.type === ActionType.ATTACK);
    for (const action of attackActions) {
      const target = grid.getUnit(action.targetX!, action.targetY!);
      expect(target?.faction).not.toBe(Faction.PLAYER);
    }
  });

  it('allies move toward enemies if none in range', () => {
    const ally = createUnit('a1', 'Ally', Faction.ALLY, 'lord', 1, 1);
    const enemy = createUnit('e1', 'Enemy', Faction.ENEMY, 'brigand', 8, 8);
    grid.placeUnit(ally, 1, 1);
    grid.placeUnit(enemy, 8, 8);

    const actions = commander.planAllyTurn([ally], [enemy], []);

    // Should have a move action toward the enemy
    const moveActions = actions.filter(a => a.type === ActionType.MOVE);
    expect(moveActions.length).toBeGreaterThan(0);
    // The move should be closer to the enemy (either x > 1 or y > 1, or both)
    const dest = moveActions[0];
    expect(dest.x! + dest.y!).toBeGreaterThan(2);
  });
});
