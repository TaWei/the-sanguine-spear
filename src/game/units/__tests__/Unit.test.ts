import { describe, it, expect } from 'vitest';
import { Unit, Faction, UnitClass } from '../Unit';
import { createStats } from '../Stats';
import { UNIT_STATE } from '../../state/UnitState';
import { createGrowthRates } from '../../progression/GrowthRates';
import { Inventory } from '../../items/Inventory';
import { createWeaponItem } from '../../items/ItemTypes';

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

  it('starts at base tier', () => {
    const unit = new Unit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, stats, 2, 5);
    expect(unit.tier).toBe('base');
  });

  it('can apply promotion changing class and stats', () => {
    const unit = new Unit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, stats, 2, 5, { level: 10 });
    const promotedStats = createStats({
      hp: 26, str: 11, mag: 2, skl: 9, spd: 10, luk: 8, def: 9, res: 4, mov: 6,
    });
    unit.applyPromotion('paladin', promotedStats);
    expect(unit.unitClass).toBe('paladin');
    expect(unit.level).toBe(1);
    expect(unit.exp).toBe(0);
    expect(unit.tier).toBe('promoted');
    expect(unit.stats.hp).toBe(26);
  });

  it('is at max level at 20 for base tier', () => {
    const unit = new Unit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, stats, 2, 5, { level: 20 });
    expect(unit.isAtMaxLevel).toBe(true);
  });

  it('is at max level at 20 for promoted tier', () => {
    const unit = new Unit('p1', 'Rowan', Faction.PLAYER, UnitClass.SWORDMASTER, stats, 2, 5, { level: 20 });
    expect(unit.isAtMaxLevel).toBe(true);
  });

  it('is not at max level below 20 for promoted tier', () => {
    const unit = new Unit('p1', 'Rowan', Faction.PLAYER, UnitClass.SWORDMASTER, stats, 2, 5, { level: 19 });
    expect(unit.isAtMaxLevel).toBe(false);
  });

  it('can be constructed with a custom level and exp', () => {
    const unit = new Unit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, stats, 2, 5, {
      level: 5,
      exp: 30,
    });
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
    const unit = new Unit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, stats, 2, 5, {
      growthRates: growths,
    });
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
    const unit = new Unit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, stats, 2, 5, {
      level: 20,
    });
    expect(unit.isAtMaxLevel).toBe(true);
  });

  it('is not at max level below 20', () => {
    const unit = new Unit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, stats, 2, 5, {
      level: 19,
    });
    expect(unit.isAtMaxLevel).toBe(false);
  });

  it('pegasus knight is flying', () => {
    const pegStats = createStats({
      hp: 20,
      str: 5,
      mag: 5,
      skl: 5,
      spd: 5,
      luk: 5,
      def: 5,
      res: 5,
      mov: 7,
    });
    const unit = new Unit('u1', 'Peg', Faction.PLAYER, UnitClass.PEGASUS_KNIGHT, pegStats, 0, 0);
    expect(unit.isFlying).toBe(true);
  });

  it('falcon knight is flying', () => {
    const falconStats = createStats({
      hp: 24,
      str: 7,
      mag: 7,
      skl: 9,
      spd: 9,
      luk: 7,
      def: 7,
      res: 7,
      mov: 8,
    });
    const unit = new Unit('u2', 'Falcon', Faction.PLAYER, UnitClass.FALCON_KNIGHT, falconStats, 0, 0);
    expect(unit.isFlying).toBe(true);
  });

  it('lord is not flying', () => {
    const lordStats = createStats({
      hp: 20,
      str: 5,
      mag: 5,
      skl: 5,
      spd: 5,
      luk: 5,
      def: 5,
      res: 5,
      mov: 5,
    });
    const unit = new Unit('u1', 'Rowan', Faction.PLAYER, UnitClass.LORD, lordStats, 0, 0);
    expect(unit.isFlying).toBe(false);
  });

  it('has an inventory', () => {
    const unit = new Unit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, stats, 2, 5);
    expect(unit.inventory).toBeInstanceOf(Inventory);
    expect(unit.inventory.size).toBe(0);
  });

  it('can add items to unit.inventory', () => {
    const unit = new Unit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, stats, 2, 5);
    const item = createWeaponItem('Iron Sword', 'sword', 5, 90, 0, 1, 1, false);
    const added = unit.inventory.add(item);
    expect(added).toBe(true);
    expect(unit.inventory.size).toBe(1);
    expect(unit.inventory.items[0].name).toBe('Iron Sword');
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
    expect(() => {
      unit.hasActed = true;
    }).not.toThrow();
    expect(unit.hasActed).toBe(true);
    expect(unit.state.current).toBe(UNIT_STATE.EXHAUSTED);
  });

  it('heal restores HP up to maxHp', () => {
    const unit = new Unit('u1', 'Test', Faction.PLAYER, UnitClass.LORD, createStats({
      hp: 10, maxHp: 20, str: 5, mag: 5, skl: 5, spd: 5, luk: 5, def: 5, res: 5, mov: 5,
    }), 0, 0);
    unit.takeDamage(5);
    expect(unit.stats.hp).toBe(5);
    unit.heal(8);
    expect(unit.stats.hp).toBe(13);
  });

  it('heal does not exceed maxHp', () => {
    const unit = new Unit('u2', 'Test', Faction.PLAYER, UnitClass.LORD, createStats({
      hp: 18, maxHp: 20, str: 5, mag: 5, skl: 5, spd: 5, luk: 5, def: 5, res: 5, mov: 5,
    }), 0, 0);
    unit.heal(10);
    expect(unit.stats.hp).toBe(20);
  });

  it('setFaction changes faction and updates isPlayer/isEnemy', () => {
    const unit = new Unit('e1', 'Bandit', Faction.ENEMY, UnitClass.BRIGAND, stats, 2, 5);
    expect(unit.faction).toBe('enemy');
    expect(unit.isEnemy).toBe(true);
    expect(unit.isPlayer).toBe(false);

    unit.setFaction(Faction.PLAYER);

    expect(unit.faction).toBe('player');
    expect(unit.isEnemy).toBe(false);
    expect(unit.isPlayer).toBe(true);
  });

  it('setFaction can change to ally faction', () => {
    const unit = new Unit('e1', 'Bandit', Faction.ENEMY, UnitClass.BRIGAND, stats, 2, 5);
    unit.setFaction(Faction.ALLY);
    expect(unit.faction).toBe('ally');
    expect(unit.isEnemy).toBe(false);
    expect(unit.isPlayer).toBe(false);
  });
});

