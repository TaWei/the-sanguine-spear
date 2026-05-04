import { describe, it, expect } from 'vitest';
import { getTerrainMoveCost } from '../TerrainCost';
import { TerrainType } from '../../map/Terrain';
import { Unit, Faction, UnitClass } from '../../units/Unit';
import { createStats } from '../../units/Stats';

describe('TerrainCost', () => {
  it('returns normal move cost for plains', () => {
    const stats = createStats({
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
    const unit = new Unit('u1', 'Test', Faction.PLAYER, UnitClass.LORD, stats, 0, 0);
    expect(getTerrainMoveCost(unit, TerrainType.PLAINS)).toBe(1);
  });

  it('returns high move cost for cliff on non-flying unit', () => {
    const stats = createStats({
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
    const unit = new Unit('u1', 'Test', Faction.PLAYER, UnitClass.LORD, stats, 0, 0);
    expect(getTerrainMoveCost(unit, TerrainType.CLIFF)).toBe(4);
  });

  it('returns reduced move cost for cliff on flying unit', () => {
    const stats = createStats({
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
    const unit = new Unit('u1', 'Peg', Faction.PLAYER, UnitClass.PEGASUS_KNIGHT, stats, 0, 0);
    expect(getTerrainMoveCost(unit, TerrainType.CLIFF)).toBe(1);
  });

  it('returns normal move cost for lava regardless of flying', () => {
    const stats = createStats({
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
    const lord = new Unit('u1', 'Lord', Faction.PLAYER, UnitClass.LORD, stats, 0, 0);
    const peg = new Unit('u2', 'Peg', Faction.PLAYER, UnitClass.PEGASUS_KNIGHT, stats, 0, 0);
    expect(getTerrainMoveCost(lord, TerrainType.LAVA)).toBe(2);
    expect(getTerrainMoveCost(peg, TerrainType.LAVA)).toBe(2);
  });
});
