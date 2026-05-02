# Phase 5: Enemy AI (The Brains)

> **For Hermes:** Use `subagent-driven-development` skill to implement this plan task-by-task.

**Goal:** Enemies detect when a player is in their movement + attack range, score potential targets, and execute attacks. The enemy phase runs autonomously.

**Architecture:** `Targeting` scores each potential target using a decision matrix (damage dealt, kill potential, safety). `Commander` orchestrates the enemy phase: iterate enemy units by priority, find best target, path to them, attack. All pure logic — the Commander returns a list of `Action` objects that the Phaser layer will execute.

**Tech Stack:** TypeScript, Vitest

**Prerequisite:** Phase 4 complete.

---

### Task 5.1: Implement targeting scoring

**Objective:** Score each enemy target based on: can I kill them? How much damage can I deal? Will I survive the counterattack?

**Files:**
- Create: `src/game/ai/Targeting.ts`
- Create: `src/game/ai/__tests__/Targeting.test.ts`

**Step 1: Write failing test**

```typescript
// src/game/ai/__tests__/Targeting.test.ts
import { describe, it, expect } from 'vitest';
import { scoreTarget, pickBestTarget } from '../Targeting';
import { Unit, Faction, UnitClass } from '../../units/Unit';
import { createStats } from '../../units/Stats';
import { WEAPON_DB } from '../../combat/Weapons';
import { Grid } from '../../map/Grid';
import { TerrainType } from '../../map/Terrain';

describe('Targeting', () => {
  const grid = new Grid(10, 10);

  const enemyStats = createStats({ hp: 26, str: 9, mag: 0, skl: 4, spd: 5, luk: 3, def: 5, res: 1, mov: 5 });
  const enemy = new Unit('e1', 'Bandit', Faction.ENEMY, UnitClass.BRIGAND, enemyStats, 5, 5);

  const weakStats = createStats({ hp: 16, str: 1, mag: 9, skl: 6, spd: 7, luk: 5, def: 2, res: 7, mov: 5 });
  const weak = new Unit('p1', 'Elara', Faction.PLAYER, UnitClass.MAGE, weakStats, 6, 5);

  const toughStats = createStats({ hp: 22, str: 8, mag: 2, skl: 7, spd: 8, luk: 6, def: 6, res: 2, mov: 5 });
  const tough = new Unit('p2', 'Rowan', Faction.PLAYER, UnitClass.LORD, toughStats, 6, 6);

  const targets = [weak, tough];

  it('returns a positive score for a valid target', () => {
    const score = scoreTarget(enemy, weak, WEAPON_DB['Iron Axe'], grid);
    expect(score).toBeGreaterThan(0);
  });

  it('returns 0 if target is not an enemy', () => {
    const ally = new Unit('a1', 'Ally', Faction.ALLY, UnitClass.LORD, weakStats, 6, 5);
    const score = scoreTarget(enemy, ally, WEAPON_DB['Iron Axe'], grid);
    expect(score).toBe(0);
  });

  it('returns 0 if target is dead', () => {
    weak.takeDamage(999);
    const score = scoreTarget(enemy, weak, WEAPON_DB['Iron Axe'], grid);
    expect(score).toBe(0);
  });

  it('prefers a killable target over a tougher one', () => {
    // Weak mage has 16 HP, 2 def. Bandit: str(9) + mt(8) = 17 - 2 def = 15 damage (close to kill)
    // Tough lord has 22 HP, 6 def. Bandit: 17 - 6 = 11 damage (far from kill)
    const weakScore = scoreTarget(enemy, weak, WEAPON_DB['Iron Axe'], grid);
    const toughScore = scoreTarget(enemy, tough, WEAPON_DB['Iron Axe'], grid);
    // Weak mage should be preferred (less def, lower HP)
    expect(weakScore).toBeGreaterThan(toughScore);
  });

  it('pickBestTarget returns the highest-scoring target', () => {
    const best = pickBestTarget(enemy, targets, WEAPON_DB['Iron Axe'], grid);
    expect(best).toBe(weak); // easier to kill
  });

  it('pickBestTarget returns null if no valid targets', () => {
    const dead = [new Unit('p3', 'Dead', Faction.PLAYER, UnitClass.LORD,
      createStats({ hp: 0, str: 1, mag: 1, skl: 1, spd: 1, luk: 1, def: 1, res: 1, mov: 1 }), 0, 0)];
    const best = pickBestTarget(enemy, dead, WEAPON_DB['Iron Axe'], grid);
    expect(best).toBeNull();
  });

  it('pickBestTarget returns null if no targets provided', () => {
    const best = pickBestTarget(enemy, [], WEAPON_DB['Iron Axe'], grid);
    expect(best).toBeNull();
  });
});
```