describe('Rescue state', () => {
  it('starts with no rescued unit and not rescued', () => {
    const unit = new Unit('u1', 'Rowan', Faction.PLAYER, UnitClass.CAVALRY,
      createStats({ hp: 20, maxHp: 20, str: 8, mag: 0, skl: 8, spd: 8, luk: 3, def: 5, res: 2, mov: 5 }),
      3, 3);
    expect(unit.rescuedUnit).toBeNull();
    expect(unit.rescuedBy).toBeNull();
    expect(unit.isCarrying).toBe(false);
    expect(unit.isRescued).toBe(false);
  });

  it('can carry a rescued unit', () => {
    const carrier = new Unit('u1', 'Seth', Faction.PLAYER, UnitClass.CAVALRY,
      createStats({ hp: 25, maxHp: 25, str: 10, mag: 0, skl: 10, spd: 10, luk: 3, def: 8, res: 2, mov: 7 }),
      3, 3);
    const passenger = new Unit('u2', 'Eirika', Faction.PLAYER, UnitClass.LORD,
      createStats({ hp: 18, maxHp: 18, str: 6, mag: 0, skl: 8, spd: 10, luk: 7, def: 5, res: 2, mov: 5 }),
      4, 3);
    
    carrier.setRescuedUnit(passenger);
    
    expect(carrier.rescuedUnit).toBe(passenger);
    expect(carrier.isCarrying).toBe(true);
    expect(passenger.rescuedBy).toBe(carrier);
    expect(passenger.isRescued).toBe(true);
  });

  it('clearing rescued unit restores both sides', () => {
    const carrier = new Unit('u1', 'Seth', Faction.PLAYER, UnitClass.CAVALRY,
      createStats({ hp: 25, maxHp: 25, str: 10, mag: 0, skl: 10, spd: 10, luk: 3, def: 8, res: 2, mov: 7 }),
      3, 3);
    const passenger = new Unit('u2', 'Eirika', Faction.PLAYER, UnitClass.LORD,
      createStats({ hp: 18, maxHp: 18, str: 6, mag: 0, skl: 8, spd: 10, luk: 7, def: 5, res: 2, mov: 5 }),
      4, 3);
    
    carrier.setRescuedUnit(passenger);
    carrier.clearRescuedUnit();
    
    expect(carrier.rescuedUnit).toBeNull();
    expect(carrier.isCarrying).toBe(false);
    expect(passenger.rescuedBy).toBeNull();
    expect(passenger.isRescued).toBe(false);
  });

  it('cannot rescue a unit that is already carrying someone', () => {
    const carrier1 = new Unit('u1', 'Seth', Faction.PLAYER, UnitClass.CAVALRY,
      createStats({ hp: 25, maxHp: 25, str: 10, mag: 0, skl: 10, spd: 10, luk: 3, def: 8, res: 2, mov: 7 }),
      3, 3);
    const carrier2 = new Unit('u2', 'Franz', Faction.PLAYER, UnitClass.CAVALRY,
      createStats({ hp: 22, maxHp: 22, str: 8, mag: 0, skl: 9, spd: 10, luk: 3, def: 7, res: 2, mov: 7 }),
      4, 3);
    const passenger = new Unit('u3', 'Eirika', Faction.PLAYER, UnitClass.LORD,
      createStats({ hp: 18, maxHp: 18, str: 6, mag: 0, skl: 8, spd: 10, luk: 7, def: 5, res: 2, mov: 5 }),
      5, 3);
    
    carrier1.setRescuedUnit(passenger);
    expect(() => carrier2.setRescuedUnit(carrier1)).toThrow();
  });
});

