import { describe, it, expect } from 'vitest';
import { TradeMenu, TradeMenuState } from '../TradeMenu';
import { Unit, Faction, UnitClass } from '../../units/Unit';
import { createStats } from '../../units/Stats';
import { createWeaponItem, createRecoveryItem } from '../../items/ItemTypes';

function makeUnit(name: string): Unit {
  const stats = createStats({
    hp: 20, str: 5, mag: 5, skl: 5, spd: 5, luk: 5, def: 5, res: 5, mov: 5,
  });
  return new Unit(name.toLowerCase(), name, Faction.PLAYER, UnitClass.LORD, stats, 0, 0);
}

describe('TradeMenu', () => {
  it('starts inactive', () => {
    const menu = new TradeMenu();
    expect(menu.state).toBe(TradeMenuState.INACTIVE);
    expect(menu.isActive).toBe(false);
    expect(menu.leftUnit).toBeNull();
    expect(menu.rightUnit).toBeNull();
    expect(menu.leftSelectedIndex).toBe(-1);
    expect(menu.rightSelectedIndex).toBe(-1);
  });

  it('opens with both units inventories', () => {
    const left = makeUnit('Rowan');
    left.inventory.add(createWeaponItem('Iron Sword', 'sword', 5, 90, 0, 1, 1, false));
    left.inventory.add(createRecoveryItem('Vulnerary', 10));

    const right = makeUnit('Lyn');
    right.inventory.add(createWeaponItem('Iron Lance', 'lance', 6, 80, 0, 1, 1, false));

    const menu = new TradeMenu();
    menu.open(left, right);

    expect(menu.state).toBe(TradeMenuState.SELECT_LEFT);
    expect(menu.isActive).toBe(true);
    expect(menu.leftUnit).toBe(left);
    expect(menu.rightUnit).toBe(right);
    expect(menu.leftItems).toHaveLength(2);
    expect(menu.rightItems).toHaveLength(1);
    expect(menu.leftSelectedIndex).toBe(-1);
    expect(menu.rightSelectedIndex).toBe(-1);
  });

  it('selectLeftItem transitions to select right', () => {
    const left = makeUnit('Rowan');
    left.inventory.add(createWeaponItem('Iron Sword', 'sword', 5, 90, 0, 1, 1, false));
    const right = makeUnit('Lyn');

    const menu = new TradeMenu();
    menu.open(left, right);
    menu.selectLeftItem(0);

    expect(menu.state).toBe(TradeMenuState.SELECT_RIGHT);
    expect(menu.leftSelectedIndex).toBe(0);
  });

  it('selectRightItem with -1 means gift', () => {
    const left = makeUnit('Rowan');
    left.inventory.add(createWeaponItem('Iron Sword', 'sword', 5, 90, 0, 1, 1, false));
    const right = makeUnit('Lyn');

    const menu = new TradeMenu();
    menu.open(left, right);
    menu.selectLeftItem(0);
    menu.selectRightItem(-1);

    expect(menu.state).toBe(TradeMenuState.RESOLVED);
    expect(menu.rightSelectedIndex).toBe(-1);
  });

  it('selectRightItem with valid index means swap', () => {
    const left = makeUnit('Rowan');
    left.inventory.add(createWeaponItem('Iron Sword', 'sword', 5, 90, 0, 1, 1, false));
    const right = makeUnit('Lyn');
    right.inventory.add(createWeaponItem('Iron Lance', 'lance', 6, 80, 0, 1, 1, false));

    const menu = new TradeMenu();
    menu.open(left, right);
    menu.selectLeftItem(0);
    menu.selectRightItem(0);

    expect(menu.state).toBe(TradeMenuState.RESOLVED);
    expect(menu.rightSelectedIndex).toBe(0);
  });

  it('cancel from select right returns to select left', () => {
    const left = makeUnit('Rowan');
    left.inventory.add(createWeaponItem('Iron Sword', 'sword', 5, 90, 0, 1, 1, false));
    const right = makeUnit('Lyn');

    const menu = new TradeMenu();
    menu.open(left, right);
    menu.selectLeftItem(0);
    expect(menu.state).toBe(TradeMenuState.SELECT_RIGHT);

    menu.cancel();
    expect(menu.state).toBe(TradeMenuState.SELECT_LEFT);
    expect(menu.leftSelectedIndex).toBe(-1);
    expect(menu.rightSelectedIndex).toBe(-1);
  });

  it('close resets state', () => {
    const left = makeUnit('Rowan');
    left.inventory.add(createWeaponItem('Iron Sword', 'sword', 5, 90, 0, 1, 1, false));
    const right = makeUnit('Lyn');
    right.inventory.add(createWeaponItem('Iron Lance', 'lance', 6, 80, 0, 1, 1, false));

    const menu = new TradeMenu();
    menu.open(left, right);
    menu.selectLeftItem(0);
    menu.selectRightItem(0);
    menu.close();

    expect(menu.state).toBe(TradeMenuState.INACTIVE);
    expect(menu.isActive).toBe(false);
    expect(menu.leftUnit).toBeNull();
    expect(menu.rightUnit).toBeNull();
    expect(menu.leftItems).toHaveLength(0);
    expect(menu.rightItems).toHaveLength(0);
    expect(menu.leftSelectedIndex).toBe(-1);
    expect(menu.rightSelectedIndex).toBe(-1);
  });
});