**Step 2: Run to verify RED**

**Step 3: Write implementation**

```typescript
// src/game/ai/Targeting.ts
import { Unit, Faction } from '../units/Unit';
import { Grid } from '../map/Grid';
import { WeaponData } from '../combat/Weapons';
import { calcDamage } from '../combat/Formulas';

/**
 * Score a potential target for the attacker.
 * Higher score = better target.
 *
 * Factors:
 * - Can I kill them? (big bonus)
 * - Damage dealt relative to their HP
 * - Will I take damage on counter? (penalty)
 */
export function scoreTarget(attacker: Unit, target: Unit, weapon: WeaponData, grid: Grid): number {
  if (!target.isAlive) return 0;
  if (target.faction === attacker.faction) return 0;
  // Only target enemies
  if (target.faction === Faction.ALLY) return 0; // allies not targeted by enemies

  const atkStat = weapon.usesMagic ? attacker.stats.mag : attacker.stats.str;
  const defStat = weapon.usesMagic ? target.stats.res : target.stats.def;
  const targetTerrain = grid.getTerrainData(target.gridX, target.gridY);
  const effectiveDef = defStat + targetTerrain.defenseBonus;

  const damage = calcDamage(atkStat, weapon.mt, effectiveDef, weapon.usesMagic);

  let score = damage;

  // Kill bonus: if damage >= target HP, big score boost
  if (damage >= target.stats.hp) {
    score += 50;
  }

  // Prefer targets that are already damaged (finish them off)
  score += (target.stats.maxHp - target.stats.hp) * 2;

  // Penalty for targets that can hurt us
  // (Simplified: just check if target is strong relative to our defense)
  // We don't have target's weapon here, so skip deep counter damage calc for now

  return score;
}

/**
 * Pick the best target from a list. Returns null if no valid targets.
 */
export function pickBestTarget(
  attacker: Unit,
  targets: Unit[],
  weapon: WeaponData,
  grid: Grid,
): Unit | null {
  let best: Unit | null = null;
  let bestScore = -1;

  for (const target of targets) {
    const score = scoreTarget(attacker, target, weapon, grid);
    if (score > bestScore) {
      bestScore = score;
      best = target;
    }
  }

  return best;
}
```

**Step 4: Run to verify GREEN**

**Step 5: Commit**

```bash
git add src/game/ai/Targeting.ts src/game/ai/__tests__/Targeting.test.ts
git commit -m "feat: add AI targeting with damage/kill scoring"
```

---

### Task 5.2: Implement AI Commander

**Objective:** The Commander orchestrates the enemy phase. For each enemy unit: find all reachable player units in move+attack range, pick the best target, path to them, and attack.

**Files:**
- Create: `src/game/ai/Commander.ts`
- Create: `src/game/ai/__tests__/Commander.test.ts`

**Step 1: Write failing test**

