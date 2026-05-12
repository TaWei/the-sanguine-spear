import { describe, it, expect } from 'vitest';
import { Commander } from '../Commander';
import { Unit, Faction, UnitClass } from '../../units/Unit';
import { createStats } from '../../units/Stats';
import { Grid } from '../../map/Grid';
import { WEAPON_DB } from '../../combat/Weapons';
import { FogOfWar } from '../../fog/FogOfWar';
import { AiBehavior } from '../Behavior';
import { AiPersonality } from '../Personality';
import { computeMoveRange } from '../../movement/MoveRange';

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

describe('debug', () => {
  it('debug pursuit', () => {
    const grid = new Grid(15, 15);
    const commander = new Commander(grid, WEAPON_DB);
    const fog = new FogOfWar();
    fog.setEnabled(true);
    const enemy = createTestUnit('e1', Faction.ENEMY, UnitClass.BRIGAND, 5, 5);
    const visiblePlayer = createTestUnit('p1', Faction.PLAYER, UnitClass.LORD, 7, 5);
    grid.placeUnit(enemy, 5, 5);
    grid.placeUnit(visiblePlayer, 7, 5);

    fog.update([enemy, visiblePlayer], grid);

    const config = new Map();
    config.set(enemy, { behavior: AiBehavior.PURSUE, personality: AiPersonality.BALANCED });

    console.log('Enemy pos:', enemy.gridX, enemy.gridY);
    console.log('Player pos:', visiblePlayer.gridX, visiblePlayer.gridY);
    console.log('Fog visible:', fog.isUnitVisible(visiblePlayer, Faction.ENEMY));

    const moveRange = computeMoveRange(enemy, grid);
    console.log('Move range size:', moveRange.size);
    console.log('Move range has start:', moveRange.has('10,10'));
    console.log('Move range has (5,10):', moveRange.has('5,10'));
    console.log('Move range has (10,5):', moveRange.has('10,5'));

    const actions = commander.planEnemyTurn([enemy], [visiblePlayer], config, fog);
    console.log('Actions:', actions);
    const moveActions = actions.filter(a => a.type === 'move');
    console.log('Move actions:', moveActions);

    expect(moveActions.length).toBeGreaterThan(0);
  });
});
