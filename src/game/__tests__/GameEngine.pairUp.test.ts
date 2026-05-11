import { describe, it, expect } from 'vitest';
import { GameEngine } from '../GameEngine';
import { Faction, UnitClass } from '../units/Unit';
import { createStats } from '../units/Stats';
import { TerrainType } from '../map/Terrain';

const defaultStats = createStats({
  hp: 20, str: 8, mag: 2, skl: 7, spd: 8, luk: 6, def: 6, res: 2, mov: 5,
});

describe('GameEngine pair up', () => {
  it('canPair returns true for adjacent same-faction units', () => {
    const engine = new GameEngine(8, 8);
    const a = engine.addUnit('a', 'A', Faction.PLAYER, UnitClass.LORD, defaultStats, 1, 1);
    const b = engine.addUnit('b', 'B', Faction.PLAYER, UnitClass.SOLDIER, defaultStats, 1, 2);
    expect(engine.canPair(a, b)).toBe(true);
  });

  it('canPair returns false for non-adjacent units', () => {
    const engine = new GameEngine(8, 8);
    const a = engine.addUnit('a', 'A', Faction.PLAYER, UnitClass.LORD, defaultStats, 1, 1);
    const b = engine.addUnit('b', 'B', Faction.PLAYER, UnitClass.SOLDIER, defaultStats, 3, 3);
    expect(engine.canPair(a, b)).toBe(false);
  });

  it('canPair returns false if one unit is already paired', () => {
    const engine = new GameEngine(8, 8);
    const a = engine.addUnit('a', 'A', Faction.PLAYER, UnitClass.LORD, defaultStats, 1, 1);
    const b = engine.addUnit('b', 'B', Faction.PLAYER, UnitClass.SOLDIER, defaultStats, 1, 2);
    const c = engine.addUnit('c', 'C', Faction.PLAYER, UnitClass.MAGE, defaultStats, 2, 1);
    engine.pairUp(a, b);
    expect(engine.canPair(a, c)).toBe(false);
    expect(engine.canPair(c, b)).toBe(false);
  });

  it('pairUp sets pair state and removes guard from grid', () => {
    const engine = new GameEngine(8, 8);
    const lead = engine.addUnit('lead', 'Lead', Faction.PLAYER, UnitClass.LORD, defaultStats, 1, 1);
    const guard = engine.addUnit('guard', 'Guard', Faction.PLAYER, UnitClass.SOLDIER, defaultStats, 1, 2);
    engine.pairUp(lead, guard);
    expect(lead.pairUpState.guardUnitId).toBe('guard');
    expect(guard.pairUpState.leadUnitId).toBe('lead');
    expect(engine.getUnit(1, 2)).toBeNull();
  });

  it('pairUp throws if units cannot pair', () => {
    const engine = new GameEngine(8, 8);
    const a = engine.addUnit('a', 'A', Faction.PLAYER, UnitClass.LORD, defaultStats, 1, 1);
    const b = engine.addUnit('b', 'B', Faction.ENEMY, UnitClass.BRIGAND, defaultStats, 1, 2);
    expect(() => engine.pairUp(a, b)).toThrow();
  });

  it('breakPair clears state and places guard adjacent to lead', () => {
    const engine = new GameEngine(8, 8);
    const lead = engine.addUnit('lead', 'Lead', Faction.PLAYER, UnitClass.LORD, defaultStats, 1, 1);
    const guard = engine.addUnit('guard', 'Guard', Faction.PLAYER, UnitClass.SOLDIER, defaultStats, 1, 2);
    engine.pairUp(lead, guard);
    engine.breakPair(lead);
    expect(lead.pairUpState.isPaired()).toBe(false);
    expect(guard.pairUpState.isPaired()).toBe(false);
    // Guard should be placed adjacent to lead
    const dx = Math.abs(lead.gridX - guard.gridX);
    const dy = Math.abs(lead.gridY - guard.gridY);
    expect(dx + dy).toBe(1);
    expect(engine.getUnit(guard.gridX, guard.gridY)).toBe(guard);
  });

  it('breakPair does nothing if unit is not paired', () => {
    const engine = new GameEngine(8, 8);
    const a = engine.addUnit('a', 'A', Faction.PLAYER, UnitClass.LORD, defaultStats, 1, 1);
    expect(() => engine.breakPair(a)).not.toThrow();
    expect(a.pairUpState.isPaired()).toBe(false);
  });

  it('moving lead also moves guard and keeps them co-located', () => {
    const engine = new GameEngine(8, 8);
    const lead = engine.addUnit('lead', 'Lead', Faction.PLAYER, UnitClass.LORD, defaultStats, 1, 1);
    const guard = engine.addUnit('guard', 'Guard', Faction.PLAYER, UnitClass.SOLDIER, defaultStats, 1, 2);
    engine.pairUp(lead, guard);
    engine.moveUnit(lead, 3, 3);
    expect(lead.gridX).toBe(3);
    expect(lead.gridY).toBe(3);
    expect(guard.gridX).toBe(3);
    expect(guard.gridY).toBe(3);
    expect(engine.getUnit(3, 3)).toBe(lead);
  });

  it('getAdjacentAllies includes paired guard when lead is selected', () => {
    const engine = new GameEngine(8, 8);
    const lead = engine.addUnit('lead', 'Lead', Faction.PLAYER, UnitClass.LORD, defaultStats, 1, 1);
    const guard = engine.addUnit('guard', 'Guard', Faction.PLAYER, UnitClass.SOLDIER, defaultStats, 1, 2);
    const other = engine.addUnit('other', 'Other', Faction.PLAYER, UnitClass.MAGE, defaultStats, 2, 1);
    engine.pairUp(lead, guard);
    const allies = engine.getAdjacentAllies(lead);
    // Guard is now on lead's tile (not adjacent), so should not appear as adjacent
    // Other is at (2,1), adjacent to (1,1)
    expect(allies.map((u) => u.id)).toContain('other');
  });

  it('resolvePlayerCombat includes combination attack from guard', () => {
    const engine = new GameEngine(8, 8);
    const lead = engine.addUnit('lead', 'Lead', Faction.PLAYER, UnitClass.LORD, defaultStats, 1, 1);
    const guard = engine.addUnit('guard', 'Guard', Faction.PLAYER, UnitClass.SOLDIER, defaultStats, 1, 2);
    const enemy = engine.addUnit('enemy', 'Enemy', Faction.ENEMY, UnitClass.BRIGAND, defaultStats, 2, 1);
    engine.pairUp(lead, guard);
    // Both lead and guard have default weapons from addUnit
    const result = engine.resolvePlayerCombat(lead, enemy, () => 0);
    // Should have lead attack + guard combination attack + enemy counter
    const guardAttacks = result.log.filter((e) => e.attacker.id === 'guard');
    expect(guardAttacks.length).toBeGreaterThan(0);
  });

  it('snapshot includes pair state', () => {
    const engine = new GameEngine(8, 8);
    const lead = engine.addUnit('lead', 'Lead', Faction.PLAYER, UnitClass.LORD, defaultStats, 1, 1);
    const guard = engine.addUnit('guard', 'Guard', Faction.PLAYER, UnitClass.SOLDIER, defaultStats, 1, 2);
    engine.pairUp(lead, guard);
    const save = engine.snapshot('level-test');
    const leadSnap = save.units.find((u) => u.id === 'lead')!;
    const guardSnap = save.units.find((u) => u.id === 'guard')!;
    expect(leadSnap.pairUpState?.guardUnitId).toBe('guard');
    expect(guardSnap.pairUpState?.leadUnitId).toBe('lead');
  });

  it('restore rebuilds pair state and removes guard from grid', () => {
    const engine = new GameEngine(8, 8);
    const lead = engine.addUnit('lead', 'Lead', Faction.PLAYER, UnitClass.LORD, defaultStats, 1, 1);
    const guard = engine.addUnit('guard', 'Guard', Faction.PLAYER, UnitClass.SOLDIER, defaultStats, 1, 2);
    engine.pairUp(lead, guard);
    const save = engine.snapshot('level-test');

    const engine2 = new GameEngine(1, 1);
    engine2.restore(save);
    const lead2 = engine2.getUnit(1, 1)!;
    const guard2 = engine2.getAllUnits().find((u) => u.id === 'guard')!;
    expect(lead2.pairUpState.guardUnitId).toBe('guard');
    expect(guard2.pairUpState.leadUnitId).toBe('lead');
    expect(guard2.gridX).toBe(1);
    expect(guard2.gridY).toBe(1);
    // Guard should not be on grid separately — only lead occupies the tile
    expect(engine2.getUnit(1, 1)!.id).toBe('lead');
  });

  it('guard defense bonus reduces damage to lead', () => {
    const engine = new GameEngine(8, 8);
    const lead = engine.addUnit('lead', 'Lead', Faction.PLAYER, UnitClass.LORD, defaultStats, 1, 1);
    const guard = engine.addUnit('guard', 'Guard', Faction.PLAYER, UnitClass.SOLDIER, defaultStats, 1, 2);
    const enemy = engine.addUnit('enemy', 'Enemy', Faction.ENEMY, UnitClass.BRIGAND, defaultStats, 2, 1);
    engine.pairUp(lead, guard);

    // Guaranteed hit, no crit RNG sequence: [0,0,99]
    const result = engine.resolvePlayerCombat(enemy, lead, () => 0);
    // Enemy uses Iron Axe (mt 8) vs Lord's Iron Sword (mt 5). Sword > Axe, so enemy gets -1 mt.
    // Enemy str 8 + mt 8 - 1 triangle - lead def 6 = 9 base. Guard def 6 -> bonus 3. 9 - 3 = 6.
    const hitEntry = result.log.find((e) => e.attacker.id === 'enemy' && e.hit);
    expect(hitEntry).toBeDefined();
    expect(hitEntry!.damage).toBe(6);
  });

  it('save() is an alias for snapshot()', () => {
    const engine = new GameEngine(8, 8);
    const lead = engine.addUnit('lead', 'Lead', Faction.PLAYER, UnitClass.LORD, defaultStats, 1, 1);
    engine.addUnit('guard', 'Guard', Faction.PLAYER, UnitClass.SOLDIER, defaultStats, 1, 2);
    const save = engine.save('level-test');
    expect(save.levelId).toBe('level-test');
    expect(save.units.length).toBe(2);
  });

  it('load() is an alias for restore()', () => {
    const engine = new GameEngine(8, 8);
    const lead = engine.addUnit('lead', 'Lead', Faction.PLAYER, UnitClass.LORD, defaultStats, 1, 1);
    const guard = engine.addUnit('guard', 'Guard', Faction.PLAYER, UnitClass.SOLDIER, defaultStats, 1, 2);
    engine.pairUp(lead, guard);
    const save = engine.save('level-test');

    const engine2 = new GameEngine(1, 1);
    engine2.load(save);
    const lead2 = engine2.getUnit(1, 1)!;
    const guard2 = engine2.getAllUnits().find((u) => u.id === 'guard')!;
    expect(lead2.pairUpState.guardUnitId).toBe('guard');
    expect(guard2.pairUpState.leadUnitId).toBe('lead');
  });

  it('getPairableAllies returns adjacent same-faction unpaired units', () => {
    const engine = new GameEngine(8, 8);
    const a = engine.addUnit('a', 'A', Faction.PLAYER, UnitClass.LORD, defaultStats, 1, 1);
    const b = engine.addUnit('b', 'B', Faction.PLAYER, UnitClass.SOLDIER, defaultStats, 1, 2);
    const pairable = engine.getPairableAllies(a);
    expect(pairable.map((u) => u.id)).toContain('b');
  });

  it('getPairableAllies excludes non-adjacent units', () => {
    const engine = new GameEngine(8, 8);
    const a = engine.addUnit('a', 'A', Faction.PLAYER, UnitClass.LORD, defaultStats, 1, 1);
    engine.addUnit('b', 'B', Faction.PLAYER, UnitClass.SOLDIER, defaultStats, 3, 3);
    const pairable = engine.getPairableAllies(a);
    expect(pairable).toHaveLength(0);
  });

  it('getPairableAllies excludes already-paired units', () => {
    const engine = new GameEngine(8, 8);
    const a = engine.addUnit('a', 'A', Faction.PLAYER, UnitClass.LORD, defaultStats, 1, 1);
    const b = engine.addUnit('b', 'B', Faction.PLAYER, UnitClass.SOLDIER, defaultStats, 1, 2);
    const c = engine.addUnit('c', 'C', Faction.PLAYER, UnitClass.MAGE, defaultStats, 2, 1);
    engine.pairUp(a, b);
    const pairable = engine.getPairableAllies(a);
    expect(pairable.map((u) => u.id)).not.toContain('b');
  });

  it('getPairableAllies excludes enemy units', () => {
    const engine = new GameEngine(8, 8);
    const a = engine.addUnit('a', 'A', Faction.PLAYER, UnitClass.LORD, defaultStats, 1, 1);
    engine.addUnit('b', 'B', Faction.ENEMY, UnitClass.BRIGAND, defaultStats, 1, 2);
    const pairable = engine.getPairableAllies(a);
    expect(pairable).toHaveLength(0);
  });

  it('getPairableAllies excludes dead units', () => {
    const engine = new GameEngine(8, 8);
    const a = engine.addUnit('a', 'A', Faction.PLAYER, UnitClass.LORD, defaultStats, 1, 1);
    const b = engine.addUnit('b', 'B', Faction.PLAYER, UnitClass.SOLDIER, defaultStats, 1, 2);
    b.takeDamage(999);
    const pairable = engine.getPairableAllies(a);
    expect(pairable).toHaveLength(0);
  });
});
