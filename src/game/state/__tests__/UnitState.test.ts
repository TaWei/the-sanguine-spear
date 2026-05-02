import { describe, it, expect } from 'vitest';
import { UnitState, UNIT_STATE } from '../UnitState';

describe('UnitState', () => {
  it('starts at IDLE', () => {
    const state = new UnitState();
    expect(state.current).toBe(UNIT_STATE.IDLE);
  });

  it('transitions from IDLE to MOVING when selected', () => {
    const state = new UnitState();
    expect(state.canTransitionTo(UNIT_STATE.MOVING)).toBe(true);
    state.transition(UNIT_STATE.MOVING);
    expect(state.current).toBe(UNIT_STATE.MOVING);
  });

  it('transitions from MOVING to MENU after move completes', () => {
    const state = new UnitState();
    state.transition(UNIT_STATE.MOVING);
    state.transition(UNIT_STATE.MENU);
    expect(state.current).toBe(UNIT_STATE.MENU);
  });

  it('transitions from MENU to EXHAUSTED when action taken', () => {
    const state = new UnitState();
    state.transition(UNIT_STATE.MOVING);
    state.transition(UNIT_STATE.MENU);
    state.transition(UNIT_STATE.EXHAUSTED);
    expect(state.current).toBe(UNIT_STATE.EXHAUSTED);
  });

  it('cannot transition from EXHAUSTED to MOVING', () => {
    const state = new UnitState();
    state.transition(UNIT_STATE.MOVING);
    state.transition(UNIT_STATE.MENU);
    state.transition(UNIT_STATE.EXHAUSTED);
    expect(state.canTransitionTo(UNIT_STATE.MOVING)).toBe(false);
  });

  it('cannot transition from IDLE directly to EXHAUSTED', () => {
    const state = new UnitState();
    expect(state.canTransitionTo(UNIT_STATE.EXHAUSTED)).toBe(false);
  });

  it('cannot transition from IDLE to MENU (must move first)', () => {
    const state = new UnitState();
    expect(state.canTransitionTo(UNIT_STATE.MENU)).toBe(false);
  });

  it('reset returns to IDLE', () => {
    const state = new UnitState();
    state.transition(UNIT_STATE.MOVING);
    state.transition(UNIT_STATE.MENU);
    state.transition(UNIT_STATE.EXHAUSTED);
    state.reset();
    expect(state.current).toBe(UNIT_STATE.IDLE);
  });

  it('isExhausted returns true only in EXHAUSTED state', () => {
    const state = new UnitState();
    expect(state.isExhausted()).toBe(false);
    state.transition(UNIT_STATE.MOVING);
    state.transition(UNIT_STATE.MENU);
    state.transition(UNIT_STATE.EXHAUSTED);
    expect(state.isExhausted()).toBe(true);
  });

  it('invalid transition throws an error', () => {
    const state = new UnitState();
    expect(() => state.transition(UNIT_STATE.EXHAUSTED)).toThrow();
  });
});