```typescript
// src/game/ai/__tests__/Commander.test.ts
import { describe, it, expect } from 'vitest';
import { Commander } from '../Commander';
import { Unit, Faction, UnitClass } from '../../units/Unit';
import { createStats } from '../../units/Stats';
import { Grid } from '../../map/Grid';
import { WEAPON_DB } from '../../combat/Weapons';
import { ActionType } from '../../state/ActionQueue';

describe('Commander', () => {
  it('generates actions for enemies to attack nearby players', () => {
    const grid = new Grid(10, 10);

    // Enemy at (5,5) with Iron Axe
    const enemyStats = createStats({ hp: 26, str: 9, mag: 0, skl: 4, spd: 5, luk: 3, def: 5, res: 1, mov: 5 });
    const enemy = new Unit('e1', 'Bandit', Faction.ENEMY, UnitClass.BRIGAND, enemyStats, 5, 5);
    grid.placeUnit(enemy, 5, 5);

    // Player at (6,5) — adjacent, in attack range
    const playerStats = createStats({ hp: 22, str: 8, mag: 2, skl: 7, spd: 8, luk: 6, def: 6, res: 2, mov: 5 });
    const player = new Unit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, playerStats, 6, 5);
    grid.placeUnit(player, 6, 5);

    const commander = new Commander(grid, WEAPON_DB);
    const actions = commander.planEnemyTurn([enemy], [player]);

    // Should have at least one action (move+attack or just attack)
    expect(actions.length).toBeGreaterThan(0);
  });

  it('returns empty actions when no players in range', () => {
    const grid = new Grid(10, 10);

    const enemyStats = createStats({ hp: 26, str: 9, mag: 0, skl: 4, spd: 5, luk: 3, def: 5, res: 1, mov: 1 });
    const enemy = new Unit('e1', 'Bandit', Faction.ENEMY, UnitClass.BRIGAND, enemyStats, 0, 0);
    grid.placeUnit(enemy, 0, 0);

    const playerStats = createStats({ hp: 22, str: 8, mag: 2, skl: 7, spd: 8, luk: 6, def: 6, res: 2, mov: 5 });
    const player = new Unit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, playerStats, 9, 9);
    grid.placeUnit(player, 9, 9);

    const commander = new Commander(grid, WEAPON_DB);
    const actions = commander.planEnemyTurn([enemy], [player]);

    expect(actions).toHaveLength(0);
  });

  it('enemy moves toward player if not in attack range', () => {
    const grid = new Grid(10, 10);

    // Enemy at (5,5), mov=3, Iron Axe (range 1)
    const enemyStats = createStats({ hp: 26, str: 9, mag: 0, skl: 4, spd: 5, luk: 3, def: 5, res: 1, mov: 3 });
    const enemy = new Unit('e1', 'Bandit', Faction.ENEMY, UnitClass.BRIGAND, enemyStats, 5, 5);
    grid.placeUnit(enemy, 5, 5);

    // Player at (5,9) — distance 4, just outside mov+range (3+1=4, need to be at distance 1)
    const playerStats = createStats({ hp: 22, str: 8, mag: 2, skl: 7, spd: 8, luk: 6, def: 6, res: 2, mov: 5 });
    const player = new Unit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, playerStats, 5, 9);
    grid.placeUnit(player, 5, 9);

    const commander = new Commander(grid, WEAPON_DB);
    const actions = commander.planEnemyTurn([enemy], [player]);

    // Should have a MOVE action
    expect(actions.length).toBeGreaterThan(0);
    const moveAction = actions.find(a => a.type === ActionType.MOVE);
    expect(moveAction).toBeDefined();
    // Should move closer to player — from (5,5) toward (5,9)
    expect(moveAction!.y).toBeGreaterThan(5);
  });

  it('dead enemies are skipped', () => {
    const grid = new Grid(10, 10);

    const deadEnemyStats = createStats({ hp: 0, str: 9, mag: 0, skl: 4, spd: 5, luk: 3, def: 5, res: 1, mov: 5 });
    const deadEnemy = new Unit('e1', 'Dead', Faction.ENEMY, UnitClass.BRIGAND, deadEnemyStats, 5, 5);

    const playerStats = createStats({ hp: 22, str: 8, mag: 2, skl: 7, spd: 8, luk: 6, def: 6, res: 2, mov: 5 });
    const player = new Unit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, playerStats, 6, 5);

    const commander = new Commander(grid, WEAPON_DB);
    const actions = commander.planEnemyTurn([deadEnemy], [player]);

    expect(actions).toHaveLength(0);
  });
});
```

