import { describe, it, expect } from 'vitest';
import { Unit, Faction, UnitClass } from '../../game/units/Unit';
import { createStats } from '../../game/units/Stats';
import { UNIT_STATE } from '../../game/state/UnitState';
import { BattleDisplayState, BattlePhase } from '../../game/ui/BattleDisplayState';
import { CombatLogEntry } from '../../game/combat/Engine';

describe('BattleScene post-combat state', () => {
  const stats = createStats({ hp: 22, str: 8, mag: 2, skl: 7, spd: 8, luk: 6, def: 6, res: 2, mov: 5 });
  const enemyStats = createStats({ hp: 26, str: 9, mag: 0, skl: 4, spd: 5, luk: 3, def: 5, res: 1, mov: 5 });

  function makeLogEntry(attacker: Unit, defender: Unit, damage: number, hit: boolean): CombatLogEntry {
    return { attacker, defender, hit, critical: false, damage, displayHit: 80, displayCrit: 3 };
  }

  it('BattleDisplayState reaches DONE after single attack (no counter)', () => {
    const attacker = new Unit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, { ...stats }, 5, 5);
    const defender = new Unit('e1', 'Bandit', Faction.ENEMY, UnitClass.BRIGAND, { ...enemyStats }, 6, 5);
    const state = new BattleDisplayState(attacker, defender, [makeLogEntry(attacker, defender, 8, true)]);

    while (state.canAdvance()) {
      state.advance();
    }
    expect(state.phase).toBe(BattlePhase.DONE);
  });

  it('BattleDisplayState reaches DONE after attack + counter', () => {
    const attacker = new Unit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, { ...stats }, 5, 5);
    const defender = new Unit('e1', 'Bandit', Faction.ENEMY, UnitClass.BRIGAND, { ...enemyStats }, 6, 5);
    const log = [
      makeLogEntry(attacker, defender, 8, true),
      makeLogEntry(defender, attacker, 6, true),
    ];
    const state = new BattleDisplayState(attacker, defender, log);

    while (state.canAdvance()) {
      state.advance();
    }
    expect(state.phase).toBe(BattlePhase.DONE);
  });

  it('unit hasActed becomes true when set from MENU state', () => {
    const unit = new Unit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, { ...stats }, 5, 5);
    unit.state.transition(UNIT_STATE.MOVING);
    unit.state.transition(UNIT_STATE.MENU);
    unit.hasActed = true;
    expect(unit.hasActed).toBe(true);
    expect(unit.state.current).toBe(UNIT_STATE.EXHAUSTED);
  });

  it('unit hasActed becomes true when set from IDLE state', () => {
    const unit = new Unit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, { ...stats }, 5, 5);
    unit.hasActed = true;
    expect(unit.hasActed).toBe(true);
    expect(unit.state.current).toBe(UNIT_STATE.EXHAUSTED);
  });

  it('unit hasActed becomes true when set from MOVING state', () => {
    const unit = new Unit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, { ...stats }, 5, 5);
    unit.state.transition(UNIT_STATE.MOVING);
    unit.hasActed = true;
    expect(unit.hasActed).toBe(true);
    expect(unit.state.current).toBe(UNIT_STATE.EXHAUSTED);
  });

  it('hasActed setter is idempotent when already EXHAUSTED', () => {
    const unit = new Unit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, { ...stats }, 5, 5);
    unit.state.transition(UNIT_STATE.MOVING);
    unit.state.transition(UNIT_STATE.MENU);
    unit.state.transition(UNIT_STATE.EXHAUSTED);
    expect(() => { unit.hasActed = true; }).not.toThrow();
    expect(unit.hasActed).toBe(true);
  });
});
