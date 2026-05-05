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
        { id: 't1', oneShot: true, condition: { type: 'on_level_start' } },
        { id: 't2', oneShot: true, condition: { type: 'on_first_combat' } },
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
});
