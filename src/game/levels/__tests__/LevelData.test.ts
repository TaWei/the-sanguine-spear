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

  it('returns undefined for unknown level', () => {
    expect(getLevel('nonexistent')).toBeUndefined();
  });

  it('getNextLevelId returns the next level ID', () => {
    expect(getNextLevelId('level-1')).toBe('level-2');
  });

  it('getNextLevelId returns null for the last level', () => {
    expect(getNextLevelId('level-2')).toBeNull();
  });

  it('getNextLevelId returns null for unknown level', () => {
    expect(getNextLevelId('nonexistent')).toBeNull();
  });
});