**Step 2: Run to verify RED**

**Step 3: Write implementation**

```typescript
// src/game/ai/Commander.ts
import { Unit, Faction } from '../units/Unit';
import { Grid } from '../map/Grid';
import { WeaponData } from '../combat/Weapons';
import { computeMoveRange } from '../movement/MoveRange';
import { computeAttackRange } from '../combat/AttackRange';
import { pickBestTarget } from './Targeting';
import { Action, ActionType } from '../state/ActionQueue';

export class Commander {
  private grid: Grid;
  private weaponDb: Record<string, WeaponData>;

  constructor(grid: Grid, weaponDb: Record<string, WeaponData>) {
    this.grid = grid;
    this.weaponDb = weaponDb;
  }

  planEnemyTurn(enemies: Unit[], players: Unit[]): Action[] {
    const actions: Action[] = [];

    for (const enemy of enemies) {
      if (!enemy.isAlive) continue;

      const weapon = this.getWeapon(enemy);
      if (!weapon) continue;

      // Find all players within move+attack range
      const moveRange = computeMoveRange(enemy, this.grid);
      const reachable = this.findReachableTargets(enemy, players, moveRange, weapon);

      if (reachable.length === 0) continue;

      const target = pickBestTarget(enemy, reachable, weapon, this.grid);
      if (!target) continue;

      // Build actions: move toward target, then attack
      const movePos = this.findBestApproach(enemy, target, moveRange, weapon);
      if (movePos) {
        actions.push({
          type: ActionType.MOVE,
          actor: enemy,
          x: movePos[0],
          y: movePos[1],
        });
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
    // For now, use Iron weapons based on class
    // TODO: proper inventory system
    if (unit.unitClass === 'mage') return this.weaponDb['Fire'];
    if (unit.unitClass === 'brigand') return this.weaponDb['Iron Axe'];
    if (unit.unitClass === 'soldier') return this.weaponDb['Iron Lance'];
    return this.weaponDb['Iron Sword']; // default
  }

  private findReachableTargets(
    enemy: Unit,
    players: Unit[],
    moveRange: Map<string, number>,
    weapon: WeaponData,
  ): Unit[] {
    return players.filter(player => {
      if (!player.isAlive) return false;
      // Check if any tile in moveRange is within attack range of the player
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
    enemy: Unit,
    target: Unit,
    moveRange: Map<string, number>,
    weapon: WeaponData,
  ): [number, number] | null {
    // Find the closest tile to the target that's in attack range and in move range
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
```

**Step 4: Run to verify GREEN**

**Step 5: Commit**

```bash
git add src/game/ai/Commander.ts src/game/ai/__tests__/Commander.test.ts
git commit -m "feat: add AI Commander for automated enemy phase planning"
```

---

### Task 5.3: Create barrel export for AI module

**File:** `src/game/ai/index.ts`

```typescript
export { Commander } from './Commander';
export { scoreTarget, pickBestTarget } from './Targeting';
```

Commit.

---

## Verification Checklist

- [ ] `npx vitest run` passes all tests
- [ ] Targeting scores prioritize killable, damaged units
- [ ] Targeting returns 0 for allies and dead units
- [ ] Commander generates move+attack actions for enemies
- [ ] Commander skips enemies with no reachable targets
- [ ] Commander skips dead enemies
- [ ] No Phaser imports in any `src/game/` file

---

## Next Phase

Proceed to [Phase 6: Polish and Deployment](./06-polish-and-deployment.md).
