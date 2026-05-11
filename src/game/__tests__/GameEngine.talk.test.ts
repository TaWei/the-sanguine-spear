import { describe, it, expect } from 'vitest';
import { GameEngine } from '../GameEngine';
import { Faction, UnitClass } from '../units/Unit';
import { createStats } from '../units/Stats';
import type { LevelDefinition } from '../levels/LevelDefinition';

describe('GameEngine resolveTalk', () => {
  const stats = createStats({
    hp: 20, str: 8, mag: 2, skl: 7, spd: 8, luk: 6, def: 6, res: 2, mov: 5,
  });

  it('resolveTalk switches target faction to PLAYER', () => {
    const engine = new GameEngine(8, 8);
    const def: LevelDefinition = {
      id: 'lvl',
      name: 'Test',
      cols: 8,
      rows: 8,
      terrain: [],
      units: [],
      talks: [
        { recruiterId: 'u1', recruitId: 'u2', oneShot: true },
      ],
    };
    engine.loadLevel(def);
    engine.addUnit('u1', 'Alice', Faction.PLAYER, UnitClass.LORD, stats, 1, 1);
    engine.addUnit('u2', 'Bob', Faction.ENEMY, UnitClass.SOLDIER, stats, 2, 1);
    const recruiter = engine.getUnit(1, 1)!;
    const target = engine.getUnit(2, 1)!;

    const result = engine.resolveTalk(recruiter, target);

    expect(result.success).toBe(true);
    expect(target.faction).toBe(Faction.PLAYER);
  });

  it('resolveTalk marks talk as consumed', () => {
    const engine = new GameEngine(8, 8);
    const def: LevelDefinition = {
      id: 'lvl',
      name: 'Test',
      cols: 8,
      rows: 8,
      terrain: [],
      units: [],
      talks: [
        { recruiterId: 'u1', recruitId: 'u2', oneShot: true },
      ],
    };
    engine.loadLevel(def);
    engine.addUnit('u1', 'Alice', Faction.PLAYER, UnitClass.LORD, stats, 1, 1);
    engine.addUnit('u2', 'Bob', Faction.ENEMY, UnitClass.SOLDIER, stats, 2, 1);
    const recruiter = engine.getUnit(1, 1)!;
    const target = engine.getUnit(2, 1)!;

    engine.resolveTalk(recruiter, target);
    expect(engine.canTalk(recruiter, target)).toBe(false);
  });

  it('resolveTalk fails when units are not adjacent', () => {
    const engine = new GameEngine(8, 8);
    const def: LevelDefinition = {
      id: 'lvl',
      name: 'Test',
      cols: 8,
      rows: 8,
      terrain: [],
      units: [],
      talks: [
        { recruiterId: 'u1', recruitId: 'u2', oneShot: true },
      ],
    };
    engine.loadLevel(def);
    engine.addUnit('u1', 'Alice', Faction.PLAYER, UnitClass.LORD, stats, 1, 1);
    engine.addUnit('u2', 'Bob', Faction.ENEMY, UnitClass.SOLDIER, stats, 5, 5);
    const recruiter = engine.getUnit(1, 1)!;
    const target = engine.getUnit(5, 5)!;

    const result = engine.resolveTalk(recruiter, target);

    expect(result.success).toBe(false);
    expect(target.faction).toBe(Faction.ENEMY);
  });

  it('resolveTalk fails when no talk config exists', () => {
    const engine = new GameEngine(8, 8);
    engine.addUnit('u1', 'Alice', Faction.PLAYER, UnitClass.LORD, stats, 1, 1);
    engine.addUnit('u2', 'Bob', Faction.ENEMY, UnitClass.SOLDIER, stats, 2, 1);
    const recruiter = engine.getUnit(1, 1)!;
    const target = engine.getUnit(2, 1)!;

    const result = engine.resolveTalk(recruiter, target);

    expect(result.success).toBe(false);
  });

  it('resolveTalk fires cutscene trigger for on_talk', () => {
    const engine = new GameEngine(8, 8);
    const def: LevelDefinition = {
      id: 'lvl',
      name: 'Test',
      cols: 8,
      rows: 8,
      terrain: [],
      units: [],
      talks: [
        { recruiterId: 'u1', recruitId: 'u2', oneShot: true },
      ],
      triggers: [
        {
          id: 't_talk',
          cutsceneId: 'cs_recruit',
          condition: { type: 'on_talk', recruiterId: 'u1', recruitId: 'u2' },
          oneShot: true,
        },
      ],
    };
    engine.loadLevel(def);
    engine.addUnit('u1', 'Alice', Faction.PLAYER, UnitClass.LORD, stats, 1, 1);
    engine.addUnit('u2', 'Bob', Faction.ENEMY, UnitClass.SOLDIER, stats, 2, 1);
    const recruiter = engine.getUnit(1, 1)!;
    const target = engine.getUnit(2, 1)!;

    const result = engine.resolveTalk(recruiter, target);

    expect(result.success).toBe(true);
    expect(result.cutsceneId).toBe('cs_recruit');
  });

  it('resolveTalk adds recruit items to target inventory', () => {
    const engine = new GameEngine(8, 8);
    const def: LevelDefinition = {
      id: 'lvl',
      name: 'Test',
      cols: 8,
      rows: 8,
      terrain: [],
      units: [],
      talks: [
        {
          recruiterId: 'u1',
          recruitId: 'u2',
          oneShot: true,
          recruitItems: [{ name: 'Iron Sword' }, { name: 'Vulnerary' }],
        },
      ],
    };
    engine.loadLevel(def);
    engine.addUnit('u1', 'Alice', Faction.PLAYER, UnitClass.LORD, stats, 1, 1);
    engine.addUnit('u2', 'Bob', Faction.ENEMY, UnitClass.SOLDIER, stats, 2, 1);
    const recruiter = engine.getUnit(1, 1)!;
    const target = engine.getUnit(2, 1)!;

    const result = engine.resolveTalk(recruiter, target);

    expect(result.success).toBe(true);
    expect(result.recruitItems).toEqual([{ name: 'Iron Sword' }, { name: 'Vulnerary' }]);
  });

  it('getTalkableUnits returns only adjacent talkable enemies', () => {
    const engine = new GameEngine(8, 8);
    const def: LevelDefinition = {
      id: 'lvl',
      name: 'Test',
      cols: 8,
      rows: 8,
      terrain: [],
      units: [],
      talks: [
        { recruiterId: 'u1', recruitId: 'u2', oneShot: true },
        { recruiterId: 'u1', recruitId: 'u3', oneShot: true },
      ],
    };
    engine.loadLevel(def);
    engine.addUnit('u1', 'Alice', Faction.PLAYER, UnitClass.LORD, stats, 1, 1);
    engine.addUnit('u2', 'Bob', Faction.ENEMY, UnitClass.SOLDIER, stats, 2, 1); // adjacent
    engine.addUnit('u3', 'Charlie', Faction.ENEMY, UnitClass.SOLDIER, stats, 5, 5); // not adjacent
    const recruiter = engine.getUnit(1, 1)!;

    const talkable = engine.getTalkableUnits(recruiter);

    expect(talkable).toHaveLength(1);
    expect(talkable[0].id).toBe('u2');
  });
});
