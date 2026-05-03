import { describe, it, expect } from 'vitest';
import { Unit, Faction, UnitClass } from '../Unit';
import { createStats } from '../Stats';
import { UNIT_STATE } from '../../state/UnitState';
import { createGrowthRates } from '../../progression/GrowthRates';

describe('Unit', () => {
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
    const deadStats = createStats({
      hp: 0,
      str: 5,
      mag: 5,
      skl: 5,
      spd: 5,
      luk: 5,
      def: 5,
      res: 5,
      mov: 5,
    });
    const unit = new Unit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, deadStats, 2, 5);
    expect(unit.isAlive).toBe(false);
  });

  it('isPlayer returns true for player faction', () => {
    const unit = new Unit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, stats, 2, 5);
    expect(unit.isPlayer).toBe(true);
  });

  it('isEnemy returns true for enemy faction', () => {
    const enemyStats = createStats({
      hp: 20,
      str: 7,
      mag: 0,
      skl: 6,
      spd: 5,
      luk: 2,
      def: 7,
      res: 1,
      mov: 5,
    });
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

  it('takeDamage reduces hp', () => {
    const unit = new Unit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, stats, 2, 5);
    unit.takeDamage(10);
    expect(unit.stats.hp).toBe(12); // 22 - 10
  });

  it('takeDamage does not go below 0', () => {
    const unit = new Unit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, stats, 2, 5);
    unit.takeDamage(999);
    expect(unit.stats.hp).toBe(0);
  });

  it('isAlive returns false after lethal damage', () => {
    const unit = new Unit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, stats, 2, 5);
    expect(unit.isAlive).toBe(true);
    unit.takeDamage(22);
    expect(unit.isAlive).toBe(false);
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

  it('starts at level 1 with 0 exp by default', () => {
    const unit = new Unit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, stats, 2, 5);
    expect(unit.level).toBe(1);
    expect(unit.exp).toBe(0);
  });

  it('can be constructed with a custom level and exp', () => {
    const unit = new Unit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, stats, 2, 5, { level: 5, exp: 30 });
    expect(unit.level).toBe(5);
    expect(unit.exp).toBe(30);
  });

  it('has default zero growth rates', () => {
    const unit = new Unit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, stats, 2, 5);
    expect(unit.growthRates.hp).toBe(0);
    expect(unit.growthRates.str).toBe(0);
  });

  it('can be constructed with custom growth rates', () => {
    const growths = createGrowthRates({ hp: 80, str: 55 });
    const unit = new Unit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, stats, 2, 5, { growthRates: growths });
    expect(unit.growthRates.hp).toBe(80);
    expect(unit.growthRates.str).toBe(55);
  });

  it('gainExp adds to exp total', () => {
    const unit = new Unit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, stats, 2, 5);
    unit.gainExp(40);
    expect(unit.exp).toBe(40);
  });

  it('gainExp does not exceed 99 below max level', () => {
    const unit = new Unit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, stats, 2, 5);
    unit.gainExp(150);
    expect(unit.exp).toBe(99);
  });

  it('is at max level when level reaches 20 (unpromoted)', () => {
    const unit = new Unit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, stats, 2, 5, { level: 20 });
    expect(unit.isAtMaxLevel).toBe(true);
  });

  it('is not at max level below 20', () => {
    const unit = new Unit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, stats, 2, 5, { level: 19 });
    expect(unit.isAtMaxLevel).toBe(false);
  });

  it('pegasus knight is flying', () => {
    const pegStats = createStats({ hp: 20, str: 5, mag: 5, skl: 5, spd: 5, luk: 5, def: 5, res: 5, mov: 7 });
    const unit = new Unit('u1', 'Peg', Faction.PLAYER, UnitClass.PEGASUS_KNIGHT, pegStats, 0, 0);
    expect(unit.isFlying).toBe(true);
  });

  it('lord is not flying', () => {
    const lordStats = createStats({ hp: 20, str: 5, mag: 5, skl: 5, spd: 5, luk: 5, def: 5, res: 5, mov: 5 });
    const unit = new Unit('u1', 'Rowan', Faction.PLAYER, UnitClass.LORD, lordStats, 0, 0);
    expect(unit.isFlying).toBe(false);
  });

  it('hasActed setter works from IDLE state', () => {
    const unit = new Unit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, stats, 2, 5);
    unit.hasActed = true;
    expect(unit.hasActed).toBe(true);
    expect(unit.state.current).toBe(UNIT_STATE.EXHAUSTED);
  });

  it('hasActed setter works from MOVING state', () => {
    const unit = new Unit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, stats, 2, 5);
    unit.state.transition(UNIT_STATE.MOVING);
    unit.hasActed = true;
    expect(unit.hasActed).toBe(true);
    expect(unit.state.current).toBe(UNIT_STATE.EXHAUSTED);
  });

  it('hasActed setter works from MENU state', () => {
    const unit = new Unit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, stats, 2, 5);
    unit.state.transition(UNIT_STATE.MOVING);
    unit.state.transition(UNIT_STATE.MENU);
    unit.hasActed = true;
    expect(unit.hasActed).toBe(true);
    expect(unit.state.current).toBe(UNIT_STATE.EXHAUSTED);
  });

  it('hasActed setter is idempotent when already EXHAUSTED', () => {
    const unit = new Unit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, stats, 2, 5);
    unit.state.transition(UNIT_STATE.MOVING);
    unit.state.transition(UNIT_STATE.MENU);
    unit.state.transition(UNIT_STATE.EXHAUSTED);
    expect(() => { unit.hasActed = true; }).not.toThrow();
    expect(unit.hasActed).toBe(true);
    expect(unit.state.current).toBe(UNIT_STATE.EXHAUSTED);
  });
});
