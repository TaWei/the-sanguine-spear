import { describe, it, expect, beforeEach } from 'vitest';
import { Commander } from '../Commander';
import { Unit, Faction, UnitClass } from '../../units/Unit';
import { createStats } from '../../units/Stats';
import { Grid } from '../../map/Grid';
import { WEAPON_DB } from '../../combat/Weapons';
import { FogOfWar } from '../../fog/FogOfWar';
import { AiBehavior } from '../Behavior';
import { AiPersonality } from '../Personality';

function createTestUnit(
  id: string,
  faction: Faction,
  unitClass: UnitClass,
  x: number,
  y: number,
): Unit {
  return new Unit(id, id, faction, unitClass, createStats({
    hp: 20, maxHp: 20, str: 8, mag: 2, skl: 7, spd: 8, luk: 6, def: 6, res: 2, mov: 5,
  }), x, y);
}

describe('Commander fog awareness', () => {
  let grid: Grid;
  let commander: Commander;

  beforeEach(() => {
    grid = new Grid(15, 15);
    commander = new Commander(grid, WEAPON_DB);
  });

  it('without fog targets all player units in range', () => {
    const enemy = createTestUnit('e1', Faction.ENEMY, UnitClass.BRIGAND, 5, 5);
    const visiblePlayer = createTestUnit('p1', Faction.PLAYER, UnitClass.LORD, 6, 5);
    const hiddenPlayer = createTestUnit('p2', Faction.PLAYER, UnitClass.LORD, 1, 1);

    const actions = commander.planEnemyTurn([enemy], [visiblePlayer, hiddenPlayer]);
    const attackActions = actions.filter(a => a.type === 'attack');
    expect(attackActions.length).toBe(1);
    expect(attackActions[0].targetX).toBe(6);
    expect(attackActions[0].targetY).toBe(5);
  });

  it('with fog only targets visible player units', () => {
    const fog = new FogOfWar();
    fog.setEnabled(true);
    const enemy = createTestUnit('e1', Faction.ENEMY, UnitClass.BRIGAND, 5, 5);
    const visiblePlayer = createTestUnit('p1', Faction.PLAYER, UnitClass.LORD, 6, 5);
    const hiddenPlayer = createTestUnit('p2', Faction.PLAYER, UnitClass.LORD, 1, 1);

    fog.update([enemy, visiblePlayer, hiddenPlayer], grid);

    const actions = commander.planEnemyTurn([enemy], [visiblePlayer, hiddenPlayer], undefined, fog);
    const attackActions = actions.filter(a => a.type === 'attack');
    expect(attackActions.length).toBe(1);
    expect(attackActions[0].targetX).toBe(6);
    expect(attackActions[0].targetY).toBe(5);
  });

  it('with fog does not target hidden players even if in weapon range', () => {
    const fog = new FogOfWar();
    fog.setEnabled(true);
    const enemy = createTestUnit('e1', Faction.ENEMY, UnitClass.BRIGAND, 2, 1);
    const hiddenPlayer = createTestUnit('p1', Faction.PLAYER, UnitClass.LORD, 1, 1);

    fog.update([enemy, hiddenPlayer], grid);
    // Enemy at (2,1) can see (1,1) with sight 3... place them further
    hiddenPlayer.moveTo(10, 10);
    fog.update([enemy, hiddenPlayer], grid);

    const actions = commander.planEnemyTurn([enemy], [hiddenPlayer], undefined, fog);
    const attackActions = actions.filter(a => a.type === 'attack');
    expect(attackActions.length).toBe(0);
  });

  it('with fog still pursues visible players when no attack in range', () => {
    const fog = new FogOfWar();
    fog.setEnabled(true);
    // Place enemy and player so player is visible (within sight 3) but enemy must move to attack
    const enemy = createTestUnit('e1', Faction.ENEMY, UnitClass.BRIGAND, 5, 5);
    const visiblePlayer = createTestUnit('p1', Faction.PLAYER, UnitClass.LORD, 7, 5);
    grid.placeUnit(enemy, 5, 5);
    grid.placeUnit(visiblePlayer, 7, 5);

    fog.update([enemy, visiblePlayer], grid);

    const config = new Map();
    config.set(enemy, { behavior: AiBehavior.PURSUE, personality: AiPersonality.BALANCED });
    const actions = commander.planEnemyTurn([enemy], [visiblePlayer], config, fog);
    const moveActions = actions.filter(a => a.type === 'move');
    expect(moveActions.length).toBeGreaterThan(0);
  });

  it('with fog does not pursue hidden players', () => {
    const fog = new FogOfWar();
    fog.setEnabled(true);
    const enemy = createTestUnit('e1', Faction.ENEMY, UnitClass.BRIGAND, 10, 10);
    const hiddenPlayer = createTestUnit('p1', Faction.PLAYER, UnitClass.LORD, 1, 1);

    fog.update([enemy, hiddenPlayer], grid);

    const config = new Map();
    config.set(enemy, { behavior: AiBehavior.PURSUE, personality: AiPersonality.BALANCED });
    const actions = commander.planEnemyTurn([enemy], [hiddenPlayer], config, fog);
    const moveActions = actions.filter(a => a.type === 'move');
    expect(moveActions.length).toBe(0);
  });
});
