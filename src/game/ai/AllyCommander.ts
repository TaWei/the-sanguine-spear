import { Unit, Faction } from '../units/Unit';
import { Grid } from '../map/Grid';
import { WeaponData } from '../combat/Weapons';
import { computeMoveRange } from '../movement/MoveRange';
import { findPath } from '../movement/Pathfinder';
import { pickBestTarget } from './Targeting';
import { Action, ActionType, GridPoint } from '../state/ActionQueue';
import { AiPersonality } from './Personality';
import { StaffData, STAFF_DB } from '../staves/Staves';
import { getHealTargets } from '../staves/getHealTargets';
import { TerrainType } from '../map/Terrain';

export class AllyCommander {
  private grid: Grid;
  private weaponDb: Record<string, WeaponData>;
  private staffDb: Record<string, StaffData>;

  constructor(grid: Grid, weaponDb: Record<string, WeaponData>, staffDb: Record<string, StaffData> = STAFF_DB) {
    this.grid = grid;
    this.weaponDb = weaponDb;
    this.staffDb = staffDb;
  }

  planAllyTurn(
    allies: Unit[],
    enemies: Unit[],
    players: Unit[],
    fog?: import('../fog/FogOfWar').FogOfWar,
  ): Action[] {
    const actions: Action[] = [];
    const claimedTiles = new Set<string>();

    // Filter enemies to only those visible to ally faction when fog is enabled
    const visibleEnemies = fog?.isEnabled()
      ? enemies.filter(e => fog.isUnitVisible(e, Faction.ALLY))
      : enemies;

    // Mark player tiles and compute player move ranges to avoid blocking
    const playerMoveRange = new Set<string>();
    for (const player of players) {
      if (!player.isAlive) continue;
      playerMoveRange.add(`${player.gridX},${player.gridY}`);
      const pRange = computeMoveRange(player, this.grid);
      for (const [key] of pRange) {
        playerMoveRange.add(key);
      }
    }

    for (const ally of allies) {
      if (!ally.isAlive) continue;

      const weapon = this.getWeapon(ally);
      const staff = this.getStaff(ally);

      const moveRange = computeMoveRange(ally, this.grid);
      for (const key of claimedTiles) {
        moveRange.delete(key);
      }

      // 1. Try healing first (highest priority for allies)
      const healAction = this.planHealAction(ally, staff, players, allies, moveRange, claimedTiles);
      if (healAction) {
        if (healAction.move) {
          actions.push(healAction.move);
          claimedTiles.add(`${String(healAction.move.x)},${String(healAction.move.y)}`);
        }
        if (healAction.staff) {
          actions.push(healAction.staff);
        }
        continue;
      }

      // 2. Try attacking enemies
      if (weapon) {
        const reachable = this.findReachableTargets(ally, visibleEnemies, moveRange, weapon);

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
          continue;
        }
      }

      // 3. If injured and no enemies, prefer fort tiles
      const isInjured = ally.stats.hp < ally.stats.maxHp;
      if (isInjured && enemies.filter((e) => e.isAlive).length === 0) {
        const fortMove = this.findFortMove(ally, moveRange, claimedTiles, playerMoveRange);
        if (fortMove) {
          const [fx, fy, rawPath] = fortMove;
          const path: GridPoint[] | undefined = rawPath
            ? rawPath.map((p) => ({ x: p.x, y: p.y }))
            : undefined;
          actions.push({
            type: ActionType.MOVE,
            actor: ally,
            x: fx,
            y: fy,
            path,
          });
          claimedTiles.add(`${String(fx)},${String(fy)}`);
          continue;
        }
      }

      // 4. Pursue nearest enemy if weapon exists
      if (weapon && enemies.filter((e) => e.isAlive).length > 0) {
        const pursuit = this.pursueTarget(ally, enemies, moveRange, claimedTiles, playerMoveRange);
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
    // 1. Check equipped weapon index
    if (unit.equippedWeaponIndex !== null) {
      const item = unit.inventory.items[unit.equippedWeaponIndex];
      if (item && item.kind === 'weapon') {
        const dbEntry = this.weaponDb[item.name];
        if (dbEntry) return dbEntry;
      }
    }

    // 2. Check inventory for first weapon
    const weaponItem = [...unit.inventory.items].find((i) => i.kind === 'weapon');
    if (weaponItem) {
      const dbEntry = this.weaponDb[weaponItem.name];
      if (dbEntry) return dbEntry;
    }

    // 3. Fall back to class default
    if (unit.unitClass === 'mage') return this.weaponDb.Fire;
    if (unit.unitClass === 'brigand') return this.weaponDb['Iron Axe'];
    if (unit.unitClass === 'soldier') return this.weaponDb['Iron Lance'];
    if (unit.unitClass === 'assassin') return this.weaponDb['Killer Sword'];
    if (unit.unitClass === 'wraith_knight') return this.weaponDb['Steel Lance'];
    return this.weaponDb['Iron Sword'];
  }

  private getStaff(unit: Unit): StaffData | null {
    const staffItem = [...unit.inventory.items].find((i) => i.kind === 'staff');
    if (!staffItem) return null;
    const dbEntry = this.staffDb[staffItem.name];
    if (!dbEntry) return null;
    return {
      name: staffItem.name,
      healAmount: dbEntry.healAmount,
      minRange: dbEntry.minRange,
      maxRange: dbEntry.maxRange,
      getRange: dbEntry.getRange,
    };
  }

  private planHealAction(
    ally: Unit,
    staff: StaffData | null,
    players: Unit[],
    allies: Unit[],
    moveRange: Map<string, number>,
    claimedTiles: Set<string>,
  ): { move?: Action; staff?: Action } | null {
    if (!staff) return null;

    const allFriendlies = [...players, ...allies].filter((u) => u.isAlive && u !== ally && (u.faction === Faction.PLAYER || u.faction === Faction.ALLY));
    if (allFriendlies.length === 0) return null;

    // Find most injured friendly that is healable
    let bestTarget: Unit | null = null;
    let bestMissingHp = 0;

    for (const target of allFriendlies) {
      const missingHp = target.stats.maxHp - target.stats.hp;
      if (missingHp > 0 && missingHp > bestMissingHp) {
        bestMissingHp = missingHp;
        bestTarget = target;
      }
    }

    if (!bestTarget || bestMissingHp === 0) return null;

    // Check if already in range
    const dist = Math.abs(ally.gridX - bestTarget.gridX) + Math.abs(ally.gridY - bestTarget.gridY);
    const minRange = staff.getRange ? staff.getRange(ally).min : staff.minRange;
    const maxRange = staff.getRange ? staff.getRange(ally).max : staff.maxRange;

    if (dist >= minRange && dist <= maxRange) {
      return {
        staff: {
          type: ActionType.STAFF,
          actor: ally,
          targetX: bestTarget.gridX,
          targetY: bestTarget.gridY,
        },
      };
    }

    // Find best tile in move range that is in staff range
    let bestTile: [number, number] | null = null;
    let bestTileDist = Infinity;

    for (const [key] of moveRange) {
      const [x, y] = key.split(',').map(Number);
      if (claimedTiles.has(key)) continue;
      const d = Math.abs(x - bestTarget.gridX) + Math.abs(y - bestTarget.gridY);
      if (d >= minRange && d <= maxRange) {
        if (d < bestTileDist) {
          bestTileDist = d;
          bestTile = [x, y];
        }
      }
    }

    if (!bestTile) return null;

    const rawPath = findPath(ally, this.grid, bestTile[0], bestTile[1]);
    const path: GridPoint[] | undefined = rawPath
      ? rawPath.map((p) => ({ x: p.x, y: p.y }))
      : undefined;

    return {
      move: {
        type: ActionType.MOVE,
        actor: ally,
        x: bestTile[0],
        y: bestTile[1],
        path,
      },
      staff: {
        type: ActionType.STAFF,
        actor: ally,
        targetX: bestTarget.gridX,
        targetY: bestTarget.gridY,
      },
    };
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
    claimedTiles: Set<string>,
    playerMoveRange: Set<string>,
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
      if (claimedTiles.has(key)) continue;
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

  private findFortMove(
    unit: Unit,
    moveRange: Map<string, number>,
    claimedTiles: Set<string>,
    playerMoveRange: Set<string>,
  ): [number, number, { x: number; y: number }[] | null] | null {
    let best: [number, number] | null = null;
    let bestScore = -Infinity;

    for (const [key] of moveRange) {
      if (claimedTiles.has(key)) continue;
      const [x, y] = key.split(',').map(Number);
      const terrain = this.grid.getTerrain(x, y);
      let score = 0;
      if (terrain === TerrainType.FORT || terrain === TerrainType.GATE || terrain === TerrainType.THRONE) {
        score = 100;
      } else if (terrain === TerrainType.VILLAGE) {
        score = 50;
      }
      // Slightly prefer tiles not in player move range
      if (!playerMoveRange.has(key)) {
        score += 10;
      }
      if (score > bestScore) {
        bestScore = score;
        best = [x, y];
      }
    }

    if (!best || bestScore <= 0) return null;
    const rawPath = findPath(unit, this.grid, best[0], best[1]);
    return [best[0], best[1], rawPath];
  }
}
