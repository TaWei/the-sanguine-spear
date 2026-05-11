import { describe, it, expect } from 'vitest';
import { BattleDisplayState, BattlePhase } from '../BattleDisplayState';
import { Unit, Faction, UnitClass } from '../../units/Unit';
import { createStats } from '../../units/Stats';
import { CombatLogEntry } from '../../combat/Engine';

describe('BattleDisplayState', () => {
  const stats = createStats({
    hp: 22,
    str: 8,
    mag: 2,
    skl: 7,
    spd: 8,
    luk: 6,
    def: 6,
    res: 2,
    mov: 5,
  });
  const enemyStats = createStats({
    hp: 26,
    str: 9,
    mag: 0,
    skl: 4,
    spd: 5,
    luk: 3,
    def: 5,
    res: 1,
    mov: 5,
  });

  function makeLogEntry(
    attacker: Unit,
    defender: Unit,
    damage: number,
    hit: boolean,
  ): CombatLogEntry {
    return {
      attacker,
      defender,
      hit,
      critical: false,
      damage,
      displayHit: 80,
      displayCrit: 3,
    };
  }

  it('starts at INTRO', () => {
    const attacker = new Unit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, { ...stats }, 5, 5);
    const defender = new Unit(
      'e1',
      'Bandit',
      Faction.ENEMY,
      UnitClass.BRIGAND,
      { ...enemyStats },
      6,
      5,
    );
    const state = new BattleDisplayState(attacker, defender, [
      makeLogEntry(attacker, defender, 8, true),
    ]);
    expect(state.phase).toBe(BattlePhase.INTRO);
  });

  it('captures initial HP snapshots', () => {
    const attacker = new Unit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, { ...stats }, 5, 5);
    const defender = new Unit(
      'e1',
      'Bandit',
      Faction.ENEMY,
      UnitClass.BRIGAND,
      { ...enemyStats },
      6,
      5,
    );
    const state = new BattleDisplayState(attacker, defender, [
      makeLogEntry(attacker, defender, 8, true),
    ]);
    expect(state.attackerInitialHp).toBe(22);
    expect(state.defenderInitialHp).toBe(26);
  });

  it('advances through phases for single attack', () => {
    const attacker = new Unit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, { ...stats }, 5, 5);
    const defender = new Unit(
      'e1',
      'Bandit',
      Faction.ENEMY,
      UnitClass.BRIGAND,
      { ...enemyStats },
      6,
      5,
    );
    const state = new BattleDisplayState(attacker, defender, [
      makeLogEntry(attacker, defender, 8, true),
    ]);

    expect(state.canAdvance()).toBe(true);
    state.advance();
    expect(state.phase).toBe(BattlePhase.STRIKE);

    state.advance();
    expect(state.phase).toBe(BattlePhase.RECOIL);

    state.advance();
    expect(state.phase).toBe(BattlePhase.DONE);
    expect(state.canAdvance()).toBe(false);
  });

  it('advances through phases for attack + counter', () => {
    const attacker = new Unit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, { ...stats }, 5, 5);
    const defender = new Unit(
      'e1',
      'Bandit',
      Faction.ENEMY,
      UnitClass.BRIGAND,
      { ...enemyStats },
      6,
      5,
    );
    const log = [
      makeLogEntry(attacker, defender, 8, true),
      makeLogEntry(defender, attacker, 6, true),
    ];
    const state = new BattleDisplayState(attacker, defender, log);

    state.advance(); // STRIKE (log[0])
    state.advance(); // RECOIL
    state.advance(); // STRIKE (log[1])
    state.advance(); // RECOIL
    state.advance(); // DONE
    expect(state.phase).toBe(BattlePhase.DONE);
  });

  it('advances through phases for attack + counter + follow-up', () => {
    const attacker = new Unit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, { ...stats }, 5, 5);
    const defender = new Unit(
      'e1',
      'Bandit',
      Faction.ENEMY,
      UnitClass.BRIGAND,
      { ...enemyStats },
      6,
      5,
    );
    const log = [
      makeLogEntry(attacker, defender, 8, true),
      makeLogEntry(defender, attacker, 6, true),
      makeLogEntry(attacker, defender, 8, true), // follow-up
    ];
    const state = new BattleDisplayState(attacker, defender, log);

    state.advance(); // STRIKE (log[0])
    expect(state.phase).toBe(BattlePhase.STRIKE);
    state.advance(); // RECOIL
    state.advance(); // STRIKE (log[1])
    expect(state.phase).toBe(BattlePhase.STRIKE);
    state.advance(); // RECOIL
    state.advance(); // STRIKE (log[2])
    expect(state.phase).toBe(BattlePhase.STRIKE);
    state.advance(); // RECOIL
    state.advance(); // DONE
    expect(state.phase).toBe(BattlePhase.DONE);
  });

  it('currentLogEntry maps to the correct combat log index', () => {
    const attacker = new Unit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, { ...stats }, 5, 5);
    const defender = new Unit(
      'e1',
      'Bandit',
      Faction.ENEMY,
      UnitClass.BRIGAND,
      { ...enemyStats },
      6,
      5,
    );
    const log = [
      makeLogEntry(attacker, defender, 8, true),
      makeLogEntry(defender, attacker, 6, true),
    ];
    const state = new BattleDisplayState(attacker, defender, log);

    state.advance(); // STRIKE -> log[0]
    expect(state.currentLogEntry).toBe(log[0]);

    state.advance(); // RECOIL
    state.advance(); // STRIKE -> log[1]
    expect(state.currentLogEntry).toBe(log[1]);
  });

  it('tracks current HP separately and applies damage from log entries', () => {
    const attacker = new Unit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, { ...stats }, 5, 5);
    const defender = new Unit(
      'e1',
      'Bandit',
      Faction.ENEMY,
      UnitClass.BRIGAND,
      { ...enemyStats },
      6,
      5,
    );
    const log = [makeLogEntry(attacker, defender, 8, true)];
    const state = new BattleDisplayState(attacker, defender, log, 22, 26);

    expect(state.attackerCurrentHp).toBe(22);
    expect(state.defenderCurrentHp).toBe(26);

    state.applyLogEntry(log[0]);

    expect(state.attackerCurrentHp).toBe(22);
    expect(state.defenderCurrentHp).toBe(18);
  });

  it('applies counterattack damage to attacker', () => {
    const attacker = new Unit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, { ...stats }, 5, 5);
    const defender = new Unit(
      'e1',
      'Bandit',
      Faction.ENEMY,
      UnitClass.BRIGAND,
      { ...enemyStats },
      6,
      5,
    );
    const log = [
      makeLogEntry(attacker, defender, 8, true),
      makeLogEntry(defender, attacker, 6, true),
    ];
    const state = new BattleDisplayState(attacker, defender, log, 22, 26);

    state.applyLogEntry(log[0]);
    expect(state.defenderCurrentHp).toBe(18);

    state.applyLogEntry(log[1]);
    expect(state.attackerCurrentHp).toBe(16);
  });

  it('does not apply damage on a miss', () => {
    const attacker = new Unit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, { ...stats }, 5, 5);
    const defender = new Unit(
      'e1',
      'Bandit',
      Faction.ENEMY,
      UnitClass.BRIGAND,
      { ...enemyStats },
      6,
      5,
    );
    const log = [makeLogEntry(attacker, defender, 8, false)];
    const state = new BattleDisplayState(attacker, defender, log, 22, 26);

    state.applyLogEntry(log[0]);
    expect(state.defenderCurrentHp).toBe(26);
  });

  it('does not double-apply the same log entry', () => {
    const attacker = new Unit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, { ...stats }, 5, 5);
    const defender = new Unit(
      'e1',
      'Bandit',
      Faction.ENEMY,
      UnitClass.BRIGAND,
      { ...enemyStats },
      6,
      5,
    );
    const log = [makeLogEntry(attacker, defender, 8, true)];
    const state = new BattleDisplayState(attacker, defender, log, 22, 26);

    state.applyLogEntry(log[0]);
    state.applyLogEntry(log[0]);
    expect(state.defenderCurrentHp).toBe(18);
  });

  it('clamps HP to zero on fatal damage', () => {
    const attacker = new Unit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, { ...stats }, 5, 5);
    const defender = new Unit(
      'e1',
      'Bandit',
      Faction.ENEMY,
      UnitClass.BRIGAND,
      { ...enemyStats },
      6,
      5,
    );
    const log = [makeLogEntry(attacker, defender, 30, true)];
    const state = new BattleDisplayState(attacker, defender, log, 22, 26);

    state.applyLogEntry(log[0]);
    expect(state.defenderCurrentHp).toBe(0);
  });
});
