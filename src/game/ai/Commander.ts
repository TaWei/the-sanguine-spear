import { Unit } from '../units/Unit';
import { Grid } from '../map/Grid';
import { WeaponData } from '../combat/Weapons';
import { computeMoveRange } from '../movement/MoveRange';
import { findPath } from '../movement/Pathfinder';
import { pickBestTarget } from './Targeting';
import { Action, ActionType, GridPoint } from '../state/ActionQueue';
import { AiPersonality } from './Personality';
import { AiBehavior, shouldPursue, shouldAttackInRange, isStationary } from './Behavior';

export interface AiConfig {
  personality: AiPersonality;
  behavior: AiBehavior;
}

export class Commander {
  private grid: Grid;
  private weaponDb: Record<string, WeaponData>;

  constructor(grid: Grid, weaponDb: Record<string, WeaponData>) {
    this.grid = grid;
    this.weaponDb = weaponDb;
  }

  planEnemyTurn(
    enemies: Unit[],
    players: Unit[],
    configs?: Map<Unit, AiConfig>,
  ): Action[] {
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

      const config = configs?.get(enemy);
      const personality = config?.personality ?? AiPersonality.BALANCED;
      const behavior = config?.behavior ?? AiBehavior.ATTACK_IN_RANGE;

      const moveRange = computeMoveRange(enemy, this.grid);
      // Prevent multiple enemies from being assigned the same destination tile
      for (const key of claimedTiles) {
        moveRange.delete(key);
      }

      const reachable = this.findReachableTargets(enemy, players, moveRange, weapon);

      if (reachable.length > 0) {
        const target = pickBestTarget(
          enemy,
          reachable,
          weapon,
          this.grid,
          personality,
          (u) => this.getWeapon(u) ?? undefined,
        );
        if (!target) {
          continue;
        }

        const movePos = this.findBestApproach(enemy, target, moveRange, weapon, personality);
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
      } else if (shouldPursue(behavior, enemy) && !isStationary(behavior)) {
        // Pursue nearest player
        const pursuit = this.pursueTarget(enemy, players, moveRange);
        if (pursuit) {
          const [px, py, rawPath] = pursuit;
          const path: GridPoint[] | undefined = rawPath
            ? rawPath.map((p) => ({ x: p.x, y: p.y }))
            : undefined;
          actions.push({
            type: ActionType.MOVE,
            actor: enemy,
            x: px,
            y: py,
            path,
          });
          claimedTiles.add(`${String(px)},${String(py)}`);
        }
      } else if (shouldAttackInRange(behavior, enemy)) {
        // Out of range and not allowed to pursue — do nothing
        continue;
      }
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
    if (unit.unitClass === 'assassin') {
      return this.weaponDb['Killer Sword'];
    }
    if (unit.unitClass === 'wraith_knight') {
      return this.weaponDb['Steel Lance'];
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
    personality: AiPersonality,
  ): [number, number] | null {
    let best: [number, number] | null = null;
    let bestScore = -Infinity;

    for (const [key] of moveRange) {
      const [x, y] = key.split(',').map(Number);
      const dist = Math.abs(x - target.gridX) + Math.abs(y - target.gridY);
      if (dist < weapon.minRange || dist > weapon.maxRange) {
        continue;
      }

      let score = -dist;

      // Terrain awareness: CAUTIOUS personalities prefer defensive tiles
      if (personality === AiPersonality.CAUTIOUS) {
        const terrain = this.grid.getTerrainData(x, y);
        const defBonus = terrain.defenseBonus;
        const avoBonus = terrain.avoidBonus;
        score += defBonus * 5 + avoBonus * 2;
      }

      if (score > bestScore) {
        bestScore = score;
        best = [x, y];
      }
    }

    return best;
  }

  private pursueTarget(
    enemy: Unit,
    players: Unit[],
    moveRange: Map<string, number>,
  ): [number, number, { x: number; y: number }[] | null] | null {
    let nearestPlayer: Unit | null = null;
    let nearestDist = Infinity;

    for (const player of players) {
      if (!player.isAlive) {
        continue;
      }
      const d = Math.abs(enemy.gridX - player.gridX) + Math.abs(enemy.gridY - player.gridY);
      if (d < nearestDist) {
        nearestDist = d;
        nearestPlayer = player;
      }
    }

    if (!nearestPlayer) {
      return null;
    }

    let best: [number, number] | null = null;
    let bestDist = Infinity;

    for (const [key] of moveRange) {
      const [x, y] = key.split(',').map(Number);
      const d = Math.abs(x - nearestPlayer.gridX) + Math.abs(y - nearestPlayer.gridY);
      if (d < bestDist) {
        bestDist = d;
        best = [x, y];
      }
    }

    if (!best) {
      return null;
    }

    const rawPath = findPath(enemy, this.grid, best[0], best[1]);
    return [best[0], best[1], rawPath];
  }
}
