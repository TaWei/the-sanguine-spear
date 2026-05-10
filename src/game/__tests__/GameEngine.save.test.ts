import { describe, it, expect } from 'vitest';
import { GameEngine } from '../GameEngine';
import { Faction, UnitClass } from '../units/Unit';
import { createStats } from '../units/Stats';
import { TerrainType } from '../map/Terrain';
import { SAVE_VERSION } from '../save/SaveData';
import type { LevelDefinition } from '../levels/LevelDefinition';

describe('GameEngine snapshot and restore', () => {
  const defaultStats = createStats({
    hp: 20,
    str: 8,
    mag: 2,
    skl: 7,
    spd: 8,
    luk: 6,
    def: 6,
    res: 2,
    mov: 5,
  });

  it('snapshot returns valid SaveData with correct version, levelId, units, turnNumber, currentPhase', () => {
    const engine = new GameEngine(8, 8);
    engine.addUnit('u1', 'Alice', Faction.PLAYER, UnitClass.LORD, defaultStats, 1, 1);
    engine.setTerrain(2, 2, TerrainType.FOREST);

    const save = engine.snapshot('level-test');

    expect(save.version).toBe(SAVE_VERSION);
    expect(save.levelId).toBe('level-test');
    expect(save.gridCols).toBe(8);
    expect(save.gridRows).toBe(8);
    expect(save.turnNumber).toBe(1);
    expect(save.currentPhase).toBe('player');
    expect(save.units).toHaveLength(1);
    expect(save.units[0].id).toBe('u1');
    expect(save.terrain).toContainEqual({ x: 2, y: 2, type: 'forest' });
    expect(save.timestamp).toBeTypeOf('number');
  });

  it('restore rebuilds engine from snapshot: correct grid dimensions, units at correct positions, turn state', () => {
    const engine = new GameEngine(8, 8);
    engine.addUnit('u1', 'Alice', Faction.PLAYER, UnitClass.LORD, defaultStats, 1, 1);
    engine.setTerrain(2, 2, TerrainType.FOREST);
    const save = engine.snapshot('level-test');

    const engine2 = new GameEngine(1, 1);
    engine2.restore(save);

    expect(engine2.grid.cols).toBe(8);
    expect(engine2.grid.rows).toBe(8);
    const restored = engine2.getUnit(1, 1);
    expect(restored).not.toBeNull();
    expect(restored!.id).toBe('u1');
    expect(engine2.turnManager.turnNumber).toBe(1);
    expect(engine2.turnManager.currentPhase).toBe('player');
  });

  it('restore preserves turn number and phase after multiple endTurn() calls', () => {
    const engine = new GameEngine(8, 8);
    engine.addUnit('u1', 'Alice', Faction.PLAYER, UnitClass.LORD, defaultStats, 1, 1);
    engine.endTurn(); // player -> enemy
    engine.endTurn(); // enemy -> ally
    engine.endTurn(); // ally -> player (turn 2)
    const save = engine.snapshot('level-test');

    const engine2 = new GameEngine(1, 1);
    engine2.restore(save);

    expect(engine2.turnManager.turnNumber).toBe(2);
    expect(engine2.turnManager.currentPhase).toBe('player');
  });

  it('restore preserves unit state and stats (damage taken, exhausted state)', () => {
    const engine = new GameEngine(8, 8);
    const unit = engine.addUnit('u1', 'Alice', Faction.PLAYER, UnitClass.LORD, defaultStats, 1, 1);
    unit.takeDamage(5);
    unit.hasActed = true;
    const save = engine.snapshot('level-test');

    const engine2 = new GameEngine(1, 1);
    engine2.restore(save);

    const restored = engine2.getUnit(1, 1)!;
    expect(restored.stats.hp).toBe(15);
    expect(restored.hasActed).toBe(true);
  });

  it('restore preserves trigger engine state (consumed triggers, firstCombatOccurred)', () => {
    const engine = new GameEngine(8, 8);
    const def: LevelDefinition = {
      id: 'lvl',
      name: 'Test',
      cols: 8,
      rows: 8,
      terrain: [],
      units: [],
      triggers: [
        { id: 't1', oneShot: true, cutsceneId: 'cs1', condition: { type: 'on_level_start' } },
        { id: 't2', oneShot: true, cutsceneId: 'cs2', condition: { type: 'on_first_combat' } },
      ],
    };
    engine.loadLevel(def);
    engine.evaluateTrigger({ eventType: 'on_level_start' });
    engine.markFirstCombat();
    const save = engine.snapshot('level-test');

    const engine2 = new GameEngine(1, 1);
    engine2.loadLevel(def);
    engine2.restore(save);

    expect(engine2.evaluateTrigger({ eventType: 'on_level_start' })).toBeNull();
    expect(engine2.evaluateTrigger({ eventType: 'on_first_combat' })).toBeNull();
  });

  it('snapshot includes gold amount', () => {
    const engine = new GameEngine(8, 8);
    engine.gold.add(7500);
    const save = engine.snapshot('level-test');
    expect(save.gold).toBe(7500);
  });

  it('restore restores gold amount', () => {
    const engine = new GameEngine(8, 8);
    engine.gold.add(5000);
    const save = engine.snapshot('level-test');

    const engine2 = new GameEngine(1, 1);
    engine2.restore(save);

    expect(engine2.gold.amount).toBe(5000);
  });

  it('snapshot and restore preserve visited villages', () => {
    const engine = new GameEngine(8, 8);
    engine.setTerrain(2, 2, TerrainType.VILLAGE);
    engine.addUnit('u1', 'Alice', Faction.PLAYER, UnitClass.LORD, defaultStats, 2, 2);
    engine.visitVillage(2, 2);
    const save = engine.snapshot('level-test');
    expect(save.visitedVillages).toContain('2,2');

    const engine2 = new GameEngine(1, 1);
    engine2.restore(save);
    // Village should already be marked visited; placing a unit there should not allow visiting
    const unit2 = engine2.getUnit(2, 2)!;
    expect(engine2.canVisitVillage(unit2, 2, 2)).toBe(false);
  });

  it('snapshot and restore preserve consumed talks', () => {
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
    engine.addUnit('u1', 'Alice', Faction.PLAYER, UnitClass.LORD, defaultStats, 1, 1);
    engine.addUnit('u2', 'Bob', Faction.ENEMY, UnitClass.SOLDIER, defaultStats, 2, 2);
    const recruiter = engine.getUnit(1, 1)!;
    const target = engine.getUnit(2, 2)!;
    engine.talk(recruiter, target);

    const save = engine.snapshot('level-test');
    expect(save.consumedTalks).toContain('u1-u2');

    const engine2 = new GameEngine(1, 1);
    engine2.loadLevel(def);
    engine2.addUnit('u1', 'Alice', Faction.PLAYER, UnitClass.LORD, defaultStats, 1, 1);
    engine2.addUnit('u2', 'Bob', Faction.ENEMY, UnitClass.SOLDIER, defaultStats, 2, 2);
    engine2.restore(save, def);
    const recruiter2 = engine2.getUnit(1, 1)!;
    const target2 = engine2.getUnit(2, 2)!;
    expect(engine2.canTalk(recruiter2, target2)).toBe(false);
  });

  it('snapshot and restore preserve support pairs', () => {
    const engine = new GameEngine(8, 8);
    engine.addUnit('u1', 'Alice', Faction.PLAYER, UnitClass.LORD, defaultStats, 1, 1);
    engine.addUnit('u2', 'Bob', Faction.PLAYER, UnitClass.SOLDIER, defaultStats, 1, 2);
    // Process supports 8 times to reach rank C (80 points)
    for (let i = 0; i < 8; i++) {
      engine.processAdjacentSupports();
    }
    const u1 = engine.getUnit(1, 1)!;
    const u2 = engine.getUnit(1, 2)!;
    const beforeBonus = engine.getSupportBonus(u1, u2);
    expect(beforeBonus.hit).toBe(2); // Rank C bonus

    const save = engine.snapshot('level-test');
    expect(save.supportPairs.length).toBe(1);
    expect(save.supportPairs[0].points).toBe(80);

    const engine2 = new GameEngine(1, 1);
    engine2.restore(save);
    // Units are restored from snapshot
    const u1b = engine2.getUnit(1, 1)!;
    const u2b = engine2.getUnit(1, 2)!;
    expect(engine2.getSupportBonus(u1b, u2b).hit).toBe(2);
  });

  it('snapshot and restore preserve spawned reinforcement state', () => {
    const engine = new GameEngine(8, 8);
    const def: LevelDefinition = {
      id: 'lvl',
      name: 'Test',
      cols: 8,
      rows: 8,
      terrain: [],
      units: [],
      reinforcements: [
        {
          groupId: 'g1',
          spawnTurn: 2,
          faction: 'enemy',
          units: [{ id: 'r1', name: 'Reinforcement', unitClass: 'soldier', stats: defaultStats, spawnX: 0, spawnY: 0 }],
          oneShot: true,
        },
      ],
    };
    engine.loadLevel(def);
    // Simulate spawning on turn 2 enemy phase
    engine.endTurn(); // player -> enemy
    engine.endTurn(); // enemy -> ally
    engine.endTurn(); // ally -> player (turn 2)
    engine.endTurn(); // player -> enemy (turn 2 enemy phase)
    expect(engine.getAllUnits().some(u => u.id === 'r1')).toBe(true);

    const save = engine.snapshot('level-test');
    expect(save.spawnedReinforcementIds).toContain('g1');

    const engine2 = new GameEngine(1, 1);
    engine2.loadLevel(def);
    engine2.restore(save, def);
    // Call endTurn to reach enemy phase turn 2 again — reinforcements should NOT respawn
    engine2.endTurn(); // player -> enemy
    engine2.endTurn(); // enemy -> ally
    engine2.endTurn(); // ally -> player (turn 2)
    engine2.endTurn(); // player -> enemy (turn 2 enemy phase)
    const r1Units = engine2.getAllUnits().filter(u => u.id === 'r1');
    expect(r1Units.length).toBeLessThanOrEqual(1); // no duplicate spawn
  });
});
