import { describe, it, expect, beforeEach } from 'vitest';
import { TalkEngine, type TalkConfig } from '../TalkEngine';
import { Unit, Faction, UnitClass } from '../../units/Unit';
import { createStats } from '../../units/Stats';

function createUnit(
  id: string,
  name: string,
  faction: Faction,
  unitClass: string,
): Unit {
  return new Unit(id, name, faction, unitClass, createStats({
    hp: 20, maxHp: 20, str: 8, mag: 2, skl: 7, spd: 8, luk: 6, def: 6, res: 2, mov: 5,
  }), 0, 0);
}

describe('TalkEngine', () => {
  let engine: TalkEngine;
  let configs: TalkConfig[];

  beforeEach(() => {
    engine = new TalkEngine();
    configs = [
      { recruiterId: 'p1', recruitId: 'e1', oneShot: true },
    ];
  });

  it('allows talk when player unit matches recruiter and target matches recruit', () => {
    const player = createUnit('p1', 'Rowan', Faction.PLAYER, 'lord');
    const enemy = createUnit('e1', 'Bandit', Faction.ENEMY, 'brigand');

    expect(engine.canTalk(player, enemy, configs)).toBe(true);
  });

  it('prevents talk when units have no talk config', () => {
    const player = createUnit('p1', 'Rowan', Faction.PLAYER, 'lord');
    const enemy = createUnit('e2', 'Other', Faction.ENEMY, 'brigand');

    expect(engine.canTalk(player, enemy, configs)).toBe(false);
  });

  it('prevents talk when enemy has no talk trigger', () => {
    const player = createUnit('p2', 'Mage', Faction.PLAYER, 'mage');
    const enemy = createUnit('e1', 'Bandit', Faction.ENEMY, 'brigand');

    expect(engine.canTalk(player, enemy, configs)).toBe(false);
  });

  it('recruits enemy on talk, switching faction to PLAYER', () => {
    const player = createUnit('p1', 'Rowan', Faction.PLAYER, 'lord');
    const enemy = createUnit('e1', 'Bandit', Faction.ENEMY, 'brigand');

    const result = engine.talk(player, enemy, configs);

    expect(result.success).toBe(true);
    expect(enemy.faction).toBe(Faction.PLAYER);
  });

  it('marks talk as consumed (one-shot)', () => {
    const player = createUnit('p1', 'Rowan', Faction.PLAYER, 'lord');
    const enemy = createUnit('e1', 'Bandit', Faction.ENEMY, 'brigand');

    // First talk succeeds
    expect(engine.talk(player, enemy, configs).success).toBe(true);
    // Second talk fails
    expect(engine.canTalk(player, enemy, configs)).toBe(false);
  });

  it('prevents talk when target is already recruited', () => {
    const player = createUnit('p1', 'Rowan', Faction.PLAYER, 'lord');
    const enemy = createUnit('e1', 'Bandit', Faction.ENEMY, 'brigand');

    // Recruit
    engine.talk(player, enemy, configs);
    // Now enemy is PLAYER faction, can't be talked to again by a different config
    expect(engine.canTalk(player, enemy, configs)).toBe(false);
  });

  it('prevents talk when target is dead', () => {
    const player = createUnit('p1', 'Rowan', Faction.PLAYER, 'lord');
    const enemy = createUnit('e1', 'Bandit', Faction.ENEMY, 'brigand');
    enemy.takeDamage(999);

    expect(engine.canTalk(player, enemy, configs)).toBe(false);
  });

  it('returns recruit items from config on successful talk', () => {
    const configsWithItems: TalkConfig[] = [
      {
        recruiterId: 'p1',
        recruitId: 'e1',
        oneShot: true,
        recruitItems: [{ name: 'Iron Sword' }, { name: 'Vulnerary' }],
      },
    ];

    const player = createUnit('p1', 'Rowan', Faction.PLAYER, 'lord');
    const enemy = createUnit('e1', 'Bandit', Faction.ENEMY, 'brigand');

    const result = engine.talk(player, enemy, configsWithItems);
    expect(result.success).toBe(true);
    expect(result.recruitItems).toEqual([{ name: 'Iron Sword' }, { name: 'Vulnerary' }]);
  });
});
