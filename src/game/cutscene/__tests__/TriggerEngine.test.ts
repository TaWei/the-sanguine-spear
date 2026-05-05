import { describe, it, expect, beforeEach } from 'vitest';
import { CutsceneTriggerEngine } from '../TriggerEngine';
import { TriggerContext, CutsceneTrigger } from '../CutsceneTrigger';

describe('CutsceneTriggerEngine', () => {
  let engine: CutsceneTriggerEngine;

  beforeEach(() => {
    engine = new CutsceneTriggerEngine();
  });

  it('matches on_level_start', () => {
    engine.register([
      {
        id: 't1',
        cutsceneId: 'cs1',
        condition: { type: 'on_level_start' },
        oneShot: false,
      },
    ]);
    const result = engine.evaluate({ eventType: 'on_level_start' });
    expect(result).not.toBeNull();
    expect(result!.cutsceneId).toBe('cs1');
  });

  it('matches on_attack with specific attacker and defender', () => {
    engine.register([
      {
        id: 't1',
        cutsceneId: 'cs1',
        condition: { type: 'on_attack', attackerId: 'hero', defenderId: 'boss' },
        oneShot: false,
      },
    ]);
    expect(engine.evaluate({ eventType: 'on_attack', attackerId: 'hero', defenderId: 'boss' })!.cutsceneId).toBe(
      'cs1',
    );
    expect(engine.evaluate({ eventType: 'on_attack', attackerId: 'hero', defenderId: 'minion' })).toBeNull();
    expect(engine.evaluate({ eventType: 'on_attack', attackerId: 'other', defenderId: 'boss' })).toBeNull();
  });

  it('matches on_attack with wildcard ids', () => {
    engine.register([
      {
        id: 't1',
        cutsceneId: 'cs1',
        condition: { type: 'on_attack' },
        oneShot: false,
      },
    ]);
    expect(engine.evaluate({ eventType: 'on_attack', attackerId: 'any', defenderId: 'thing' })!.cutsceneId).toBe('cs1');
  });

  it('matches on_kill with specific killer and victim', () => {
    engine.register([
      {
        id: 't1',
        cutsceneId: 'cs1',
        condition: { type: 'on_kill', killerId: 'hero', victimId: 'boss' },
        oneShot: false,
      },
    ]);
    expect(engine.evaluate({ eventType: 'on_kill', killerId: 'hero', victimId: 'boss' })!.cutsceneId).toBe('cs1');
    expect(engine.evaluate({ eventType: 'on_kill', killerId: 'hero', victimId: 'minion' })).toBeNull();
  });

  it('matches on_death with specific unitId', () => {
    engine.register([
      {
        id: 't1',
        cutsceneId: 'cs1',
        condition: { type: 'on_death', unitId: 'hero' },
        oneShot: false,
      },
    ]);
    expect(engine.evaluate({ eventType: 'on_death', unitId: 'hero' })!.cutsceneId).toBe('cs1');
    expect(engine.evaluate({ eventType: 'on_death', unitId: 'boss' })).toBeNull();
  });

  it('matches on_turn_start with faction and turnNumber', () => {
    engine.register([
      {
        id: 't1',
        cutsceneId: 'cs1',
        condition: { type: 'on_turn_start', faction: 'player', turnNumber: 1 },
        oneShot: false,
      },
    ]);
    expect(
      engine.evaluate({ eventType: 'on_turn_start', faction: 'player', turnNumber: 1 })!.cutsceneId,
    ).toBe('cs1');
    expect(engine.evaluate({ eventType: 'on_turn_start', faction: 'enemy', turnNumber: 1 })).toBeNull();
    expect(engine.evaluate({ eventType: 'on_turn_start', faction: 'player', turnNumber: 2 })).toBeNull();
  });

  it('matches on_turn_end with faction', () => {
    engine.register([
      {
        id: 't1',
        cutsceneId: 'cs1',
        condition: { type: 'on_turn_end', faction: 'player' },
        oneShot: false,
      },
    ]);
    expect(engine.evaluate({ eventType: 'on_turn_end', faction: 'player' })!.cutsceneId).toBe('cs1');
    expect(engine.evaluate({ eventType: 'on_turn_end', faction: 'enemy' })).toBeNull();
  });

  it('matches on_first_combat only before markFirstCombat', () => {
    engine.register([
      {
        id: 't1',
        cutsceneId: 'cs1',
        condition: { type: 'on_first_combat' },
        oneShot: true,
      },
    ]);
    expect(engine.evaluate({ eventType: 'on_first_combat' })!.cutsceneId).toBe('cs1');
    engine.markFirstCombat();
    expect(engine.evaluate({ eventType: 'on_first_combat' })).toBeNull();
  });

  it('matches on_boss_encounter with bossId', () => {
    engine.register([
      {
        id: 't1',
        cutsceneId: 'cs1',
        condition: { type: 'on_boss_encounter', bossId: 'bandit-king' },
        oneShot: false,
      },
    ]);
    expect(engine.evaluate({ eventType: 'on_boss_encounter', bossId: 'bandit-king' })!.cutsceneId).toBe('cs1');
    expect(engine.evaluate({ eventType: 'on_boss_encounter', bossId: 'other' })).toBeNull();
  });

  it('consumes one-shot triggers after first match', () => {
    engine.register([
      {
        id: 't1',
        cutsceneId: 'cs1',
        condition: { type: 'on_level_start' },
        oneShot: true,
      },
    ]);
    expect(engine.evaluate({ eventType: 'on_level_start' })!.cutsceneId).toBe('cs1');
    expect(engine.evaluate({ eventType: 'on_level_start' })).toBeNull();
  });

  it('returns first match when multiple triggers registered', () => {
    engine.register([
      { id: 't1', cutsceneId: 'cs1', condition: { type: 'on_level_start' }, oneShot: false },
      { id: 't2', cutsceneId: 'cs2', condition: { type: 'on_level_start' }, oneShot: false },
    ]);
    expect(engine.evaluate({ eventType: 'on_level_start' })!.cutsceneId).toBe('cs1');
  });

  it('returns null when no triggers match', () => {
    engine.register([
      { id: 't1', cutsceneId: 'cs1', condition: { type: 'on_level_start' }, oneShot: false },
    ]);
    expect(engine.evaluate({ eventType: 'on_attack' })).toBeNull();
  });

  it('reset clears all state', () => {
    engine.register([
      { id: 't1', cutsceneId: 'cs1', condition: { type: 'on_first_combat' }, oneShot: true },
    ]);
    engine.evaluate({ eventType: 'on_first_combat' });
    engine.markFirstCombat();
    engine.reset();
    expect(engine.evaluate({ eventType: 'on_first_combat' })).toBeNull();
  });
});
