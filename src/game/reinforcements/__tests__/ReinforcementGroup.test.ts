import { describe, it, expect } from 'vitest';
import { ReinforcementGroup, type ReinforcementConfig } from '../ReinforcementGroup';
import { Faction } from '../../units/Unit';
import { createStats } from '../../units/Stats';

function createConfig(overrides?: Partial<ReinforcementConfig>): ReinforcementConfig {
  return {
    groupId: 'test-group',
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
        spawnX: 0,
        spawnY: 5,
      },
    ],
    ...overrides,
  };
}

describe('ReinforcementGroup', () => {
  it('spawns units on the specified turn', () => {
    const group = new ReinforcementGroup(createConfig({ spawnTurn: 3 }));
    expect(group.checkSpawn(3)).toHaveLength(1);
  });

  it('does not spawn before the specified turn', () => {
    const group = new ReinforcementGroup(createConfig({ spawnTurn: 3 }));
    expect(group.checkSpawn(2)).toHaveLength(0);
  });

  it('is one-shot by default (does not respawn)', () => {
    const group = new ReinforcementGroup(createConfig({ spawnTurn: 3, oneShot: true }));
    expect(group.checkSpawn(3)).toHaveLength(1);
    group.markSpawned();
    expect(group.checkSpawn(3)).toHaveLength(0);
  });

  it('spawns units at configured positions', () => {
    const group = new ReinforcementGroup(createConfig({
      units: [
        {
          id: 'r1', name: 'Brigand1', unitClass: 'brigand',
          stats: createStats({ hp: 20, maxHp: 20, str: 8, mag: 0, skl: 5, spd: 6, luk: 3, def: 5, res: 1, mov: 5 }),
          spawnX: 0, spawnY: 5,
        },
        {
          id: 'r2', name: 'Brigand2', unitClass: 'brigand',
          stats: createStats({ hp: 20, maxHp: 20, str: 8, mag: 0, skl: 5, spd: 6, luk: 3, def: 5, res: 1, mov: 5 }),
          spawnX: 0, spawnY: 6,
        },
      ],
    }));

    const units = group.checkSpawn(3);
    expect(units).toHaveLength(2);
    expect(units[0].spawnX).toBe(0);
    expect(units[0].spawnY).toBe(5);
    expect(units[1].spawnX).toBe(0);
    expect(units[1].spawnY).toBe(6);
  });

  it('tracks spawned state', () => {
    const group = new ReinforcementGroup(createConfig());
    expect(group.hasSpawned).toBe(false);
    group.markSpawned();
    expect(group.hasSpawned).toBe(true);
  });
});
