import { describe, it, expect, beforeEach } from 'vitest';
import { GameEngine } from '../GameEngine';
import { Faction, UnitClass } from '../units/Unit';
import { createStats } from '../units/Stats';

describe('GameEngine triggers', () => {
  let engine: GameEngine;

  beforeEach(() => {
    engine = new GameEngine(8, 8);
  });

  it('loads triggers from level definition', () => {
    engine.loadLevel({
      id: 'test',
      name: 'Test',
      cols: 8,
      rows: 8,
      terrain: [],
      units: [],
      triggers: [
        { id: 't1', cutsceneId: 'cs1', condition: { type: 'on_level_start' }, oneShot: true },
      ],
    });
    const result = engine.evaluateTrigger({ eventType: 'on_level_start' });
    expect(result).not.toBeNull();
    expect(result!.cutsceneId).toBe('cs1');
  });

  it('returns null when no triggers match', () => {
    engine.loadLevel({
      id: 'test',
      name: 'Test',
      cols: 8,
      rows: 8,
      terrain: [],
      units: [],
      triggers: [{ id: 't1', cutsceneId: 'cs1', condition: { type: 'on_level_start' }, oneShot: true }],
    });
    expect(engine.evaluateTrigger({ eventType: 'on_attack' })).toBeNull();
  });

  it('consumes one-shot triggers', () => {
    engine.loadLevel({
      id: 'test',
      name: 'Test',
      cols: 8,
      rows: 8,
      terrain: [],
      units: [],
      triggers: [{ id: 't1', cutsceneId: 'cs1', condition: { type: 'on_level_start' }, oneShot: true }],
    });
    engine.evaluateTrigger({ eventType: 'on_level_start' });
    expect(engine.evaluateTrigger({ eventType: 'on_level_start' })).toBeNull();
  });

  it('markFirstCombat prevents on_first_combat from matching again', () => {
    engine.loadLevel({
      id: 'test',
      name: 'Test',
      cols: 8,
      rows: 8,
      terrain: [],
      units: [],
      triggers: [{ id: 't1', cutsceneId: 'cs1', condition: { type: 'on_first_combat' }, oneShot: true }],
    });
    expect(engine.evaluateTrigger({ eventType: 'on_first_combat' })!.cutsceneId).toBe('cs1');
    engine.markFirstCombat();
    expect(engine.evaluateTrigger({ eventType: 'on_first_combat' })).toBeNull();
  });

  it('resets triggers on new level load', () => {
    engine.loadLevel({
      id: 'test',
      name: 'Test',
      cols: 8,
      rows: 8,
      terrain: [],
      units: [],
      triggers: [{ id: 't1', cutsceneId: 'cs1', condition: { type: 'on_level_start' }, oneShot: true }],
    });
    engine.evaluateTrigger({ eventType: 'on_level_start' });
    engine.loadLevel({
      id: 'test2',
      name: 'Test2',
      cols: 8,
      rows: 8,
      terrain: [],
      units: [],
      triggers: [{ id: 't1', cutsceneId: 'cs1', condition: { type: 'on_level_start' }, oneShot: true }],
    });
    expect(engine.evaluateTrigger({ eventType: 'on_level_start' })!.cutsceneId).toBe('cs1');
  });
});
