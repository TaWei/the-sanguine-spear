import { describe, it, expect, beforeEach } from 'vitest';
import { VillageEngine } from '../VillageEngine';
import { FortEngine } from '../FortEngine';
import { Unit, Faction } from '../../units/Unit';
import { createStats } from '../../units/Stats';
import { TerrainType } from '../../map/Terrain';

function createUnit(faction: Faction, hp = 20, maxHp = 20): Unit {
  return new Unit('test', 'Test', faction, 'lord', createStats({
    hp, maxHp, str: 8, mag: 2, skl: 7, spd: 8, luk: 6, def: 6, res: 2, mov: 5,
  }), 0, 0);
}

describe('VillageEngine', () => {
  let engine: VillageEngine;

  beforeEach(() => {
    engine = new VillageEngine();
  });

  it('allows visiting when player unit steps on village tile', () => {
    const unit = createUnit(Faction.PLAYER);
    expect(engine.canVisit(unit, 5, 5, TerrainType.VILLAGE)).toBe(true);
  });

  it('prevents visiting when enemy unit steps on village', () => {
    const unit = createUnit(Faction.ENEMY);
    expect(engine.canVisit(unit, 5, 5, TerrainType.VILLAGE)).toBe(false);
  });

  it('prevents revisiting an already-visited village', () => {
    const unit = createUnit(Faction.PLAYER);
    expect(engine.canVisit(unit, 5, 5, TerrainType.VILLAGE)).toBe(true);
    engine.visit(5, 5);
    expect(engine.canVisit(unit, 5, 5, TerrainType.VILLAGE)).toBe(false);
  });

  it('prevents visiting non-village terrain', () => {
    const unit = createUnit(Faction.PLAYER);
    expect(engine.canVisit(unit, 5, 5, TerrainType.PLAINS)).toBe(false);
  });

  it('tracks visited state', () => {
    engine.visit(3, 7);
    expect(engine.isVisited(3, 7)).toBe(true);
    expect(engine.isVisited(5, 5)).toBe(false);
  });
});

describe('FortEngine', () => {
  let engine: FortEngine;

  beforeEach(() => {
    engine = new FortEngine();
  });

  it('restores HP when unit ends turn on fort', () => {
    const unit = createUnit(Faction.PLAYER, 10, 20);
    const healed = engine.applyFortHealing(unit, TerrainType.FORT);
    expect(healed).toBe(4); // 20% of 20 = 4
    expect(unit.stats.hp).toBe(14);
  });

  it('does not heal on plains', () => {
    const unit = createUnit(Faction.PLAYER, 10, 20);
    const healed = engine.applyFortHealing(unit, TerrainType.PLAINS);
    expect(healed).toBe(0);
    expect(unit.stats.hp).toBe(10);
  });

  it('heals on gate tiles', () => {
    const unit = createUnit(Faction.PLAYER, 5, 20);
    const healed = engine.applyFortHealing(unit, TerrainType.GATE);
    expect(healed).toBe(4);
    expect(unit.stats.hp).toBe(9);
  });

  it('heals on throne tiles', () => {
    const unit = createUnit(Faction.PLAYER, 8, 20);
    const healed = engine.applyFortHealing(unit, TerrainType.THRONE);
    expect(healed).toBe(4);
  });

  it('caps healing at max HP', () => {
    const unit = createUnit(Faction.PLAYER, 18, 20);
    const healed = engine.applyFortHealing(unit, TerrainType.FORT);
    expect(healed).toBe(2);
    expect(unit.stats.hp).toBe(20);
  });
});