describe('Rescue stat penalties', () => {
  it('carrying unit has halved Skl and Spd', () => {
    const carrier = new Unit('u1', 'Seth', Faction.PLAYER, UnitClass.CAVALRY,
      createStats({ hp: 25, maxHp: 25, str: 10, mag: 0, skl: 14, spd: 12, luk: 8, def: 10, res: 5, mov: 7 }),
      3, 3);
    const passenger = new Unit('u2', 'Eirika', Faction.PLAYER, UnitClass.LORD,
      createStats({ hp: 18, maxHp: 18, str: 6, mag: 0, skl: 8, spd: 10, luk: 7, def: 5, res: 2, mov: 5 }),
      4, 3);
    
    carrier.setRescuedUnit(passenger);
    
    // Skl: floor(14/2) = 7, Spd: floor(12/2) = 6
    expect(carrier.stats.skl).toBe(7);
    expect(carrier.stats.spd).toBe(6);
    // Other stats unchanged
    expect(carrier.stats.str).toBe(10);
    expect(carrier.stats.def).toBe(10);
  });

  it('clearing rescued unit restores full stats', () => {
    const carrier = new Unit('u1', 'Seth', Faction.PLAYER, UnitClass.CAVALRY,
      createStats({ hp: 25, maxHp: 25, str: 10, mag: 0, skl: 14, spd: 12, luk: 8, def: 10, res: 5, mov: 7 }),
      3, 3);
    const passenger = new Unit('u2', 'Eirika', Faction.PLAYER, UnitClass.LORD,
      createStats({ hp: 18, maxHp: 18, str: 6, mag: 0, skl: 8, spd: 10, luk: 7, def: 5, res: 2, mov: 5 }),
      4, 3);
    
    carrier.setRescuedUnit(passenger);
    expect(carrier.stats.skl).toBe(7);
    expect(carrier.stats.spd).toBe(6);
    
    carrier.clearRescuedUnit();
    expect(carrier.stats.skl).toBe(14);
    expect(carrier.stats.spd).toBe(12);
  });

  it('rescued unit stats are unchanged', () => {
    const carrier = new Unit('u1', 'Seth', Faction.PLAYER, UnitClass.CAVALRY,
      createStats({ hp: 25, maxHp: 25, str: 10, mag: 0, skl: 10, spd: 10, luk: 8, def: 10, res: 5, mov: 7 }),
      3, 3);
    const passenger = new Unit('u2', 'Eirika', Faction.PLAYER, UnitClass.LORD,
      createStats({ hp: 18, maxHp: 18, str: 6, mag: 0, skl: 8, spd: 10, luk: 7, def: 5, res: 2, mov: 5 }),
      4, 3);

    carrier.setRescuedUnit(passenger);
    expect(passenger.stats.skl).toBe(8);  // unchanged
    expect(passenger.stats.spd).toBe(10); // unchanged
  });

  it('stats getter returns stable reference while carrying', () => {
    const carrier = new Unit('u1', 'Seth', Faction.PLAYER, UnitClass.CAVALRY,
      createStats({ hp: 25, maxHp: 25, str: 10, mag: 0, skl: 14, spd: 12, luk: 8, def: 10, res: 5, mov: 7 }),
      3, 3);
    const passenger = new Unit('u2', 'Eirika', Faction.PLAYER, UnitClass.LORD,
      createStats({ hp: 18, maxHp: 18, str: 6, mag: 0, skl: 8, spd: 10, luk: 7, def: 5, res: 2, mov: 5 }),
      4, 3);

    carrier.setRescuedUnit(passenger);
    const s1 = carrier.stats;
    const s2 = carrier.stats;
    expect(s1).toBe(s2); // same reference, no reconstruction on every access
  });
});
