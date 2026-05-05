import { describe, it, expect } from 'vitest';
import { serializeUnit, deserializeUnit } from '../UnitSerializer';
import { Unit, Faction, UnitClass } from '../../units/Unit';
import { createStats } from '../../units/Stats';
import { createWeaponItem } from '../../items/ItemTypes';

describe('UnitSerializer', () => {
  it('round-trips a basic unit', () => {
    const unit = new Unit('u1', 'Rowan', Faction.PLAYER, UnitClass.LORD, createStats({
      hp: 22, maxHp: 22, str: 8, mag: 2, skl: 7, spd: 8, luk: 6, def: 6, res: 2, mov: 5,
    }), 2, 5);
    const snap = serializeUnit(unit);
    expect(snap.id).toBe('u1');
    expect(snap.name).toBe('Rowan');
    expect(snap.faction).toBe('player');
    expect(snap.gridX).toBe(2);
    expect(snap.gridY).toBe(5);
    expect(snap.state).toBe('idle');

    const restored = deserializeUnit(snap);
    expect(restored.id).toBe('u1');
    expect(restored.name).toBe('Rowan');
    expect(restored.gridX).toBe(2);
    expect(restored.gridY).toBe(5);
    expect(restored.state.current).toBe('idle');
    expect(restored.stats.hp).toBe(22);
  });

  it('round-trips inventory items', () => {
    const unit = new Unit('u2', 'Elara', Faction.PLAYER, UnitClass.MAGE, createStats({
      hp: 16, maxHp: 16, str: 1, mag: 9, skl: 6, spd: 7, luk: 5, def: 2, res: 7, mov: 5,
    }), 3, 6);
    unit.inventory.add(createWeaponItem('Fire', 'magic', 5, 90, 0, 1, 2, true));
    const snap = serializeUnit(unit);
    expect(snap.inventory).toHaveLength(1);
    expect(snap.inventory[0].name).toBe('Fire');

    const restored = deserializeUnit(snap);
    expect(restored.inventory.items).toHaveLength(1);
    expect(restored.inventory.items[0].name).toBe('Fire');
  });

  it('round-trips exhausted state', () => {
    const unit = new Unit('u3', 'Bandit', Faction.ENEMY, UnitClass.BRIGAND, createStats({
      hp: 26, maxHp: 26, str: 9, mag: 0, skl: 4, spd: 5, luk: 3, def: 5, res: 1, mov: 5,
    }), 12, 4);
    unit.hasActed = true;
    const snap = serializeUnit(unit);
    expect(snap.state).toBe('exhausted');

    const restored = deserializeUnit(snap);
    expect(restored.state.isExhausted()).toBe(true);
  });

  it('round-trips AI config', () => {
    const unit = new Unit('u4', 'Archer', Faction.ENEMY, UnitClass.ARCHER, createStats({
      hp: 20, maxHp: 20, str: 7, mag: 0, skl: 8, spd: 7, luk: 4, def: 4, res: 2, mov: 5,
    }), 14, 5, { aiBehavior: 'attack_in_range', aiPersonality: 'aggressive' });
    const snap = serializeUnit(unit);
    expect(snap.aiBehavior).toBe('attack_in_range');
    expect(snap.aiPersonality).toBe('aggressive');

    const restored = deserializeUnit(snap);
    expect(restored.aiBehavior).toBe('attack_in_range');
    expect(restored.aiPersonality).toBe('aggressive');
  });
});
