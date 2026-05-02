import { describe, it, expect } from 'vitest';
import { TurnManager, GamePhase } from '../TurnManager';
import { Unit, Faction, UnitClass } from '../../units/Unit';
import { createStats } from '../../units/Stats';

describe('TurnManager', () => {
  const stats = createStats({ hp: 20, str: 5, mag: 5, skl: 5, spd: 5, luk: 5, def: 5, res: 5, mov: 5 });

  function makeUnit(id: string, faction: Faction): Unit {
    return new Unit(id, id, faction, UnitClass.LORD, stats, 0, 0);
  }

  it('starts in PlayerPhase', () => {
    const tm = new TurnManager();
    expect(tm.currentPhase).toBe(GamePhase.PLAYER);
  });

  it('starts at turn 1', () => {
    const tm = new TurnManager();
    expect(tm.turnNumber).toBe(1);
  });

  it('advances from PlayerPhase to EnemyPhase', () => {
    const tm = new TurnManager();
    tm.advancePhase();
    expect(tm.currentPhase).toBe(GamePhase.ENEMY);
    expect(tm.turnNumber).toBe(1); // still same turn
  });

  it('advances from EnemyPhase to AllyPhase', () => {
    const tm = new TurnManager();
    tm.advancePhase(); // player → enemy
    tm.advancePhase(); // enemy → ally
    expect(tm.currentPhase).toBe(GamePhase.ALLY);
    expect(tm.turnNumber).toBe(1);
  });

  it('advances from AllyPhase back to PlayerPhase (new turn)', () => {
    const tm = new TurnManager();
    tm.advancePhase(); // player → enemy
    tm.advancePhase(); // enemy → ally
    tm.advancePhase(); // ally → player
    expect(tm.currentPhase).toBe(GamePhase.PLAYER);
    expect(tm.turnNumber).toBe(2);
  });

  it('advancing from AllyPhase goes to PlayerPhase', () => {
    const tm = new TurnManager();
    tm.advancePhase(); // player → enemy
    tm.advancePhase(); // enemy → ally
    expect(tm.currentPhase).toBe(GamePhase.ALLY);
    expect(tm.turnNumber).toBe(1);
    tm.advancePhase(); // ally → player
    expect(tm.currentPhase).toBe(GamePhase.PLAYER);
    expect(tm.turnNumber).toBe(2);
  });

  it('resets all units when advancing from player to enemy', () => {
    const tm = new TurnManager();
    const unit = makeUnit('p1', Faction.PLAYER);
    unit.hasActed = true;
    expect(unit.hasActed).toBe(true);

    tm.advancePhase([unit]);
    expect(unit.hasActed).toBe(false);
  });

  it('resets all units when advancing from enemy to player', () => {
    const tm = new TurnManager();
    const unit = makeUnit('e1', Faction.ENEMY);
    unit.hasActed = true;
    tm.advancePhase(); // player → enemy
    tm.advancePhase([unit]); // enemy → player
    expect(unit.hasActed).toBe(false);
  });

  it('isPlayerPhase returns true only during player phase', () => {
    const tm = new TurnManager();
    expect(tm.isPlayerPhase()).toBe(true);
    tm.advancePhase();
    expect(tm.isPlayerPhase()).toBe(false);
  });

  it('isEnemyPhase returns true only during enemy phase', () => {
    const tm = new TurnManager();
    expect(tm.isEnemyPhase()).toBe(false);
    tm.advancePhase();
    expect(tm.isEnemyPhase()).toBe(true);
  });

  it('isAllyPhase returns true only during ally phase', () => {
    const tm = new TurnManager();
    expect(tm.isAllyPhase()).toBe(false);
    tm.advancePhase();
    expect(tm.isAllyPhase()).toBe(false);
    tm.advancePhase();
    expect(tm.isAllyPhase()).toBe(true);
  });
});
