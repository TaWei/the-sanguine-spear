import type { UnitSnapshot } from './SaveData';
import { Unit } from '../units/Unit';
import { createStats } from '../units/Stats';
import { createGrowthRates } from '../progression/GrowthRates';
import { UNIT_STATE } from '../state/UnitState';

export function serializeUnit(unit: Unit): UnitSnapshot {
  return {
    id: unit.id,
    name: unit.name,
    faction: unit.faction,
    unitClass: unit.unitClass,
    stats: { ...unit.stats },
    gridX: unit.gridX,
    gridY: unit.gridY,
    state: unit.state.current,
    level: unit.level,
    exp: unit.exp,
    growthRates: { ...unit.growthRates },
    tier: unit.tier,
    inventory: unit.inventory.items.map((item) => ({ ...item })),
    aiBehavior: unit.aiBehavior,
    aiPersonality: unit.aiPersonality,
  };
}

export function deserializeUnit(snap: UnitSnapshot): Unit {
  const unit = new Unit(
    snap.id,
    snap.name,
    snap.faction,
    snap.unitClass,
    createStats(snap.stats),
    snap.gridX,
    snap.gridY,
    {
      level: snap.level,
      exp: snap.exp,
      growthRates: createGrowthRates(snap.growthRates),
      aiBehavior: snap.aiBehavior,
      aiPersonality: snap.aiPersonality,
    },
  );

  for (const item of snap.inventory) {
    unit.inventory.add(item);
  }

  if (snap.state === UNIT_STATE.MOVING) {
    unit.state.transition(UNIT_STATE.MOVING);
  } else if (snap.state === UNIT_STATE.MENU) {
    unit.state.transition(UNIT_STATE.MOVING);
    unit.state.transition(UNIT_STATE.MENU);
  } else if (snap.state === UNIT_STATE.EXHAUSTED) {
    unit.hasActed = true;
  }

  return unit;
}
