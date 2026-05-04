import { describe, it, expect } from 'vitest';
import { BattleMenu, MenuState, MenuAction } from '../BattleMenu';
import { Unit, Faction, UnitClass } from '../../units/Unit';
import { createStats } from '../../units/Stats';

describe('BattleMenu', () => {
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
  const player = new Unit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, stats, 5, 5);
  const enemy = new Unit('e1', 'Bandit', Faction.ENEMY, UnitClass.BRIGAND, stats, 6, 5);

  it('starts hidden', () => {
    const menu = new BattleMenu();
    expect(menu.state).toBe(MenuState.HIDDEN);
    expect(menu.isVisible).toBe(false);
  });

  it('opens to CHOOSE_ACTION when shown', () => {
    const menu = new BattleMenu();
    menu.show(player, [enemy]);
    expect(menu.state).toBe(MenuState.CHOOSE_ACTION);
    expect(menu.unit).toBe(player);
    expect(menu.adjacentEnemies).toHaveLength(1);
  });

  it('selecting FIGHT transitions to CHOOSE_TARGET', () => {
    const menu = new BattleMenu();
    menu.show(player, [enemy]);
    menu.selectAction(MenuAction.FIGHT);
    expect(menu.state).toBe(MenuState.CHOOSE_TARGET);
  });

  it('selecting END_TURN transitions to RESOLVED', () => {
    const menu = new BattleMenu();
    menu.show(player, [enemy]);
    menu.selectAction(MenuAction.END_TURN);
    expect(menu.state).toBe(MenuState.RESOLVED);
    expect(menu.selectedAction).toBe(MenuAction.END_TURN);
  });

  it('selecting a target transitions to RESOLVED', () => {
    const menu = new BattleMenu();
    menu.show(player, [enemy]);
    menu.selectAction(MenuAction.FIGHT);
    menu.selectTarget(enemy);
    expect(menu.state).toBe(MenuState.RESOLVED);
    expect(menu.selectedTarget).toBe(enemy);
  });

  it('full fight flow preserves selectedAction and selectedTarget', () => {
    const menu = new BattleMenu();
    menu.show(player, [enemy]);
    expect(menu.state).toBe(MenuState.CHOOSE_ACTION);
    menu.selectAction(MenuAction.FIGHT);
    expect(menu.state).toBe(MenuState.CHOOSE_TARGET);
    expect(menu.selectedAction).toBe(MenuAction.FIGHT);
    menu.selectTarget(enemy);
    expect(menu.state).toBe(MenuState.RESOLVED);
    expect(menu.selectedTarget).toBe(enemy);
    expect(menu.selectedAction).toBe(MenuAction.FIGHT);
  });

  it('re-showing the menu during CHOOSE_TARGET resets back to CHOOSE_ACTION', () => {
    const menu = new BattleMenu();
    menu.show(player, [enemy]);
    menu.selectAction(MenuAction.FIGHT);
    expect(menu.state).toBe(MenuState.CHOOSE_TARGET);
    menu.show(player, [enemy]);
    expect(menu.state).toBe(MenuState.CHOOSE_ACTION);
    expect(menu.selectedAction).toBeNull();
  });

  it('cannot select target before choosing FIGHT', () => {
    const menu = new BattleMenu();
    menu.show(player, [enemy]);
    expect(() => {
      menu.selectTarget(enemy);
    }).toThrow();
  });

  it('reset returns to hidden', () => {
    const menu = new BattleMenu();
    menu.show(player, [enemy]);
    menu.selectAction(MenuAction.END_TURN);
    menu.reset();
    expect(menu.state).toBe(MenuState.HIDDEN);
    expect(menu.unit).toBeNull();
  });

  it('selecting STATUS transitions to CHOOSE_STATUS', () => {
    const menu = new BattleMenu();
    menu.show(player, [enemy]);
    menu.selectAction(MenuAction.STATUS);
    expect(menu.state).toBe(MenuState.CHOOSE_STATUS);
    expect(menu.selectedAction).toBe(MenuAction.STATUS);
  });

  it('reset from CHOOSE_STATUS returns to hidden', () => {
    const menu = new BattleMenu();
    menu.show(player, [enemy]);
    menu.selectAction(MenuAction.STATUS);
    expect(menu.state).toBe(MenuState.CHOOSE_STATUS);
    menu.reset();
    expect(menu.state).toBe(MenuState.HIDDEN);
    expect(menu.unit).toBeNull();
    expect(menu.selectedAction).toBeNull();
  });
});
