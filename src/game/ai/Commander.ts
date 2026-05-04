import { Unit } from '../units/Unit';
import { Grid } from '../map/Grid';
import { WeaponData } from '../combat/Weapons';
import { computeMoveRange } from '../movement/MoveRange';
import { findPath } from '../movement/Pathfinder';
import { pickBestTarget } from './Targeting';
import { Action, ActionType, GridPoint } from '../state/ActionQueue';

export class Commander {
  private grid: Grid;
  private weaponDb: Record<string, WeaponData>;

  constructor(grid: Grid, weaponDb: Record<string, WeaponData>) {
    this.grid = grid;
    this.weaponDb = weaponDb;
  }

  planEnemyTurn(enemies: Unit[], players: Unit[]): Action[] {
    const actions: Action[] = [];
    const claimedTiles = new Set<string>();

    for (const enemy of enemies) {
      if (!enemy.isAlive) {
        continue;
      }

      const weapon = this.getWeapon(enemy);
      if (!weapon) {
        continue;
      }

      const moveRange = computeMoveRange(enemy, this.grid);
      // Prevent multiple enemies from being assigned the same destination tile
      for (const key of claimedTiles) {
        moveRange.delete(key);
      }

      const reachable = this.findReachableTargets(enemy, players, moveRange, weapon);

      if (reachable.length === 0) {
        continue;
      }

      const target = pickBestTarget(enemy, reachable, weapon, this.grid);
      if (!target) {
        continue;
      }

      const movePos = this.findBestApproach(enemy, target, moveRange, weapon);
      if (movePos && (movePos[0] !== enemy.gridX || movePos[1] !== enemy.gridY)) {
        const rawPath = findPath(enemy, this.grid, movePos[0], movePos[1]);
        const path: GridPoint[] | undefined = rawPath
          ? rawPath.map((p) => ({ x: p.x, y: p.y }))
          : undefined;
        actions.push({
          type: ActionType.MOVE,
          actor: enemy,
          x: movePos[0],
          y: movePos[1],
          path,
        });
        claimedTiles.add(`${String(movePos[0])},${String(movePos[1])}`);
      }

      actions.push({
        type: ActionType.ATTACK,
        actor: enemy,
        targetX: target.gridX,
        targetY: target.gridY,
      });
    }

    return actions;
  }

  private getWeapon(unit: Unit): WeaponData | null {
    if (unit.unitClass === 'mage') {
      return this.weaponDb.Fire;
    }
    if (unit.unitClass === 'brigand') {
      return this.weaponDb['Iron Axe'];
    }
    if (unit.unitClass === 'soldier') {
      return this.weaponDb['Iron Lance'];
    }
    return this.weaponDb['Iron Sword'];
  }

  private findReachableTargets(
    _enemy: Unit,
    players: Unit[],
    moveRange: Map<string, number>,
    weapon: WeaponData,
  ): Unit[] {
    return players.filter((player) => {
      if (!player.isAlive) {
        return false;
      }
      for (const [key] of moveRange) {
        const [mx, my] = key.split(',').map(Number);
        const dist = Math.abs(mx - player.gridX) + Math.abs(my - player.gridY);
        if (dist >= weapon.minRange && dist <= weapon.maxRange) {
          return true;
        }
      }
      return false;
    });
  }

  private findBestApproach(
    _enemy: Unit,
    target: Unit,
    moveRange: Map<string, number>,
    weapon: WeaponData,
  ): [number, number] | null {
    let best: [number, number] | null = null;
    let bestDist = Infinity;

    for (const [key] of moveRange) {
      const [x, y] = key.split(',').map(Number);
      const dist = Math.abs(x - target.gridX) + Math.abs(y - target.gridY);
      if (dist >= weapon.minRange && dist <= weapon.maxRange && dist < bestDist) {
        bestDist = dist;
        best = [x, y];
      }
    }

    return best;
  }
}
