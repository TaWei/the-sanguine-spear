import { describe, it, expect, beforeEach } from 'vitest';
import { FogOfWar } from '../FogOfWar';
import { FogTileState } from '../FogTileState';
import { Unit, Faction } from '../../units/Unit';
import { createStats } from '../../units/Stats';
import { Grid } from '../../map/Grid';
import { TerrainType } from '../../map/Terrain';
import { GameEngine } from '../../GameEngine';
import { computeVisibility } from '../VisibilityMap';
import { computeSightRange } from '../SightRange';
import { Commander } from '../../ai/Commander';
import { AllyCommander } from '../../ai/AllyCommander';
import { WEAPON_DB } from '../../combat/Weapons';

function createTestUnit(
  id: string,
  faction: Faction,
  unitClass: string,
  x: number,
  y: number,
  isFlying = false,
): Unit {
  const cls = isFlying ? 'pegasus_knight' : unitClass;
  return new Unit(id, id, faction, cls as any, createStats({
    hp: 20, maxHp: 20, str: 8, mag: 2, skl: 7, spd: 8, luk: 6, def: 6, res: 2, mov: 5,
  }), x, y);
}

describe('FogIntegration', () => {
  describe('SightRange per unit type', () => {
    it('archers have extended sight range (5)', () => {
      const grid = new Grid(15, 15);
      const archer = createTestUnit('a1', Faction.PLAYER, 'archer', 5, 5);
      const visibility = computeVisibility([archer], grid, Faction.PLAYER);
      // Archers see 5 tiles away
      expect(visibility.get('10,5')).toBe(FogTileState.VISIBLE);
      expect(visibility.get('11,5')).toBeUndefined(); // beyond range
    });

    it('thieves have extended sight range (5)', () => {
      const grid = new Grid(15, 15);
      const thief = createTestUnit('t1', Faction.PLAYER, 'thief', 5, 5);
      const visibility = computeVisibility([thief], grid, Faction.PLAYER);
      expect(visibility.get('10,5')).toBe(FogTileState.VISIBLE);
      expect(visibility.get('11,5')).toBeUndefined();
    });

    it('lords have standard sight range (3)', () => {
      const grid = new Grid(15, 15);
      const lord = createTestUnit('l1', Faction.PLAYER, 'lord', 5, 5);
      const visibility = computeVisibility([lord], grid, Faction.PLAYER);
      expect(visibility.get('8,5')).toBe(FogTileState.VISIBLE);
      expect(visibility.get('9,5')).toBeUndefined();
    });

    it('mages have moderate sight range (4)', () => {
      const grid = new Grid(15, 15);
      const mage = createTestUnit('m1', Faction.PLAYER, 'mage', 5, 5);
      const visibility = computeVisibility([mage], grid, Faction.PLAYER);
      expect(visibility.get('9,5')).toBe(FogTileState.VISIBLE);
      expect(visibility.get('10,5')).toBeUndefined();
    });
  });

  describe('Terrain blocking sight', () => {
    it('forest tiles block vision for ground units', () => {
      const grid = new Grid(15, 15);
      grid.setTerrain(7, 5, TerrainType.FOREST);
      const lord = createTestUnit('l1', Faction.PLAYER, 'lord', 5, 5);
      const visibility = computeVisibility([lord], grid, Faction.PLAYER);
      // Tile beyond forest is blocked
      expect(visibility.get('9,5')).toBeUndefined();
    });

    it('thieves see through forests', () => {
      const grid = new Grid(15, 15);
      grid.setTerrain(7, 5, TerrainType.FOREST);
      const thief = createTestUnit('t1', Faction.PLAYER, 'thief', 5, 5);
      const visibility = computeVisibility([thief], grid, Faction.PLAYER);
      // Thief sees through forest blocking
      expect(visibility.get('9,5')).toBe(FogTileState.VISIBLE);
    });

    it('mountain terrain increases sight range', () => {
      const grid = new Grid(15, 15);
      grid.setTerrain(5, 5, TerrainType.MOUNTAIN);
      const lord = createTestUnit('l1', Faction.PLAYER, 'lord', 5, 5);
      const sight = computeSightRange(lord, TerrainType.MOUNTAIN);
      expect(sight).toBe(6); // base 3 + 3
    });

    it('fort terrain increases sight range', () => {
      const grid = new Grid(15, 15);
      grid.setTerrain(5, 5, TerrainType.FORT);
      const lord = createTestUnit('l1', Faction.PLAYER, 'lord', 5, 5);
      const sight = computeSightRange(lord, TerrainType.FORT);
      expect(sight).toBe(5); // base 3 + 2
    });
  });

  describe('FogOfWar unit tile state', () => {
    let fog: FogOfWar;
    let grid: Grid;

    beforeEach(() => {
      fog = new FogOfWar();
      fog.setEnabled(true);
      grid = new Grid(15, 15);
    });

    it('getUnitTileState returns VISIBLE for currently seen enemy', () => {
      const player = createTestUnit('p1', Faction.PLAYER, 'lord', 5, 5);
      const enemy = createTestUnit('e1', Faction.ENEMY, 'brigand', 6, 5);
      fog.update([player, enemy], grid);
      expect(fog.getUnitTileState(enemy, Faction.PLAYER)).toBe(FogTileState.VISIBLE);
    });

    it('getUnitTileState returns DIMMED for previously seen enemy', () => {
      const player = createTestUnit('p1', Faction.PLAYER, 'lord', 5, 5);
      const enemy = createTestUnit('e1', Faction.ENEMY, 'brigand', 7, 5);
      fog.update([player, enemy], grid);
      expect(fog.getUnitTileState(enemy, Faction.PLAYER)).toBe(FogTileState.VISIBLE);
      player.moveTo(10, 10);
      fog.update([player, enemy], grid);
      expect(fog.getUnitTileState(enemy, Faction.PLAYER)).toBe(FogTileState.DIMMED);
    });

    it('getUnitTileState returns UNSEEN for never-seen enemy', () => {
      const player = createTestUnit('p1', Faction.PLAYER, 'lord', 1, 1);
      const enemy = createTestUnit('e1', Faction.ENEMY, 'brigand', 10, 10);
      fog.update([player, enemy], grid);
      expect(fog.getUnitTileState(enemy, Faction.PLAYER)).toBe(FogTileState.UNSEEN);
    });

    it('isUnitTargetable returns false for UNSEEN enemies', () => {
      const player = createTestUnit('p1', Faction.PLAYER, 'lord', 1, 1);
      const enemy = createTestUnit('e1', Faction.ENEMY, 'brigand', 10, 10);
      fog.update([player, enemy], grid);
      expect(fog.isUnitTargetable(enemy, Faction.PLAYER)).toBe(false);
    });

    it('isUnitTargetable returns true for VISIBLE enemies', () => {
      const player = createTestUnit('p1', Faction.PLAYER, 'lord', 5, 5);
      const enemy = createTestUnit('e1', Faction.ENEMY, 'brigand', 6, 5);
      fog.update([player, enemy], grid);
      expect(fog.isUnitTargetable(enemy, Faction.PLAYER)).toBe(true);
    });

    it('isUnitTargetable returns true for DIMMED enemies', () => {
      const player = createTestUnit('p1', Faction.PLAYER, 'lord', 5, 5);
      const enemy = createTestUnit('e1', Faction.ENEMY, 'brigand', 7, 5);
      fog.update([player, enemy], grid);
      player.moveTo(10, 10);
      fog.update([player, enemy], grid);
      expect(fog.getUnitTileState(enemy, Faction.PLAYER)).toBe(FogTileState.DIMMED);
      expect(fog.isUnitTargetable(enemy, Faction.PLAYER)).toBe(true);
    });
  });

  describe('GameEngine fog integration', () => {
    it('getUnitFogState returns correct state for enemies', () => {
      const engine = new GameEngine(15, 15);
      engine.fog.setEnabled(true);
      const player = engine.addUnit('p1', 'Rowan', Faction.PLAYER, 'lord', createStats({
        hp: 20, maxHp: 20, str: 8, mag: 2, skl: 7, spd: 8, luk: 6, def: 6, res: 2, mov: 5,
      }), 5, 5);
      const enemy = engine.addUnit('e1', 'Bandit', Faction.ENEMY, 'brigand', createStats({
        hp: 26, maxHp: 26, str: 9, mag: 0, skl: 4, spd: 5, luk: 3, def: 5, res: 1, mov: 5,
      }), 6, 5);
      engine.updateFogOfWar();
      expect(engine.getUnitFogState(enemy)).toBe(FogTileState.VISIBLE);
    });

    it('getUnitFogState returns UNSEEN for far enemies', () => {
      const engine = new GameEngine(15, 15);
      engine.fog.setEnabled(true);
      engine.addUnit('p1', 'Rowan', Faction.PLAYER, 'lord', createStats({
        hp: 20, maxHp: 20, str: 8, mag: 2, skl: 7, spd: 8, luk: 6, def: 6, res: 2, mov: 5,
      }), 1, 1);
      const enemy = engine.addUnit('e1', 'Bandit', Faction.ENEMY, 'brigand', createStats({
        hp: 26, maxHp: 26, str: 9, mag: 0, skl: 4, spd: 5, luk: 3, def: 5, res: 1, mov: 5,
      }), 10, 10);
      engine.updateFogOfWar();
      expect(engine.getUnitFogState(enemy)).toBe(FogTileState.UNSEEN);
    });

    it('isUnitTargetable returns false for UNSEEN enemies', () => {
      const engine = new GameEngine(15, 15);
      engine.fog.setEnabled(true);
      engine.addUnit('p1', 'Rowan', Faction.PLAYER, 'lord', createStats({
        hp: 20, maxHp: 20, str: 8, mag: 2, skl: 7, spd: 8, luk: 6, def: 6, res: 2, mov: 5,
      }), 1, 1);
      const enemy = engine.addUnit('e1', 'Bandit', Faction.ENEMY, 'brigand', createStats({
        hp: 26, maxHp: 26, str: 9, mag: 0, skl: 4, spd: 5, luk: 3, def: 5, res: 1, mov: 5,
      }), 10, 10);
      engine.updateFogOfWar();
      expect(engine.isUnitTargetable(enemy)).toBe(false);
    });

    it('isUnitTargetable returns true for VISIBLE enemies', () => {
      const engine = new GameEngine(15, 15);
      engine.fog.setEnabled(true);
      engine.addUnit('p1', 'Rowan', Faction.PLAYER, 'lord', createStats({
        hp: 20, maxHp: 20, str: 8, mag: 2, skl: 7, spd: 8, luk: 6, def: 6, res: 2, mov: 5,
      }), 5, 5);
      const enemy = engine.addUnit('e1', 'Bandit', Faction.ENEMY, 'brigand', createStats({
        hp: 26, maxHp: 26, str: 9, mag: 0, skl: 4, spd: 5, luk: 3, def: 5, res: 1, mov: 5,
      }), 6, 5);
      engine.updateFogOfWar();
      expect(engine.isUnitTargetable(enemy)).toBe(true);
    });

    it('snapshot preserves fog state', () => {
      const engine = new GameEngine(15, 15);
      engine.fog.setEnabled(true);
      engine.addUnit('p1', 'Rowan', Faction.PLAYER, 'lord', createStats({
        hp: 20, maxHp: 20, str: 8, mag: 2, skl: 7, spd: 8, luk: 6, def: 6, res: 2, mov: 5,
      }), 5, 5);
      engine.updateFogOfWar();
      const snap = engine.snapshot('test-level');
      expect(snap.fogEnabled).toBe(true);
      expect(snap.fogVisibility).toBeDefined();
      expect(snap.fogVisibility!.length).toBeGreaterThan(0);
    });

    it('restore preserves fog state', () => {
      const engine = new GameEngine(15, 15);
      engine.fog.setEnabled(true);
      engine.addUnit('p1', 'Rowan', Faction.PLAYER, 'lord', createStats({
        hp: 20, maxHp: 20, str: 8, mag: 2, skl: 7, spd: 8, luk: 6, def: 6, res: 2, mov: 5,
      }), 5, 5);
      const enemy = engine.addUnit('e1', 'Bandit', Faction.ENEMY, 'brigand', createStats({
        hp: 26, maxHp: 26, str: 9, mag: 0, skl: 4, spd: 5, luk: 3, def: 5, res: 1, mov: 5,
      }), 6, 5);
      engine.updateFogOfWar();
      const snap = engine.snapshot('test-level');

      const engine2 = new GameEngine(15, 15);
      engine2.restore(snap);
      expect(engine2.fog.isEnabled()).toBe(true);
      expect(engine2.getUnitFogState(enemy)).toBe(FogTileState.VISIBLE);
    });
  });

  describe('Ally AI in fog', () => {
    it('ally AI only targets visible enemies when fog is enabled', () => {
      const grid = new Grid(15, 15);
      const allyCommander = new AllyCommander(grid, WEAPON_DB);
      const fog = new FogOfWar();
      fog.setEnabled(true);

      const ally = createTestUnit('a1', Faction.ALLY, 'lord', 5, 5);
      const visibleEnemy = createTestUnit('e1', Faction.ENEMY, 'brigand', 6, 5);
      const hiddenEnemy = createTestUnit('e2', Faction.ENEMY, 'brigand', 1, 1);

      fog.update([ally, visibleEnemy, hiddenEnemy], grid);

      const actions = allyCommander.planAllyTurn([ally], [visibleEnemy, hiddenEnemy], [], fog);
      const attackActions = actions.filter(a => a.type === 'attack');
      expect(attackActions.length).toBe(1);
      expect(attackActions[0].targetX).toBe(6);
      expect(attackActions[0].targetY).toBe(5);
    });

    it('ally AI does not target hidden enemies', () => {
      const grid = new Grid(15, 15);
      const allyCommander = new AllyCommander(grid, WEAPON_DB);
      const fog = new FogOfWar();
      fog.setEnabled(true);

      const ally = createTestUnit('a1', Faction.ALLY, 'lord', 5, 5);
      const hiddenEnemy = createTestUnit('e1', Faction.ENEMY, 'brigand', 10, 10);

      fog.update([ally, hiddenEnemy], grid);

      const actions = allyCommander.planAllyTurn([ally], [hiddenEnemy], [], fog);
      const attackActions = actions.filter(a => a.type === 'attack');
      expect(attackActions.length).toBe(0);
    });
  });

  describe('Combat preview in fog', () => {
    it('getCombatPreviewWithFog returns null for UNSEEN defender', () => {
      const engine = new GameEngine(15, 15);
      engine.fog.setEnabled(true);
      engine.addUnit('p1', 'Rowan', Faction.PLAYER, 'lord', createStats({
        hp: 20, maxHp: 20, str: 8, mag: 2, skl: 7, spd: 8, luk: 6, def: 6, res: 2, mov: 5,
      }), 1, 1);
      const enemy = engine.addUnit('e1', 'Bandit', Faction.ENEMY, 'brigand', createStats({
        hp: 26, maxHp: 26, str: 9, mag: 0, skl: 4, spd: 5, luk: 3, def: 5, res: 1, mov: 5,
      }), 10, 10);
      engine.updateFogOfWar();

      const player = engine.getUnit(1, 1)!;
      const result = engine.getCombatPreviewWithFog(player, enemy);
      expect(result).toBeNull();
    });

    it('getCombatPreviewWithFog returns preview and fogState for VISIBLE defender', () => {
      const engine = new GameEngine(15, 15);
      engine.fog.setEnabled(true);
      engine.addUnit('p1', 'Rowan', Faction.PLAYER, 'lord', createStats({
        hp: 20, maxHp: 20, str: 8, mag: 2, skl: 7, spd: 8, luk: 6, def: 6, res: 2, mov: 5,
      }), 5, 5);
      const enemy = engine.addUnit('e1', 'Bandit', Faction.ENEMY, 'brigand', createStats({
        hp: 26, maxHp: 26, str: 9, mag: 0, skl: 4, spd: 5, luk: 3, def: 5, res: 1, mov: 5,
      }), 6, 5);
      engine.updateFogOfWar();

      const player = engine.getUnit(5, 5)!;
      const result = engine.getCombatPreviewWithFog(player, enemy);
      expect(result).not.toBeNull();
      expect(result!.fogState).toBe(FogTileState.VISIBLE);
      expect(result!.preview.defender).not.toBeNull();
    });

    it('getCombatPreviewWithFog returns preview and DIMMED state for previously seen defender', () => {
      const engine = new GameEngine(15, 15);
      engine.fog.setEnabled(true);
      engine.addUnit('p1', 'Rowan', Faction.PLAYER, 'lord', createStats({
        hp: 20, maxHp: 20, str: 8, mag: 2, skl: 7, spd: 8, luk: 6, def: 6, res: 2, mov: 5,
      }), 5, 5);
      const enemy = engine.addUnit('e1', 'Bandit', Faction.ENEMY, 'brigand', createStats({
        hp: 26, maxHp: 26, str: 9, mag: 0, skl: 4, spd: 5, luk: 3, def: 5, res: 1, mov: 5,
      }), 7, 5);
      engine.updateFogOfWar();
      // Move player away so enemy becomes DIMMED
      const player = engine.getUnit(5, 5)!;
      engine.moveUnit(player, 1, 1);
      engine.updateFogOfWar();

      const result = engine.getCombatPreviewWithFog(player, enemy);
      expect(result).not.toBeNull();
      expect(result!.fogState).toBe(FogTileState.DIMMED);
    });

    it('getCombatPreviewWithFog returns partial=true for DIMMED defender', () => {
      const engine = new GameEngine(15, 15);
      engine.fog.setEnabled(true);
      engine.addUnit('p1', 'Rowan', Faction.PLAYER, 'lord', createStats({
        hp: 20, maxHp: 20, str: 8, mag: 2, skl: 7, spd: 8, luk: 6, def: 6, res: 2, mov: 5,
      }), 5, 5);
      const enemy = engine.addUnit('e1', 'Bandit', Faction.ENEMY, 'brigand', createStats({
        hp: 26, maxHp: 26, str: 9, mag: 0, skl: 4, spd: 5, luk: 3, def: 5, res: 1, mov: 5,
      }), 7, 5);
      engine.updateFogOfWar();
      const player = engine.getUnit(5, 5)!;
      engine.moveUnit(player, 1, 1);
      engine.updateFogOfWar();

      const result = engine.getCombatPreviewWithFog(player, enemy);
      expect(result).not.toBeNull();
      expect(result!.partial).toBe(true);
    });

    it('getCombatPreviewWithFog returns partial=false for VISIBLE defender', () => {
      const engine = new GameEngine(15, 15);
      engine.fog.setEnabled(true);
      engine.addUnit('p1', 'Rowan', Faction.PLAYER, 'lord', createStats({
        hp: 20, maxHp: 20, str: 8, mag: 2, skl: 7, spd: 8, luk: 6, def: 6, res: 2, mov: 5,
      }), 5, 5);
      const enemy = engine.addUnit('e1', 'Bandit', Faction.ENEMY, 'brigand', createStats({
        hp: 26, maxHp: 26, str: 9, mag: 0, skl: 4, spd: 5, luk: 3, def: 5, res: 1, mov: 5,
      }), 6, 5);
      engine.updateFogOfWar();

      const player = engine.getUnit(5, 5)!;
      const result = engine.getCombatPreviewWithFog(player, enemy);
      expect(result).not.toBeNull();
      expect(result!.partial).toBe(false);
    });
  });

  describe('Enemy threat in fog', () => {
    it('getEnemyThreatInFog returns null for UNSEEN enemy', () => {
      const engine = new GameEngine(15, 15);
      engine.fog.setEnabled(true);
      engine.addUnit('p1', 'Rowan', Faction.PLAYER, 'lord', createStats({
        hp: 20, maxHp: 20, str: 8, mag: 2, skl: 7, spd: 8, luk: 6, def: 6, res: 2, mov: 5,
      }), 1, 1);
      const enemy = engine.addUnit('e1', 'Bandit', Faction.ENEMY, 'brigand', createStats({
        hp: 26, maxHp: 26, str: 9, mag: 0, skl: 4, spd: 5, luk: 3, def: 5, res: 1, mov: 5,
      }), 10, 10);
      engine.updateFogOfWar();

      const threat = engine.getEnemyThreatInFog(enemy);
      expect(threat).toBeNull();
    });

    it('getEnemyThreatInFog returns null for DIMMED enemy', () => {
      const engine = new GameEngine(15, 15);
      engine.fog.setEnabled(true);
      engine.addUnit('p1', 'Rowan', Faction.PLAYER, 'lord', createStats({
        hp: 20, maxHp: 20, str: 8, mag: 2, skl: 7, spd: 8, luk: 6, def: 6, res: 2, mov: 5,
      }), 5, 5);
      const enemy = engine.addUnit('e1', 'Bandit', Faction.ENEMY, 'brigand', createStats({
        hp: 26, maxHp: 26, str: 9, mag: 0, skl: 4, spd: 5, luk: 3, def: 5, res: 1, mov: 5,
      }), 7, 5);
      engine.updateFogOfWar();
      const player = engine.getUnit(5, 5)!;
      engine.moveUnit(player, 1, 1);
      engine.updateFogOfWar();

      const threat = engine.getEnemyThreatInFog(enemy);
      expect(threat).toBeNull();
    });

    it('getEnemyThreatInFog returns threat stats for VISIBLE enemy', () => {
      const engine = new GameEngine(15, 15);
      engine.fog.setEnabled(true);
      engine.addUnit('p1', 'Rowan', Faction.PLAYER, 'lord', createStats({
        hp: 20, maxHp: 20, str: 8, mag: 2, skl: 7, spd: 8, luk: 6, def: 6, res: 2, mov: 5,
      }), 5, 5);
      const enemy = engine.addUnit('e1', 'Bandit', Faction.ENEMY, 'brigand', createStats({
        hp: 26, maxHp: 26, str: 9, mag: 0, skl: 4, spd: 5, luk: 3, def: 5, res: 1, mov: 5,
      }), 6, 5);
      engine.updateFogOfWar();

      const threat = engine.getEnemyThreatInFog(enemy);
      expect(threat).not.toBeNull();
      expect(threat!.damage).toBeGreaterThan(0);
    });

    it('getEnemyThreatInFog picks the nearest player unit as threat target', () => {
      const engine = new GameEngine(15, 15);
      engine.fog.setEnabled(true);
      // Add far unit first (so old code would pick this one)
      engine.addUnit('p1', 'Far', Faction.PLAYER, 'lord', createStats({
        hp: 20, maxHp: 20, str: 8, mag: 2, skl: 7, spd: 8, luk: 6, def: 1, res: 2, mov: 5,
      }), 1, 1);
      // Add near unit second
      engine.addUnit('p2', 'Near', Faction.PLAYER, 'lord', createStats({
        hp: 20, maxHp: 20, str: 8, mag: 2, skl: 7, spd: 8, luk: 6, def: 10, res: 2, mov: 5,
      }), 6, 5);
      const enemy = engine.addUnit('e1', 'Bandit', Faction.ENEMY, 'brigand', createStats({
        hp: 26, maxHp: 26, str: 9, mag: 0, skl: 4, spd: 5, luk: 3, def: 5, res: 1, mov: 5,
      }), 5, 5);
      engine.updateFogOfWar();

      const threat = engine.getEnemyThreatInFog(enemy);
      expect(threat).not.toBeNull();
      // Enemy brigand uses Iron Axe (mt 8). str 9 + mt 8 + triangle(-1 vs sword) = 16 base.
      // Against def 10 (near unit): damage = 16 - 10 = 6
      // Against def 1 (far unit): damage = 16 - 1 = 15
      // Nearest unit has def 10, so damage should be 6.
      expect(threat!.damage).toBe(6);
    });
  });

  describe('Camera sight bounds', () => {
    it('getCameraSightBounds returns null when fog is disabled', () => {
      const engine = new GameEngine(15, 15);
      engine.fog.setEnabled(false);
      engine.addUnit('p1', 'Rowan', Faction.PLAYER, 'lord', createStats({
        hp: 20, maxHp: 20, str: 8, mag: 2, skl: 7, spd: 8, luk: 6, def: 6, res: 2, mov: 5,
      }), 5, 5);
      engine.updateFogOfWar();

      const bounds = engine.getCameraSightBounds();
      expect(bounds).toBeNull();
    });

    it('getCameraSightBounds returns bounds of visible tiles', () => {
      const engine = new GameEngine(15, 15);
      engine.fog.setEnabled(true);
      engine.addUnit('p1', 'Rowan', Faction.PLAYER, 'lord', createStats({
        hp: 20, maxHp: 20, str: 8, mag: 2, skl: 7, spd: 8, luk: 6, def: 6, res: 2, mov: 5,
      }), 5, 5);
      engine.updateFogOfWar();

      const bounds = engine.getCameraSightBounds();
      expect(bounds).not.toBeNull();
      expect(bounds!.minX).toBeLessThanOrEqual(5);
      expect(bounds!.maxX).toBeGreaterThanOrEqual(5);
      expect(bounds!.minY).toBeLessThanOrEqual(5);
      expect(bounds!.maxY).toBeGreaterThanOrEqual(5);
    });

    it('getCameraSightBounds includes DIMMED tiles', () => {
      const engine = new GameEngine(15, 15);
      engine.fog.setEnabled(true);
      engine.addUnit('p1', 'Rowan', Faction.PLAYER, 'lord', createStats({
        hp: 20, maxHp: 20, str: 8, mag: 2, skl: 7, spd: 8, luk: 6, def: 6, res: 2, mov: 5,
      }), 5, 5);
      engine.updateFogOfWar();
      const bounds1 = engine.getCameraSightBounds()!;

      engine.moveUnit(engine.getUnit(5, 5)!, 10, 10);
      engine.updateFogOfWar();
      const bounds2 = engine.getCameraSightBounds()!;

      // bounds2 should still include the old visible area (now dimmed) plus new visible area
      expect(bounds2.minX).toBeLessThanOrEqual(bounds1.minX);
      expect(bounds2.maxX).toBeGreaterThanOrEqual(bounds1.maxX);
    });
  });

  describe('Adjacent enemies with fog', () => {
    it('getAdjacentEnemies includes VISIBLE enemies when fog is enabled', () => {
      const engine = new GameEngine(15, 15);
      engine.fog.setEnabled(true);
      const player = engine.addUnit('p1', 'Rowan', Faction.PLAYER, 'lord', createStats({
        hp: 20, maxHp: 20, str: 8, mag: 2, skl: 7, spd: 8, luk: 6, def: 6, res: 2, mov: 5,
      }), 5, 5);
      engine.addUnit('e1', 'Bandit', Faction.ENEMY, 'brigand', createStats({
        hp: 26, maxHp: 26, str: 9, mag: 0, skl: 4, spd: 5, luk: 3, def: 5, res: 1, mov: 5,
      }), 6, 5);
      engine.updateFogOfWar();

      const enemies = engine.getAdjacentEnemies(player);
      expect(enemies.length).toBe(1);
    });

    it('getAdjacentEnemies ignores fog when disabled', () => {
      const engine = new GameEngine(15, 15);
      engine.fog.setEnabled(false);
      const player = engine.addUnit('p1', 'Rowan', Faction.PLAYER, 'lord', createStats({
        hp: 20, maxHp: 20, str: 8, mag: 2, skl: 7, spd: 8, luk: 6, def: 6, res: 2, mov: 5,
      }), 1, 1);
      engine.addUnit('e1', 'Bandit', Faction.ENEMY, 'brigand', createStats({
        hp: 26, maxHp: 26, str: 9, mag: 0, skl: 4, spd: 5, luk: 3, def: 5, res: 1, mov: 5,
      }), 2, 1);
      engine.updateFogOfWar();

      const enemies = engine.getAdjacentEnemies(player);
      expect(enemies.length).toBe(1);
    });
  });

  describe('Turn-based fog refresh', () => {
    it('endTurn updates fog after advancing to enemy phase', () => {
      const engine = new GameEngine(15, 15);
      engine.fog.setEnabled(true);
      engine.addUnit('p1', 'Rowan', Faction.PLAYER, 'lord', createStats({
        hp: 20, maxHp: 20, str: 8, mag: 2, skl: 7, spd: 8, luk: 6, def: 6, res: 2, mov: 5,
      }), 5, 5);
      const enemy = engine.addUnit('e1', 'Bandit', Faction.ENEMY, 'brigand', createStats({
        hp: 26, maxHp: 26, str: 9, mag: 0, skl: 4, spd: 5, luk: 3, def: 5, res: 1, mov: 5,
      }), 10, 10);
      engine.updateFogOfWar();
      expect(engine.getUnitFogState(enemy)).toBe(FogTileState.UNSEEN);

      // Move enemy into player sight range
      engine.moveUnit(enemy, 6, 5);
      engine.endTurn(); // player -> enemy, fog should update with player units' sight
      expect(engine.getUnitFogState(enemy)).toBe(FogTileState.VISIBLE);
    });

    it('endTurn updates fog after advancing to ally phase', () => {
      const engine = new GameEngine(15, 15);
      engine.fog.setEnabled(true);
      engine.addUnit('p1', 'Rowan', Faction.PLAYER, 'lord', createStats({
        hp: 20, maxHp: 20, str: 8, mag: 2, skl: 7, spd: 8, luk: 6, def: 6, res: 2, mov: 5,
      }), 5, 5);
      const ally = engine.addUnit('a1', 'Ally', Faction.ALLY, 'mercenary', createStats({
        hp: 20, maxHp: 20, str: 8, mag: 2, skl: 7, spd: 8, luk: 6, def: 6, res: 2, mov: 5,
      }), 10, 10);
      engine.updateFogOfWar();
      expect(engine.getUnitFogState(ally)).toBe(FogTileState.UNSEEN);

      // Move ally into player sight range before ending player turn
      engine.moveUnit(ally, 6, 5);
      engine.endTurn(); // player -> enemy
      engine.endTurn(); // enemy -> ally, fog updates with enemy units' sight
      // Ally is now at (6,5), visible to player at (5,5) with sight 3
      expect(engine.getUnitFogState(ally)).toBe(FogTileState.VISIBLE);
    });
  });

  describe('FogOfWar isUnitRevealed', () => {
    let fog: FogOfWar;
    let grid: Grid;

    beforeEach(() => {
      fog = new FogOfWar();
      fog.setEnabled(true);
      grid = new Grid(15, 15);
    });

    it('returns true for VISIBLE unit', () => {
      const player = createTestUnit('p1', Faction.PLAYER, 'lord', 5, 5);
      const enemy = createTestUnit('e1', Faction.ENEMY, 'brigand', 6, 5);
      fog.update([player, enemy], grid);
      expect((fog as any).isUnitRevealed(enemy, Faction.PLAYER)).toBe(true);
    });

    it('returns true for DIMMED unit', () => {
      const player = createTestUnit('p1', Faction.PLAYER, 'lord', 5, 5);
      const enemy = createTestUnit('e1', Faction.ENEMY, 'brigand', 7, 5);
      fog.update([player, enemy], grid);
      player.moveTo(10, 10);
      fog.update([player, enemy], grid);
      expect((fog as any).isUnitRevealed(enemy, Faction.PLAYER)).toBe(true);
    });

    it('returns false for UNSEEN unit', () => {
      const player = createTestUnit('p1', Faction.PLAYER, 'lord', 1, 1);
      const enemy = createTestUnit('e1', Faction.ENEMY, 'brigand', 10, 10);
      fog.update([player, enemy], grid);
      expect((fog as any).isUnitRevealed(enemy, Faction.PLAYER)).toBe(false);
    });

    it('returns true for any unit when fog is disabled', () => {
      fog.setEnabled(false);
      const player = createTestUnit('p1', Faction.PLAYER, 'lord', 1, 1);
      const enemy = createTestUnit('e1', Faction.ENEMY, 'brigand', 10, 10);
      fog.update([player, enemy], grid);
      expect((fog as any).isUnitRevealed(enemy, Faction.PLAYER)).toBe(true);
    });
  });

  describe('GameEngine isUnitRevealedToPlayer', () => {
    it('returns true for VISIBLE enemy', () => {
      const engine = new GameEngine(15, 15);
      engine.fog.setEnabled(true);
      engine.addUnit('p1', 'Rowan', Faction.PLAYER, 'lord', createStats({
        hp: 20, maxHp: 20, str: 8, mag: 2, skl: 7, spd: 8, luk: 6, def: 6, res: 2, mov: 5,
      }), 5, 5);
      const enemy = engine.addUnit('e1', 'Bandit', Faction.ENEMY, 'brigand', createStats({
        hp: 26, maxHp: 26, str: 9, mag: 0, skl: 4, spd: 5, luk: 3, def: 5, res: 1, mov: 5,
      }), 6, 5);
      engine.updateFogOfWar();
      expect(engine.isUnitRevealedToPlayer(enemy)).toBe(true);
    });

    it('returns true for DIMMED enemy', () => {
      const engine = new GameEngine(15, 15);
      engine.fog.setEnabled(true);
      engine.addUnit('p1', 'Rowan', Faction.PLAYER, 'lord', createStats({
        hp: 20, maxHp: 20, str: 8, mag: 2, skl: 7, spd: 8, luk: 6, def: 6, res: 2, mov: 5,
      }), 5, 5);
      const enemy = engine.addUnit('e1', 'Bandit', Faction.ENEMY, 'brigand', createStats({
        hp: 26, maxHp: 26, str: 9, mag: 0, skl: 4, spd: 5, luk: 3, def: 5, res: 1, mov: 5,
      }), 7, 5);
      engine.updateFogOfWar();
      const player = engine.getUnit(5, 5)!;
      engine.moveUnit(player, 1, 1);
      engine.updateFogOfWar();
      expect(engine.isUnitRevealedToPlayer(enemy)).toBe(true);
    });

    it('returns false for UNSEEN enemy', () => {
      const engine = new GameEngine(15, 15);
      engine.fog.setEnabled(true);
      engine.addUnit('p1', 'Rowan', Faction.PLAYER, 'lord', createStats({
        hp: 20, maxHp: 20, str: 8, mag: 2, skl: 7, spd: 8, luk: 6, def: 6, res: 2, mov: 5,
      }), 1, 1);
      const enemy = engine.addUnit('e1', 'Bandit', Faction.ENEMY, 'brigand', createStats({
        hp: 26, maxHp: 26, str: 9, mag: 0, skl: 4, spd: 5, luk: 3, def: 5, res: 1, mov: 5,
      }), 10, 10);
      engine.updateFogOfWar();
      expect(engine.isUnitRevealedToPlayer(enemy)).toBe(false);
    });
  });

  describe('getAdjacentEnemies fog filtering', () => {
    it('excludes UNSEEN enemies when fog is enabled', () => {
      const engine = new GameEngine(15, 15);
      engine.fog.setEnabled(true);
      const player = engine.addUnit('p1', 'Rowan', Faction.PLAYER, 'lord', createStats({
        hp: 20, maxHp: 20, str: 8, mag: 2, skl: 7, spd: 8, luk: 6, def: 6, res: 2, mov: 5,
      }), 5, 5);
      engine.addUnit('e1', 'Bandit', Faction.ENEMY, 'brigand', createStats({
        hp: 26, maxHp: 26, str: 9, mag: 0, skl: 4, spd: 5, luk: 3, def: 5, res: 1, mov: 5,
      }), 6, 5);
      engine.updateFogOfWar();
      // Force enemy tile to UNSEEN to test filter independently of geometry
      (engine.fog as any).playerVisibility.set('6,5', FogTileState.UNSEEN);
      const enemies = engine.getAdjacentEnemies(player);
      expect(enemies.length).toBe(0);
    });

    it('includes DIMMED enemies when fog is enabled', () => {
      const engine = new GameEngine(15, 15);
      engine.fog.setEnabled(true);
      const player = engine.addUnit('p1', 'Rowan', Faction.PLAYER, 'lord', createStats({
        hp: 20, maxHp: 20, str: 8, mag: 2, skl: 7, spd: 8, luk: 6, def: 6, res: 2, mov: 5,
      }), 5, 5);
      engine.addUnit('e1', 'Bandit', Faction.ENEMY, 'brigand', createStats({
        hp: 26, maxHp: 26, str: 9, mag: 0, skl: 4, spd: 5, luk: 3, def: 5, res: 1, mov: 5,
      }), 6, 5);
      engine.updateFogOfWar();
      // Force enemy tile to DIMMED to test filter independently of geometry
      (engine.fog as any).playerVisibility.set('6,5', FogTileState.DIMMED);
      const enemies = engine.getAdjacentEnemies(player);
      expect(enemies.length).toBe(1);
    });

    it('includes all enemies when fog is disabled', () => {
      const engine = new GameEngine(15, 15);
      engine.fog.setEnabled(false);
      const player = engine.addUnit('p1', 'Rowan', Faction.PLAYER, 'lord', createStats({
        hp: 20, maxHp: 20, str: 8, mag: 2, skl: 7, spd: 8, luk: 6, def: 6, res: 2, mov: 5,
      }), 1, 1);
      engine.addUnit('e1', 'Bandit', Faction.ENEMY, 'brigand', createStats({
        hp: 26, maxHp: 26, str: 9, mag: 0, skl: 4, spd: 5, luk: 3, def: 5, res: 1, mov: 5,
      }), 2, 1);
      engine.updateFogOfWar();
      const enemies = engine.getAdjacentEnemies(player);
      expect(enemies.length).toBe(1);
    });
  });
});
