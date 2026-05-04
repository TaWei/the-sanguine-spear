import { describe, it, expect } from 'vitest';
import { GameEngine } from '../GameEngine';
import { getLevel } from '../levels/LevelData';

describe('Elara staff', () => {
  it('starts with Heal staff in Level 1', () => {
    const engine = new GameEngine(10, 10);
    const level = getLevel('level-1');
    expect(level).toBeDefined();
    engine.loadLevel(level!);
    const elara = engine.getAllUnits().find((u) => u.name === 'Elara');
    expect(elara).toBeDefined();
    expect(elara!.inventory.items.some((i) => i.kind === 'staff' && i.name === 'Heal')).toBe(true);
  });

  it('starts with Heal staff in Level 2', () => {
    const engine = new GameEngine(10, 10);
    const level = getLevel('level-2');
    expect(level).toBeDefined();
    engine.loadLevel(level!);
    const elara = engine.getAllUnits().find((u) => u.name === 'Elara');
    expect(elara).toBeDefined();
    expect(elara!.inventory.items.some((i) => i.kind === 'staff' && i.name === 'Heal')).toBe(true);
  });
});
