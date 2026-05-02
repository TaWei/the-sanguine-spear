import { describe, it, expect } from 'vitest';
import { Unit, Faction, UnitClass } from '../Unit';
import { createStats } from '../Stats';
import { UNIT_STATE } from '../../state/UnitState';

describe('Unit', () => {
  const stats = createStats({
    hp: 22, str: 8, mag: 2, skl: 7, spd: 8,
    luk: 6, def: 6, res: 2, mov: 5,
  });

  it('has an id, name, faction, class, stats, and position', () => {
    const unit = new Unit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, stats, 2, 5);
    expect(unit.id).toBe('p1');
    expect(unit.name).toBe('Rowan');
    expect(unit.faction).toBe('player');
    expect(unit.unitClass).toBe('lord');
    expect(unit.gridX).toBe(2);
    expect(unit.gridY).toBe(5);
  });

  it('starts not acted', () => {
    const unit = new Unit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, stats, 2, 5);
    expect(unit.hasActed).toBe(false);
  });

  it('can be marked as acted', () => {
    const unit = new Unit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, stats, 2, 5);
    unit.hasActed = true;
    expect(unit.hasActed).toBe(true);
  });

  it('can be reset (un-acted)', () => {
    const unit = new Unit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, stats, 2, 5);
    unit.hasActed = true;
    unit.hasActed = false;
    expect(unit.hasActed).toBe(false);
  });

  it('can be moved to a new grid position', () => {
    const unit = new Unit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, stats, 2, 5);
    unit.moveTo(4, 7);
    expect(unit.gridX).toBe(4);
    expect(unit.gridY).toBe(7);
  });

  it('exposes stats immutably via getter', () => {
    const unit = new Unit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, stats, 2, 5);
    expect(unit.stats.hp).toBe(22);
    expect(unit.stats.mov).toBe(5);
  });

  it('isAlive returns true when hp > 0', () => {
    const unit = new Unit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, stats, 2, 5);
    expect(unit.isAlive).toBe(true);
  });

  it('isAlive returns false when hp is 0', () => {
    const deadStats = createStats({ hp: 0, str: 5, mag: 5, skl: 5, spd: 5, luk: 5, def: 5, res: 5, mov: 5 });
    const unit = new Unit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, deadStats, 2, 5);
    expect(unit.isAlive).toBe(false);
  });

  it('isPlayer returns true for player faction', () => {
    const unit = new Unit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, stats, 2, 5);
    expect(unit.isPlayer).toBe(true);
  });

  it('isEnemy returns true for enemy faction', () => {
    const enemyStats = createStats({ hp: 20, str: 7, mag: 0, skl: 6, spd: 5, luk: 2, def: 7, res: 1, mov: 5 });
    const unit = new Unit('e1', 'Bandit', Faction.ENEMY, UnitClass.BRIGAND, enemyStats, 12, 4);
    expect(unit.isEnemy).toBe(true);
    expect(unit.isPlayer).toBe(false);
  });

  it('resetState clears hasActed', () => {
    const unit = new Unit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, stats, 2, 5);
    unit.hasActed = true;
    unit.resetState();
    expect(unit.hasActed).toBe(false);
  });

  it('starts with IDLE unit state', () => {
    const unit = new Unit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, stats, 2, 5);
    expect(unit.state.current).toBe(UNIT_STATE.IDLE);
  });

  it('hasActed returns true when unit state is EXHAUSTED', () => {
    const unit = new Unit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, stats, 2, 5);
    unit.state.transition(UNIT_STATE.MOVING);
    unit.state.transition(UNIT_STATE.MENU);
    unit.state.transition(UNIT_STATE.EXHAUSTED);
    expect(unit.hasActed).toBe(true);
  });

  it('resetState clears acted status and state', () => {
    const unit = new Unit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, stats, 2, 5);
    unit.state.transition(UNIT_STATE.MOVING);
    unit.state.transition(UNIT_STATE.MENU);
    unit.state.transition(UNIT_STATE.EXHAUSTED);
    unit.resetState();
    expect(unit.hasActed).toBe(false);
    expect(unit.state.current).toBe(UNIT_STATE.IDLE);
  });
});
