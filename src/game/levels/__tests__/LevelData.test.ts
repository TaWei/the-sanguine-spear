import { describe, it, expect } from 'vitest';
import { getLevel, getNextLevelId } from '../LevelData';

describe('LevelData', () => {
  it('has level 1 defined', () => {
    const level1 = getLevel('level-1');
    expect(level1).toBeDefined();
    expect(level1!.name).toBe('The Sanguine Plains');
    expect(level1!.units.length).toBeGreaterThan(0);
  });

  it('has level 2 defined', () => {
    const level2 = getLevel('level-2');
    expect(level2).toBeDefined();
    expect(level2!.name).toBe('The Molten Pass');
    expect(level2!.units.length).toBeGreaterThan(0);
  });

  it('has level 3 defined', () => {
    const level3 = getLevel('level-3');
    expect(level3).toBeDefined();
    expect(level3!.name).toBe('The Sunken Temple');
    expect(level3!.units.length).toBeGreaterThan(0);
  });

  it('has level 4 defined', () => {
    const level4 = getLevel('level-4');
    expect(level4).toBeDefined();
    expect(level4!.name).toBe('The Verdant Forest');
    expect(level4!.units.length).toBe(9); // 3 player + 6 enemy
    expect(level4!.cols).toBe(16);
    expect(level4!.rows).toBe(12);
  });

  it('has level 5 defined', () => {
    const level5 = getLevel('level-5');
    expect(level5).toBeDefined();
    expect(level5!.name).toBe('The Iron Bridge');
    expect(level5!.units.length).toBe(10); // 4 player + 6 enemy
    expect(level5!.cols).toBe(16);
    expect(level5!.rows).toBe(12);
  });

  it('has level 6 defined', () => {
    const level6 = getLevel('level-6');
    expect(level6).toBeDefined();
    expect(level6!.name).toBe('The Siege of Fort Granius');
    expect(level6!.units.length).toBe(11); // 4 player + 7 enemy
    expect(level6!.cols).toBe(16);
    expect(level6!.rows).toBe(12);
    expect(level6!.reinforcements).toBeDefined();
    expect(level6!.reinforcements!.length).toBe(1);
    expect(level6!.reinforcements![0].spawnTurn).toBe(4);
  });

  it('has level 7 defined', () => {
    const level7 = getLevel('level-7');
    expect(level7).toBeDefined();
    expect(level7!.name).toBe('The Canyon Escape');
    expect(level7!.units.length).toBe(13); // 5 player + 8 enemy
    expect(level7!.cols).toBe(20);
    expect(level7!.rows).toBe(12);
    expect(level7!.objectives).toBeDefined();
    expect(level7!.objectives![0].type).toBe('escape');
    expect(level7!.reinforcements).toBeDefined();
    expect(level7!.reinforcements!.length).toBe(3);
  });

  it('has level 8 defined', () => {
    const level8 = getLevel('level-8');
    expect(level8).toBeDefined();
    expect(level8!.name).toBe('The Fog of Ruins');
    expect(level8!.units.length).toBe(10); // 4 player + 6 enemy
    expect(level8!.cols).toBe(16);
    expect(level8!.rows).toBe(12);
    expect(level8!.objectives).toBeDefined();
    expect(level8!.objectives![0].type).toBe('rout');
  });

  it('has level 9 defined', () => {
    const level9 = getLevel('level-9');
    expect(level9).toBeDefined();
    expect(level9!.name).toBe('The Coastal Siege');
    expect(level9!.units.length).toBe(11); // 4 player + 2 ally + 5 enemy
    expect(level9!.cols).toBe(20);
    expect(level9!.rows).toBe(14);
    expect(level9!.objectives).toBeDefined();
    expect(level9!.objectives![0].type).toBe('rout');
    expect(level9!.objectives![0].allyMustSurvive).toBe(true);
    const allyCount = level9!.units.filter((u) => u.faction === 'ally').length;
    expect(allyCount).toBe(2);
    const enemyCount = level9!.units.filter((u) => u.faction === 'enemy').length;
    expect(enemyCount).toBe(5);
  });

  it('has level 10 defined', () => {
    const level10 = getLevel('level-10');
    expect(level10).toBeDefined();
    expect(level10!.name).toBe('The Thornwood Ambush');
    expect(level10!.units.length).toBe(15); // 5 player + 10 enemy
    expect(level10!.cols).toBe(16);
    expect(level10!.rows).toBe(12);
    expect(level10!.objectives).toBeDefined();
    expect(level10!.objectives![0].type).toBe('rout');
    const playerCount = level10!.units.filter((u) => u.faction === 'player').length;
    expect(playerCount).toBe(5);
    const enemyCount = level10!.units.filter((u) => u.faction === 'enemy').length;
    expect(enemyCount).toBe(10);
    const soldierCount = level10!.units.filter(
      (u) => u.faction === 'enemy' && u.unitClass === 'soldier',
    ).length;
    expect(soldierCount).toBe(3);
    const archerCount = level10!.units.filter(
      (u) => u.faction === 'enemy' && u.unitClass === 'archer',
    ).length;
    expect(archerCount).toBe(3);
    const mageCount = level10!.units.filter(
      (u) => u.faction === 'enemy' && u.unitClass === 'mage',
    ).length;
    expect(mageCount).toBe(2);
  });

  it('has level 11 defined', () => {
    const level11 = getLevel('level-11');
    expect(level11).toBeDefined();
    expect(level11!.name).toBe('The Hall of the Mountain King');
    expect(level11!.units.length).toBe(12); // 5 player + 7 enemy
    expect(level11!.cols).toBe(16);
    expect(level11!.rows).toBe(14);
    expect(level11!.objectives).toBeDefined();
    expect(level11!.objectives![0].type).toBe('rout');
    const playerCount = level11!.units.filter((u) => u.faction === 'player').length;
    expect(playerCount).toBe(5);
    const enemyCount = level11!.units.filter((u) => u.faction === 'enemy').length;
    expect(enemyCount).toBe(7);
    const soldierCount = level11!.units.filter(
      (u) => u.faction === 'enemy' && u.unitClass === 'soldier',
    ).length;
    expect(soldierCount).toBe(3);
    const archerCount = level11!.units.filter(
      (u) => u.faction === 'enemy' && u.unitClass === 'archer',
    ).length;
    expect(archerCount).toBe(2);
    const mageCount = level11!.units.filter(
      (u) => u.faction === 'enemy' && u.unitClass === 'mage',
    ).length;
    expect(mageCount).toBe(1);
    const boss = level11!.units.find((u) => u.faction === 'enemy' && u.name === 'General Boros');
    expect(boss).toBeDefined();
    expect(boss!.unitClass).toBe('mercenary');
  });

  it("has level 12 defined", () => {
    const level12 = getLevel('level-12');
    expect(level12).toBeDefined();
    expect(level12!.name).toBe("The Battle of Karra's Gate");
    expect(level12!.units.length).toBe(14); // 6 player + 8 enemy
    expect(level12!.cols).toBe(24);
    expect(level12!.rows).toBe(16);
    expect(level12!.objectives).toBeDefined();
    expect(level12!.objectives![0].type).toBe('rout');
    const playerCount = level12!.units.filter((u) => u.faction === 'player').length;
    expect(playerCount).toBe(6);
    const enemyCount = level12!.units.filter((u) => u.faction === 'enemy').length;
    expect(enemyCount).toBe(8);
    const cavalryCount = level12!.units.filter(
      (u) => u.faction === 'enemy' && u.unitClass === 'cavalry',
    ).length;
    expect(cavalryCount).toBe(4); // 3 lancers + Captain Voss
    const archerCount = level12!.units.filter(
      (u) => u.faction === 'enemy' && u.unitClass === 'archer',
    ).length;
    expect(archerCount).toBe(2);
    const mageCount = level12!.units.filter(
      (u) => u.faction === 'enemy' && u.unitClass === 'mage',
    ).length;
    expect(mageCount).toBe(1);
    const soldierCount = level12!.units.filter(
      (u) => u.faction === 'enemy' && u.unitClass === 'soldier',
    ).length;
    expect(soldierCount).toBe(1);
    const boss = level12!.units.find((u) => u.faction === 'enemy' && u.name === 'Captain Voss');
    expect(boss).toBeDefined();
    expect(boss!.unitClass).toBe('cavalry');
  });

  it("has level 13 defined", () => {
    const level13 = getLevel('level-13');
    expect(level13).toBeDefined();
    expect(level13!.name).toBe('The Crimson Throne (Finale)');
    expect(level13!.units.length).toBe(22); // 6 player + 2 ally + 14 enemy
    expect(level13!.cols).toBe(100);
    expect(level13!.rows).toBe(60);
    expect(level13!.objectives).toBeDefined();
    expect(level13!.objectives!.length).toBe(2);
    expect(level13!.objectives![0].type).toBe('seize');
    expect(level13!.objectives![1].type).toBe('seize');
    const playerCount = level13!.units.filter((u) => u.faction === 'player').length;
    expect(playerCount).toBe(6);
    const allyCount = level13!.units.filter((u) => u.faction === 'ally').length;
    expect(allyCount).toBe(2);
    const enemyCount = level13!.units.filter((u) => u.faction === 'enemy').length;
    expect(enemyCount).toBe(14);
    const lordCount = level13!.units.filter((u) => u.unitClass === 'lord').length;
    expect(lordCount).toBe(2); // Rowan + Aldric
    expect(level13!.reinforcements).toBeDefined();
    expect(level13!.reinforcements!.length).toBe(2);
    expect(level13!.reinforcements![0].spawnTurn).toBe(6);
    expect(level13!.reinforcements![1].spawnTurn).toBe(10);
  });

  it('returns undefined for unknown level', () => {
    expect(getLevel('nonexistent')).toBeUndefined();
  });

  it('getNextLevelId returns the next level ID', () => {
    expect(getNextLevelId('level-1')).toBe('level-2');
    expect(getNextLevelId('level-3')).toBe('level-4');
    expect(getNextLevelId('level-4')).toBe('level-5');
    expect(getNextLevelId('level-5')).toBe('level-6');
    expect(getNextLevelId('level-6')).toBe('level-7');
    expect(getNextLevelId('level-7')).toBe('level-8');
    expect(getNextLevelId('level-8')).toBe('level-9');
    expect(getNextLevelId('level-9')).toBe('level-10');
    expect(getNextLevelId('level-10')).toBe('level-11');
    expect(getNextLevelId('level-11')).toBe('level-12');
    expect(getNextLevelId('level-12')).toBe('level-13');
  });

  it('getNextLevelId returns null for the last level', () => {
    expect(getNextLevelId('level-13')).toBeNull();
  });

  it('getNextLevelId returns null for unknown level', () => {
    expect(getNextLevelId('nonexistent')).toBeNull();
  });
});
