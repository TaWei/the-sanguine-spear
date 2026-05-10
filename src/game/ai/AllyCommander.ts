import { Unit } from '../units/Unit';
import { Grid } from '../map/Grid';
import { WeaponData } from '../combat/Weapons';
import { computeMoveRange } from '../movement/MoveRange';
import { findPath } from '../movement/Pathfinder';
import { pickBestTarget } from './Targeting';
import { Action, ActionType, GridPoint } from '../state/ActionQueue';
import { AiPersonality } from './Personality';


export class AllyCommander {
  private grid: Grid;
  private weaponDb: Record<string, WeaponData>;

  constructor(grid: Grid, weaponDb: Record<string, WeaponData>) {
    this.grid = grid;
    this.weaponDb = weaponDb;
  }

  planAllyTurn(
    allies: Unit[],
    enemies: Unit[],
    _players: Unit[],
  ): Action[] {
    const actions: Action[] = [];
    const claimedTiles = new Set<string>();

    for (const ally of allies) {
      if (!ally.isAlive) continue;

      const weapon = this.getWeapon(ally);
      if (!weapon) continue;

      const moveRange = computeMoveRange(ally, this.grid);
      for (const key of claimedTiles) {
        moveRange.delete(key);
      }

      const reachable = this.findReachableTargets(ally, enemies, moveRange, weapon);

      if (reachable.length > 0) {
        const target = pickBestTarget(
          ally,
          reachable,
          weapon,
          this.grid,
          AiPersonality.BALANCED,
          (u) => this.getWeapon(u) ?? undefined,
        );
        if (!target) continue;

        const movePos = this.findBestApproach(ally, target, moveRange, weapon);
        if (movePos && (movePos[0] !== ally.gridX || movePos[1] !== ally.gridY)) {
          const rawPath = findPath(ally, this.grid, movePos[0], movePos[1]);
          const path: GridPoint[] | undefined = rawPath
            ? rawPath.map((p) => ({ x: p.x, y: p.y }))
            : undefined;
          actions.push({
            type: ActionType.MOVE,
            actor: ally,
            x: movePos[0],
            y: movePos[1],
            path,
          });
          claimedTiles.add(`${String(movePos[0])},${String(movePos[1])}`);
        }

        actions.push({
          type: ActionType.ATTACK,
          actor: ally,
          targetX: target.gridX,
          targetY: target.gridY,
        });
      } else {
        // Move toward nearest enemy
        const pursuit = this.pursueTarget(ally, enemies, moveRange);
        if (pursuit) {
          const [px, py, rawPath] = pursuit;
          const path: GridPoint[] | undefined = rawPath
            ? rawPath.map((p) => ({ x: p.x, y: p.y }))
            : undefined;
          actions.push({
            type: ActionType.MOVE,
            actor: ally,
            x: px,
            y: py,
            path,
          });
          claimedTiles.add(`${String(px)},${String(py)}`);
        }
      }
    }

    return actions;
  }

  private getWeapon(unit: Unit): WeaponData | null {
    if (unit.unitClass === 'mage') return this.weaponDb.Fire;
    if (unit.unitClass === 'brigand') return this.weaponDb['Iron Axe'];
    if (unit.unitClass === 'soldier') return this.weaponDb['Iron Lance'];
    if (unit.unitClass === 'assassin') return this.weaponDb['Killer Sword'];
    if (unit.unitClass === 'wraith_knight') return this.weaponDb['Steel Lance'];
    return this.weaponDb['Iron Sword'];
  }

  private findReachableTargets(
    _unit: Unit,
    enemies: Unit[],
    moveRange: Map<string, number>,
    weapon: WeaponData,
  ): Unit[] {
    return enemies.filter((enemy) => {
      if (!enemy.isAlive) return false;
      for (const [key] of moveRange) {
        const [mx, my] = key.split(',').map(Number);
        const dist = Math.abs(mx - enemy.gridX) + Math.abs(my - enemy.gridY);
        if (dist >= weapon.minRange && dist <= weapon.maxRange) {
          return true;
        }
      }
      return false;
    });
  }

  private findBestApproach(
    _unit: Unit,
    target: Unit,
    moveRange: Map<string, number>,
    weapon: WeaponData,
  ): [number, number] | null {
    let best: [number, number] | null = null;
    let bestScore = -Infinity;

    for (const [key] of moveRange) {
      const [x, y] = key.split(',').map(Number);
      const dist = Math.abs(x - target.gridX) + Math.abs(y - target.gridY);
      if (dist < weapon.minRange || dist > weapon.maxRange) continue;
      const score = -dist;
      if (score > bestScore) {
        bestScore = score;
        best = [x, y];
      }
    }
    return best;
  }

  private pursueTarget(
    unit: Unit,
    targets: Unit[],
    moveRange: Map<string, number>,
  ): [number, number, { x: number; y: number }[] | null] | null {
    let nearest: Unit | null = null;
    let nearestDist = Infinity;

    for (const t of targets) {
      if (!t.isAlive) continue;
      const d = Math.abs(unit.gridX - t.gridX) + Math.abs(unit.gridY - t.gridY);
      if (d < nearestDist) {
        nearestDist = d;
        nearest = t;
      }
    }

    if (!nearest) return null;

    let best: [number, number] | null = null;
    let bestDist = Infinity;

    for (const [key] of moveRange) {
      const [x, y] = key.split(',').map(Number);
      const d = Math.abs(x - nearest.gridX) + Math.abs(y - nearest.gridY);
      if (d < bestDist) {
        bestDist = d;
        best = [x, y];
      }
    }

    if (!best) return null;
    const rawPath = findPath(unit, this.grid, best[0], best[1]);
    return [best[0], best[1], rawPath];
  }
}
