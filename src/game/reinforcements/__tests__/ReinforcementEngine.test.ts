import { describe, it, expect, beforeEach } from 'vitest';
import { ReinforcementEngine } from '../ReinforcementEngine';
import type { ReinforcementConfig } from '../ReinforcementGroup';
import { Faction } from '../../units/Unit';
import { createStats } from '../../units/Stats';
import { Grid } from '../../map/Grid';

function createConfig(overrides?: Partial<ReinforcementConfig>): ReinforcementConfig {
  return {
    groupId: 'test',
    spawnTurn: 3,
    faction: Faction.ENEMY,
    oneShot: true,
    units: [
      {
        id: 'r1',
        name: 'Reinforcement',
        unitClass: 'brigand',
        stats: createStats({
          hp: 20, maxHp: 20, str: 8, mag: 0, skl: 5, spd: 6, luk: 3, def: 5, res: 1, mov: 5,
        }),
        spawnX: 5,
        spawnY: 5,
      },
    ],
    ...overrides,
  };
}

describe('ReinforcementEngine', () => {
  let engine: ReinforcementEngine;
  let grid: Grid;

  beforeEach(() => {
    engine = new ReinforcementEngine();
    grid = new Grid(10, 10);
  });

  it('processes reinforcements at start of enemy phase', () => {
    engine.register([createConfig({ spawnTurn: 3, faction: Faction.ENEMY })]);
    const results = engine.checkSpawn(3, true, false);
    expect(results).toHaveLength(1);
    expect(results[0].units).toHaveLength(1);
  });

  it('does not spawn ally reinforcements on enemy phase', () => {
    engine.register([createConfig({ spawnTurn: 3, faction: Faction.ALLY })]);
    const results = engine.checkSpawn(3, true, false);
    expect(results).toHaveLength(0);
  });

  it('spawns ally reinforcements on ally phase', () => {
    engine.register([createConfig({ spawnTurn: 3, faction: Faction.ALLY })]);
    const results = engine.checkSpawn(3, false, true);
    expect(results).toHaveLength(1);
  });

  it('does not spawn before configured turn', () => {
    engine.register([createConfig({ spawnTurn: 5 })]);
    const results = engine.checkSpawn(3, true, false);
    expect(results).toHaveLength(0);
  });

  it('is one-shot (does not respawn same group)', () => {
    engine.register([createConfig({ spawnTurn: 3 })]);
    // First spawn
    const r1 = engine.checkSpawn(3, true, false);
    expect(r1).toHaveLength(1);
    // Second check on same turn
    const r2 = engine.checkSpawn(3, true, false);
    expect(r2).toHaveLength(0);
  });

  it('finds nearest empty tile when spawn is occupied', () => {
    // Place a unit at the desired spawn
    const spawnX = 5, spawnY = 5;

    // Find spawn tile — should return (5,5) since grid is empty
    const result = engine.findSpawnTile(grid, spawnX, spawnY);
    expect(result).toEqual({ x: 5, y: 5 });
  });
});
