import { Unit } from './Unit';
import { Grid } from '../map/Grid';

export function canPair(leader: Unit, guard: Unit): boolean {
  if (leader === guard) return false;
  if (!leader.isAlive || !guard.isAlive) return false;
  if (leader.faction !== guard.faction) return false;
  if (leader.pairUpState.isPaired() || guard.pairUpState.isPaired()) return false;

  const dx = Math.abs(leader.gridX - guard.gridX);
  const dy = Math.abs(leader.gridY - guard.gridY);
  return dx + dy === 1;
}

export function pairUp(leader: Unit, guard: Unit): void {
  if (!canPair(leader, guard)) {
    throw new Error(`${leader.name} cannot pair with ${guard.name}`);
  }
  leader.pairUpState.guardUnitId = guard.id;
  guard.pairUpState.leadUnitId = leader.id;
}

export function breakPair(unit: Unit, allUnits: Unit[] = []): void {
  if (!unit.pairUpState.isPaired()) {
    return;
  }
  const partnerId = unit.pairUpState.leadUnitId ?? unit.pairUpState.guardUnitId;
  unit.pairUpState.clear();
  const partner = allUnits.find((u) => u.id === partnerId);
  if (partner) {
    partner.pairUpState.clear();
  }
}

export function getCombinationAttacker(
  lead: Unit,
  guard: Unit,
  enemy: Unit,
  grid: Grid,
): Unit | null {
  if (!guard.isAlive) return null;
  if (!lead.pairUpState.isPaired() || !guard.pairUpState.isPaired()) return null;
  if (lead.pairUpState.guardUnitId !== guard.id) return null;

  // Check if guard has any weapon that can reach the enemy
  // Since guard shares lead's tile, distance from guard to enemy is same as lead to enemy
  const dist = Math.abs(lead.gridX - enemy.gridX) + Math.abs(lead.gridY - enemy.gridY);
  for (const item of guard.inventory.items) {
    if (item.kind === 'weapon') {
      const w = item as import('../items/ItemTypes').WeaponItem;
      if (dist >= w.minRange && dist <= w.maxRange) {
        return guard;
      }
    }
  }
  return null;
}

export function getGuardDefenseBonus(guard: Unit, _lead: Unit): number {
  return Math.floor(guard.stats.def / 2);
}
