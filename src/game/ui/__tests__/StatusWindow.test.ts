import { describe, it, expect } from 'vitest';
import { StatusWindow, StatusDisplay } from '../StatusWindow';
import { Unit, Faction, UnitClass } from '../../units/Unit';
import { createStats } from '../../units/Stats';

describe('StatusWindow', () => {
  const stats = createStats({
    hp: 20,
    maxHp: 25,
    str: 5,
    mag: 5,
    skl: 5,
    spd: 5,
    luk: 5,
    def: 5,
    res: 5,
    mov: 5,
  });
  const player = new Unit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, stats, 5, 5, { level: 5 });

  it('is inactive by default', () => {
    const window = new StatusWindow();
    expect(window.isActive).toBe(false);
    expect(window.unit).toBeNull();
    expect(window.displayStats).toBeNull();
  });

  it('opens with a unit', () => {
    const window = new StatusWindow();
    window.open(player);
    expect(window.isActive).toBe(true);
    expect(window.unit).toBe(player);
  });

  it('produces displayStats with all fields', () => {
    const window = new StatusWindow();
    window.open(player);
    const display = window.displayStats;
    expect(display).not.toBeNull();
    expect(display!.name).toBe('Rowan');
    expect(display!.unitClass).toBe('lord');
    expect(display!.level).toBe(5);
    expect(display!.hp).toBe(20);
    expect(display!.maxHp).toBe(25);
    expect(display!.str).toBe(5);
    expect(display!.mag).toBe(5);
    expect(display!.skl).toBe(5);
    expect(display!.spd).toBe(5);
    expect(display!.luk).toBe(5);
    expect(display!.def).toBe(5);
    expect(display!.res).toBe(5);
    expect(display!.mov).toBe(5);
  });

  it('closes and clears unit', () => {
    const window = new StatusWindow();
    window.open(player);
    expect(window.isActive).toBe(true);
    window.close();
    expect(window.isActive).toBe(false);
    expect(window.unit).toBeNull();
    expect(window.displayStats).toBeNull();
  });
});
