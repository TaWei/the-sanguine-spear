import { describe, it, expect } from 'vitest';
import { BattleMenu, MenuState, MenuAction } from '../BattleMenu';
import { Unit, Faction, UnitClass } from '../../units/Unit';
import { createStats } from '../../units/Stats';
import { createWeaponItem } from '../../items/ItemTypes';

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

  it('selecting ITEMS transitions to CHOOSE_ITEM', () => {
    const menu = new BattleMenu();
    menu.show(player, [enemy]);
    menu.selectAction(MenuAction.ITEMS);
    expect(menu.state).toBe(MenuState.CHOOSE_ITEM);
    expect(menu.selectedAction).toBe(MenuAction.ITEMS);
  });

  it('confirmItemUse transitions to RESOLVED', () => {
    const menu = new BattleMenu();
    menu.show(player, [enemy]);
    menu.selectAction(MenuAction.ITEMS);
    menu.confirmItemUse(0);
    expect(menu.state).toBe(MenuState.RESOLVED);
    expect(menu.selectedItemIndex).toBe(0);
  });

  it('cancelItemUse returns to CHOOSE_ACTION', () => {
    const menu = new BattleMenu();
    menu.show(player, [enemy]);
    menu.selectAction(MenuAction.ITEMS);
    expect(menu.state).toBe(MenuState.CHOOSE_ITEM);
    menu.cancelItemUse();
    expect(menu.state).toBe(MenuState.CHOOSE_ACTION);
    expect(menu.selectedItemIndex).toBe(-1);
  });

  it('FIGHT with multiple weapons transitions to CHOOSE_WEAPON', () => {
    const armedPlayer = new Unit('p2', 'Armed', Faction.PLAYER, UnitClass.MERCENARY, stats, 5, 5);
    armedPlayer.inventory.add(createWeaponItem('Iron Sword', 'sword', 5, 90, 0, 1, 1, false));
    armedPlayer.inventory.add(createWeaponItem('Iron Axe', 'axe', 8, 70, 0, 1, 1, false));
    const menu = new BattleMenu();
    menu.show(armedPlayer, [enemy]);
    menu.selectAction(MenuAction.FIGHT);
    expect(menu.state).toBe(MenuState.CHOOSE_WEAPON);
    expect(menu.selectedWeaponIndex).toBe(-1);
  });

  it('FIGHT with 1 weapon transitions directly to CHOOSE_TARGET', () => {
    const armedPlayer = new Unit('p3', 'Armed', Faction.PLAYER, UnitClass.MERCENARY, stats, 5, 5);
    armedPlayer.inventory.add(createWeaponItem('Iron Lance', 'lance', 6, 80, 0, 1, 1, false));
    const menu = new BattleMenu();
    menu.show(armedPlayer, [enemy]);
    menu.selectAction(MenuAction.FIGHT);
    expect(menu.state).toBe(MenuState.CHOOSE_TARGET);
    expect(menu.selectedWeaponIndex).toBe(0);
  });

  it('selectWeapon transitions to CHOOSE_TARGET with correct index', () => {
    const armedPlayer = new Unit('p4', 'Armed', Faction.PLAYER, UnitClass.MERCENARY, stats, 5, 5);
    armedPlayer.inventory.add(createWeaponItem('Iron Sword', 'sword', 5, 90, 0, 1, 1, false));
    armedPlayer.inventory.add(createWeaponItem('Iron Axe', 'axe', 8, 70, 0, 1, 1, false));
    const menu = new BattleMenu();
    menu.show(armedPlayer, [enemy]);
    menu.selectAction(MenuAction.FIGHT);
    expect(menu.state).toBe(MenuState.CHOOSE_WEAPON);
    menu.selectWeapon(1);
    expect(menu.state).toBe(MenuState.CHOOSE_TARGET);
    expect(menu.selectedWeaponIndex).toBe(1);
  });

  it('cancelWeaponSelection returns to CHOOSE_ACTION', () => {
    const armedPlayer = new Unit('p5', 'Armed', Faction.PLAYER, UnitClass.MERCENARY, stats, 5, 5);
    armedPlayer.inventory.add(createWeaponItem('Iron Sword', 'sword', 5, 90, 0, 1, 1, false));
    armedPlayer.inventory.add(createWeaponItem('Iron Axe', 'axe', 8, 70, 0, 1, 1, false));
    const menu = new BattleMenu();
    menu.show(armedPlayer, [enemy]);
    menu.selectAction(MenuAction.FIGHT);
    expect(menu.state).toBe(MenuState.CHOOSE_WEAPON);
    menu.cancelWeaponSelection();
    expect(menu.state).toBe(MenuState.CHOOSE_ACTION);
    expect(menu.selectedWeaponIndex).toBe(-1);
  });

  it('selecting STAFF transitions to CHOOSE_HEAL_TARGET', () => {
    const menu = new BattleMenu();
    menu.show(player, [enemy]);
    menu.selectAction(MenuAction.STAFF);
    expect(menu.state).toBe(MenuState.CHOOSE_HEAL_TARGET);
    expect(menu.selectedAction).toBe(MenuAction.STAFF);
  });

  it('stores heal targets when shown', () => {
    const menu = new BattleMenu();
    const ally = new Unit('a1', 'Ally', Faction.PLAYER, UnitClass.LORD, stats, 5, 4);
    menu.show(player, [enemy], [ally]);
    expect(menu.healTargets).toHaveLength(1);
    expect(menu.healTargets[0].id).toBe('a1');
  });

  it('canceling from CHOOSE_HEAL_TARGET returns to CHOOSE_ACTION', () => {
    const menu = new BattleMenu();
    menu.show(player, [enemy]);
    menu.selectAction(MenuAction.STAFF);
    expect(menu.state).toBe(MenuState.CHOOSE_HEAL_TARGET);
    menu.cancelHealSelection();
    expect(menu.state).toBe(MenuState.CHOOSE_ACTION);
    expect(menu.selectedAction).toBeNull();
  });

  it('selecting a heal target transitions to RESOLVED', () => {
    const menu = new BattleMenu();
    const ally = new Unit('a1', 'Ally', Faction.PLAYER, UnitClass.LORD, stats, 5, 4);
    menu.show(player, [enemy], [ally]);
    menu.selectAction(MenuAction.STAFF);
    menu.selectHealTarget(ally);
    expect(menu.state).toBe(MenuState.RESOLVED);
    expect(menu.selectedTarget).toBe(ally);
  });

  it('selecting TRADE transitions to CHOOSE_TRADE_TARGET', () => {
    const menu = new BattleMenu();
    menu.show(player, [enemy]);
    menu.selectAction(MenuAction.TRADE);
    expect(menu.state).toBe(MenuState.CHOOSE_TRADE_TARGET);
    expect(menu.selectedAction).toBe(MenuAction.TRADE);
  });

  it('selecting SHOP transitions to CHOOSE_SHOP', () => {
    const menu = new BattleMenu();
    menu.show(player, [enemy]);
    menu.selectAction(MenuAction.SHOP);
    expect(menu.state).toBe(MenuState.CHOOSE_SHOP);
    expect(menu.selectedAction).toBe(MenuAction.SHOP);
  });

  it('selectTradeTarget transitions to RESOLVED', () => {
    const menu = new BattleMenu();
    const ally = new Unit('a1', 'Ally', Faction.PLAYER, UnitClass.LORD, stats, 5, 4);
    menu.show(player, [enemy], [], [ally]);
    menu.selectAction(MenuAction.TRADE);
    menu.selectTradeTarget(ally);
    expect(menu.state).toBe(MenuState.RESOLVED);
    expect(menu.selectedTarget).toBe(ally);
  });

  it('cancelTradeSelection returns to CHOOSE_ACTION', () => {
    const menu = new BattleMenu();
    menu.show(player, [enemy]);
    menu.selectAction(MenuAction.TRADE);
    expect(menu.state).toBe(MenuState.CHOOSE_TRADE_TARGET);
    menu.cancelTradeSelection();
    expect(menu.state).toBe(MenuState.CHOOSE_ACTION);
    expect(menu.selectedAction).toBeNull();
  });

  it('stores adjacent allies when shown', () => {
    const menu = new BattleMenu();
    const ally = new Unit('a1', 'Ally', Faction.PLAYER, UnitClass.LORD, stats, 5, 4);
    menu.show(player, [enemy], [], [ally]);
    expect(menu.adjacentAllies).toHaveLength(1);
    expect(menu.adjacentAllies[0].id).toBe('a1');
  });

  it('reset from CHOOSE_TRADE_TARGET returns to hidden', () => {
    const menu = new BattleMenu();
    menu.show(player, [enemy]);
    menu.selectAction(MenuAction.TRADE);
    expect(menu.state).toBe(MenuState.CHOOSE_TRADE_TARGET);
    menu.reset();
    expect(menu.state).toBe(MenuState.HIDDEN);
    expect(menu.unit).toBeNull();
    expect(menu.adjacentAllies).toHaveLength(0);
  });

  it('selecting PAIR_UP transitions to CHOOSE_PAIR_TARGET', () => {
    const menu = new BattleMenu();
    const ally = new Unit('a1', 'Ally', Faction.PLAYER, UnitClass.LORD, stats, 5, 4);
    menu.show(player, [enemy], [], [], [ally]);
    menu.selectAction(MenuAction.PAIR_UP);
    expect(menu.state).toBe(MenuState.CHOOSE_PAIR_TARGET);
    expect(menu.selectedAction).toBe(MenuAction.PAIR_UP);
  });

  it('selecting SEPARATE transitions to RESOLVED', () => {
    const menu = new BattleMenu();
    menu.show(player, [enemy]);
    menu.selectAction(MenuAction.SEPARATE);
    expect(menu.state).toBe(MenuState.RESOLVED);
    expect(menu.selectedAction).toBe(MenuAction.SEPARATE);
  });

  it('selectPairTarget transitions to RESOLVED', () => {
    const menu = new BattleMenu();
    const ally = new Unit('a1', 'Ally', Faction.PLAYER, UnitClass.LORD, stats, 5, 4);
    menu.show(player, [enemy], [], [], [ally]);
    menu.selectAction(MenuAction.PAIR_UP);
    menu.selectPairTarget(ally);
    expect(menu.state).toBe(MenuState.RESOLVED);
    expect(menu.selectedTarget).toBe(ally);
  });

  it('cancelPairSelection returns to CHOOSE_ACTION', () => {
    const menu = new BattleMenu();
    const ally = new Unit('a1', 'Ally', Faction.PLAYER, UnitClass.LORD, stats, 5, 4);
    menu.show(player, [enemy], [], [], [ally]);
    menu.selectAction(MenuAction.PAIR_UP);
    expect(menu.state).toBe(MenuState.CHOOSE_PAIR_TARGET);
    menu.cancelPairSelection();
    expect(menu.state).toBe(MenuState.CHOOSE_ACTION);
    expect(menu.selectedAction).toBeNull();
  });

  it('stores pairable allies when shown', () => {
    const menu = new BattleMenu();
    const ally = new Unit('a1', 'Ally', Faction.PLAYER, UnitClass.LORD, stats, 5, 4);
    menu.show(player, [enemy], [], [], [ally]);
    expect(menu.pairableAllies).toHaveLength(1);
    expect(menu.pairableAllies[0].id).toBe('a1');
  });

  it('selecting TALK transitions to CHOOSE_TALK_TARGET', () => {
    const menu = new BattleMenu();
    const talkable = new Unit('t1', 'Recruit', Faction.ENEMY, UnitClass.SOLDIER, stats, 5, 4);
    menu.show(player, [enemy], [], [], [], [talkable]);
    menu.selectAction(MenuAction.TALK);
    expect(menu.state).toBe(MenuState.CHOOSE_TALK_TARGET);
    expect(menu.selectedAction).toBe(MenuAction.TALK);
  });

  it('selectTalkTarget transitions to RESOLVED', () => {
    const menu = new BattleMenu();
    const talkable = new Unit('t1', 'Recruit', Faction.ENEMY, UnitClass.SOLDIER, stats, 5, 4);
    menu.show(player, [enemy], [], [], [], [talkable]);
    menu.selectAction(MenuAction.TALK);
    menu.selectTalkTarget(talkable);
    expect(menu.state).toBe(MenuState.RESOLVED);
    expect(menu.selectedTarget).toBe(talkable);
  });

  it('cancelTalkSelection returns to CHOOSE_ACTION', () => {
    const menu = new BattleMenu();
    const talkable = new Unit('t1', 'Recruit', Faction.ENEMY, UnitClass.SOLDIER, stats, 5, 4);
    menu.show(player, [enemy], [], [], [], [talkable]);
    menu.selectAction(MenuAction.TALK);
    expect(menu.state).toBe(MenuState.CHOOSE_TALK_TARGET);
    menu.cancelTalkSelection();
    expect(menu.state).toBe(MenuState.CHOOSE_ACTION);
    expect(menu.selectedAction).toBeNull();
  });

  it('stores talkable units when shown', () => {
    const menu = new BattleMenu();
    const talkable = new Unit('t1', 'Recruit', Faction.ENEMY, UnitClass.SOLDIER, stats, 5, 4);
    menu.show(player, [enemy], [], [], [], [talkable]);
    expect(menu.talkableUnits).toHaveLength(1);
    expect(menu.talkableUnits[0].id).toBe('t1');
  });
});
