import { Commander } from './src/game/ai/Commander';
import { Unit, Faction, UnitClass } from './src/game/units/Unit';
import { createStats } from './src/game/units/Stats';
import { Grid } from './src/game/map/Grid';
import { WEAPON_DB } from './src/game/combat/Weapons';
import { FogOfWar } from './src/game/fog/FogOfWar';
import { AiBehavior } from './src/game/ai/Behavior';
import { AiPersonality } from './src/game/ai/Personality';
import { computeMoveRange } from './src/game/movement/MoveRange';

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

const grid = new Grid(15, 15);
const commander = new Commander(grid, WEAPON_DB);
const fog = new FogOfWar();
fog.setEnabled(true);
const enemy = createTestUnit('e1', Faction.ENEMY, UnitClass.BRIGAND, 10, 10);
const visiblePlayer = createTestUnit('p1', Faction.PLAYER, UnitClass.LORD, 5, 5);

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

// Find the tile in moveRange closest to player
let best: [number, number] | null = null;
let bestDist = Infinity;
for (const [key] of moveRange) {
  const [x, y] = key.split(',').map(Number);
  const d = Math.abs(x - visiblePlayer.gridX) + Math.abs(y - visiblePlayer.gridY);
  if (d < bestDist) {
    bestDist = d;
    best = [x, y];
  }
}
console.log('Best pursuit tile:', best, 'dist:', bestDist);

const actions = commander.planEnemyTurn([enemy], [visiblePlayer], config, fog);
console.log('Actions:', actions);
const moveActions = actions.filter((a: any) => a.type === 'move');
console.log('Move actions:', moveActions);
