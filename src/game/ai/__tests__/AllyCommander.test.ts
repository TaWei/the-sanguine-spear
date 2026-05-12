import { describe, it, expect, beforeEach } from 'vitest';
import { AllyCommander } from '../AllyCommander';
import { Unit, Faction } from '../../units/Unit';
import { createStats } from '../../units/Stats';
import { Grid } from '../../map/Grid';
import { WEAPON_DB } from '../../combat/Weapons';
import { STAFF_DB } from '../../staves/Staves';
import { ActionType } from '../../state/ActionQueue';
import { TerrainType } from '../../map/Terrain';
import { createStaffItem, createWeaponItem } from '../../items/ItemTypes';

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
    commander = new AllyCommander(grid, WEAPON_DB, STAFF_DB);
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

  it('allies heal injured player units with staves', () => {
    const ally = createUnit('a1', 'Ally', Faction.ALLY, 'cleric', 1, 1);
    ally.inventory.add(createStaffItem('Heal', 10, 1, 1));
    const player = createUnit('p1', 'Player', Faction.PLAYER, 'lord', 2, 1, 5, 20);
    grid.placeUnit(ally, 1, 1);
    grid.placeUnit(player, 2, 1);

    const actions = commander.planAllyTurn([ally], [], [player]);

    const staffActions = actions.filter(a => a.type === ActionType.STAFF);
    expect(staffActions.length).toBeGreaterThan(0);
    expect(staffActions[0].actor).toBe(ally);
    expect(staffActions[0].targetX).toBe(2);
    expect(staffActions[0].targetY).toBe(1);
  });

  it('allies heal injured ally units with staves', () => {
    const healer = createUnit('a1', 'Healer', Faction.ALLY, 'cleric', 1, 1);
    healer.inventory.add(createStaffItem('Heal', 10, 1, 1));
    const injuredAlly = createUnit('a2', 'Injured', Faction.ALLY, 'soldier', 2, 1, 5, 20);
    grid.placeUnit(healer, 1, 1);
    grid.placeUnit(injuredAlly, 2, 1);

    const actions = commander.planAllyTurn([healer, injuredAlly], [], []);

    const staffActions = actions.filter(a => a.type === ActionType.STAFF);
    expect(staffActions.length).toBeGreaterThan(0);
    expect(staffActions[0].actor).toBe(healer);
    expect(staffActions[0].targetX).toBe(2);
    expect(staffActions[0].targetY).toBe(1);
  });

  it('allies move to heal when not adjacent', () => {
    const ally = createUnit('a1', 'Ally', Faction.ALLY, 'cleric', 1, 1);
    ally.inventory.add(createStaffItem('Heal', 10, 1, 1));
    const player = createUnit('p1', 'Player', Faction.PLAYER, 'lord', 4, 1, 5, 20);
    grid.placeUnit(ally, 1, 1);
    grid.placeUnit(player, 4, 1);

    const actions = commander.planAllyTurn([ally], [], [player]);

    const moveActions = actions.filter(a => a.type === ActionType.MOVE);
    const staffActions = actions.filter(a => a.type === ActionType.STAFF);
    expect(moveActions.length).toBeGreaterThan(0);
    expect(staffActions.length).toBeGreaterThan(0);
    // Move should put ally adjacent to player (distance 1)
    const move = moveActions[0];
    const dist = Math.abs(move.x! - player.gridX) + Math.abs(move.y! - player.gridY);
    expect(dist).toBe(1);
  });

  it('allies do not heal fully healed units', () => {
    const ally = createUnit('a1', 'Ally', Faction.ALLY, 'cleric', 1, 1);
    ally.inventory.add(createStaffItem('Heal', 10, 1, 1));
    const player = createUnit('p1', 'Player', Faction.PLAYER, 'lord', 2, 1, 20, 20);
    grid.placeUnit(ally, 1, 1);
    grid.placeUnit(player, 2, 1);

    const actions = commander.planAllyTurn([ally], [], [player]);

    const staffActions = actions.filter(a => a.type === ActionType.STAFF);
    expect(staffActions.length).toBe(0);
  });

  it('allies prefer fort tiles when injured and no enemies nearby', () => {
    const ally = createUnit('a1', 'Ally', Faction.ALLY, 'lord', 1, 1, 5, 20);
    grid.setTerrain(3, 1, TerrainType.FORT);
    grid.placeUnit(ally, 1, 1);

    const actions = commander.planAllyTurn([ally], [], []);

    const moveActions = actions.filter(a => a.type === ActionType.MOVE);
    expect(moveActions.length).toBeGreaterThan(0);
    expect(moveActions[0].x).toBe(3);
    expect(moveActions[0].y).toBe(1);
  });

  it('allies avoid moving onto tiles in player move range', () => {
    const ally = createUnit('a1', 'Ally', Faction.ALLY, 'lord', 1, 1);
    const player = createUnit('p1', 'Player', Faction.PLAYER, 'lord', 5, 5);
    const enemy = createUnit('e1', 'Enemy', Faction.ENEMY, 'brigand', 8, 8);
    grid.placeUnit(ally, 1, 1);
    grid.placeUnit(player, 5, 5);
    grid.placeUnit(enemy, 8, 8);

    const actions = commander.planAllyTurn([ally], [enemy], [player]);

    const moveActions = actions.filter(a => a.type === ActionType.MOVE);
    for (const move of moveActions) {
      const distToPlayer = Math.abs(move.x! - player.gridX) + Math.abs(move.y! - player.gridY);
      // Should not end up adjacent to player if it can be avoided
      expect(distToPlayer).toBeGreaterThanOrEqual(2);
    }
  });

  it('allies do not claim tiles occupied by players', () => {
    const ally = createUnit('a1', 'Ally', Faction.ALLY, 'lord', 4, 5);
    const player = createUnit('p1', 'Player', Faction.PLAYER, 'lord', 5, 5);
    const enemy = createUnit('e1', 'Enemy', Faction.ENEMY, 'brigand', 6, 5);
    grid.placeUnit(ally, 4, 5);
    grid.placeUnit(player, 5, 5);
    grid.placeUnit(enemy, 6, 5);

    const actions = commander.planAllyTurn([ally], [enemy], [player]);

    const moveActions = actions.filter(a => a.type === ActionType.MOVE);
    for (const move of moveActions) {
      expect(move.x).not.toBe(player.gridX);
      expect(move.y).not.toBe(player.gridY);
    }
  });

  it('getWeapon uses equipped weapon when equippedWeaponIndex is set', () => {
    const ally = createUnit('a1', 'Ally', Faction.ALLY, 'mage', 1, 1);
    ally.inventory.add(createWeaponItem('Iron Sword', 'sword', 5, 90, 0, 1, 1, false));
    ally.equippedWeaponIndex = 0;

    const weapon = (commander as any).getWeapon(ally);
    expect(weapon).toBe(WEAPON_DB['Iron Sword']);
  });

  it('getWeapon uses first inventory weapon when no equipped weapon', () => {
    const ally = createUnit('a1', 'Ally', Faction.ALLY, 'mage', 1, 1);
    ally.inventory.add(createWeaponItem('Iron Sword', 'sword', 5, 90, 0, 1, 1, false));

    const weapon = (commander as any).getWeapon(ally);
    expect(weapon).toBe(WEAPON_DB['Iron Sword']);
  });

  it('getWeapon falls back to class default when inventory has no weapons', () => {
    const ally = createUnit('a1', 'Ally', Faction.ALLY, 'mage', 1, 1);

    const weapon = (commander as any).getWeapon(ally);
    expect(weapon).toBe(WEAPON_DB.Fire);
  });
});
