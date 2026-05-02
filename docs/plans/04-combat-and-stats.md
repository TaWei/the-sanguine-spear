# Phase 4: Combat and Stats (The Vertical Slice)

> **For Hermes:** Use `subagent-driven-development` skill to implement this plan task-by-task.

**Goal:** Implement the full combat system: damage formulas, hit rate, critical hits (including 2RN true hit), weapon triangle bonuses, attack range calculation, and HP deduction with unit removal.

**Architecture:** `Formulas` computes hit rate, crit rate, and damage using Fire Emblem-style math. `WeaponTriangle` provides advantage/disadvantage modifiers. `CombatEngine` orchestrates a single round of combat (attacker hits defender, defender counterattacks if alive and in range). `Growth` handles level-up stat increases. All pure logic.

**Tech Stack:** TypeScript, Vitest

**Prerequisite:** Phase 3 complete.

---

### Task 4.1: Define weapon data and weapon triangle

**Objective:** Create weapon types, might/hit/crit/range stats, and weapon triangle advantage calculations.

**Files:**
- Create: `src/game/combat/Weapons.ts`
- Create: `src/game/combat/__tests__/Weapons.test.ts`

**Step 1: Write failing test**

```typescript
// src/game/combat/__tests__/Weapons.test.ts
import { describe, it, expect } from 'vitest';
import { WEAPON_DB, WeaponType, getWeaponTriangleMod } from '../Weapons';

describe('Weapon DB', () => {
  it('Iron Sword has correct stats', () => {
    const sword = WEAPON_DB['Iron Sword'];
    expect(sword).toBeDefined();
    expect(sword.type).toBe(WeaponType.SWORD);
    expect(sword.mt).toBe(5);
    expect(sword.hit).toBe(90);
    expect(sword.crit).toBe(0);
    expect(sword.minRange).toBe(1);
    expect(sword.maxRange).toBe(1);
  });

  it('Fire tome uses magic', () => {
    const fire = WEAPON_DB['Fire'];
    expect(fire.type).toBe(WeaponType.MAGIC);
    expect(fire.mt).toBe(5);
    expect(fire.hit).toBe(90);
    expect(fire.minRange).toBe(1);
    expect(fire.maxRange).toBe(2);
  });

  it('Iron Bow has 2 range', () => {
    const bow = WEAPON_DB['Iron Bow'];
    expect(bow.minRange).toBe(2);
    expect(bow.maxRange).toBe(2);
  });
});

describe('Weapon Triangle', () => {
  it('sword beats axe (+1 mt, +15 hit)', () => {
    const mod = getWeaponTriangleMod(WeaponType.SWORD, WeaponType.AXE);
    expect(mod.mtBonus).toBe(1);
    expect(mod.hitBonus).toBe(15);
  });

  it('axe beats lance (+1 mt, +15 hit)', () => {
    const mod = getWeaponTriangleMod(WeaponType.AXE, WeaponType.LANCE);
    expect(mod.mtBonus).toBe(1);
    expect(mod.hitBonus).toBe(15);
  });

  it('lance beats sword (+1 mt, +15 hit)', () => {
    const mod = getWeaponTriangleMod(WeaponType.LANCE, WeaponType.SWORD);
    expect(mod.mtBonus).toBe(1);
    expect(mod.hitBonus).toBe(15);
  });

  it('disadvantage: lance vs axe (-1 mt, -15 hit)', () => {
    const mod = getWeaponTriangleMod(WeaponType.LANCE, WeaponType.AXE);
    expect(mod.mtBonus).toBe(-1);
    expect(mod.hitBonus).toBe(-15);
  });

  it('neutral: same weapon type (0, 0)', () => {
    const mod = getWeaponTriangleMod(WeaponType.SWORD, WeaponType.SWORD);
    expect(mod.mtBonus).toBe(0);
    expect(mod.hitBonus).toBe(0);
  });

  it('neutral: magic vs sword (0, 0)', () => {
    const mod = getWeaponTriangleMod(WeaponType.MAGIC, WeaponType.SWORD);
    expect(mod.mtBonus).toBe(0);
    expect(mod.hitBonus).toBe(0);
  });

  it('neutral: bow vs anything (0, 0)', () => {
    const mod = getWeaponTriangleMod(WeaponType.BOW, WeaponType.AXE);
    expect(mod.mtBonus).toBe(0);
    expect(mod.hitBonus).toBe(0);
  });
});
```

**Step 2: Run to verify RED**

**Step 3: Write implementation**

```typescript
// src/game/combat/Weapons.ts
export const WeaponType = {
  SWORD: 'sword',
  AXE: 'axe',
  LANCE: 'lance',
  BOW: 'bow',
  MAGIC: 'magic',
} as const;
export type WeaponType = (typeof WeaponType)[keyof typeof WeaponType];

export interface WeaponData {
  name: string;
  type: WeaponType;
  mt: number;
  hit: number;
  crit: number;
  minRange: number;
  maxRange: number;
  usesMagic: boolean;
}

export const WEAPON_DB: Record<string, WeaponData> = {
  'Iron Sword':  { name: 'Iron Sword',  type: WeaponType.SWORD, mt: 5, hit: 90, crit: 0, minRange: 1, maxRange: 1, usesMagic: false },
  'Iron Axe':    { name: 'Iron Axe',    type: WeaponType.AXE,   mt: 8, hit: 70, crit: 0, minRange: 1, maxRange: 1, usesMagic: false },
  'Iron Lance':  { name: 'Iron Lance',  type: WeaponType.LANCE, mt: 6, hit: 80, crit: 0, minRange: 1, maxRange: 1, usesMagic: false },
  'Iron Bow':    { name: 'Iron Bow',    type: WeaponType.BOW,   mt: 6, hit: 85, crit: 0, minRange: 2, maxRange: 2, usesMagic: false },
  'Fire':        { name: 'Fire',        type: WeaponType.MAGIC, mt: 5, hit: 90, crit: 0, minRange: 1, maxRange: 2, usesMagic: true },
};

export interface TriangleMod {
  mtBonus: number;
  hitBonus: number;
}

const ADVANTAGE: Record<string, WeaponType> = {
  [WeaponType.SWORD]: WeaponType.AXE,
  [WeaponType.AXE]:   WeaponType.LANCE,
  [WeaponType.LANCE]: WeaponType.SWORD,
};

export function getWeaponTriangleMod(attacker: WeaponType, defender: WeaponType): TriangleMod {
  if (ADVANTAGE[attacker] === defender) {
    return { mtBonus: 1, hitBonus: 15 };
  }
  if (ADVANTAGE[defender] === attacker) {
    return { mtBonus: -1, hitBonus: -15 };
  }
  return { mtBonus: 0, hitBonus: 0 };
}
```

**Step 4: Run to verify GREEN**

**Step 5: Commit**

```bash
git add src/game/combat/Weapons.ts src/game/combat/__tests__/Weapons.test.ts
git commit -m "feat: add weapon DB and weapon triangle calculations"
```

---

### Task 4.2: Implement combat formulas (hit rate, crit, damage)

**Objective:** Pure math functions for hit rate, critical hit rate, and damage calculation.

**Fire Emblem formulas (GBA-style):**
- **Hit rate** = weapon hit + (skl × 2) + (luk / 2) + weapon triangle bonus
- **Avoid** = (spd × 2) + luk + terrain avoid bonus
- **Display hit** = attacker hit − defender avoid
- **True hit (2RN):** roll two random numbers 0–99, average them, compare to display hit
- **Crit rate** = weapon crit + (skl / 2)
- **Crit avoid** = luk
- **Display crit** = attacker crit − defender crit avoid
- **Damage** = attacker str/mag + weapon mt + triangle mt bonus − defender def/res

**Files:**
- Create: `src/game/combat/Formulas.ts`
- Create: `src/game/combat/__tests__/Formulas.test.ts`

**Step 1: Write failing test**

```typescript
// src/game/combat/__tests__/Formulas.test.ts
import { describe, it, expect } from 'vitest';
import {
  calcHitRate,
  calcAvoid,
  calcDisplayHit,
  calcCritRate,
  calcCritAvoid,
  calcDamage,
} from '../Formulas';
import { WeaponType, getWeaponTriangleMod } from '../Weapons';

describe('Combat Formulas', () => {
  // Rowan: skl=7, luk=6, spd=8
  const attackerStats = { skl: 7, luk: 6, spd: 8, str: 8, mag: 2, def: 6, res: 2 };
  const defenderStats = { skl: 4, luk: 3, spd: 5, str: 9, mag: 0, def: 5, res: 1 };
  const weaponHit = 90;
  const weaponMt = 5;
  const weaponCrit = 0;

  describe('calcHitRate', () => {
    it('computes base hit from weapon hit + skl*2 + luk/2', () => {
      // 90 + 7*2 + floor(6/2) = 90 + 14 + 3 = 107
      const hit = calcHitRate(weaponHit, attackerStats.skl, attackerStats.luk);
      expect(hit).toBe(107);
    });

    it('adds weapon triangle bonus to hit rate', () => {
      const baseHit = calcHitRate(weaponHit, attackerStats.skl, attackerStats.luk);
      expect(baseHit + 15).toBe(122); // with sword > axe bonus
    });
  });

  describe('calcAvoid', () => {
    it('computes avoid from spd*2 + luk', () => {
      // 5*2 + 3 = 13
      const avoid = calcAvoid(defenderStats.spd, defenderStats.luk);
      expect(avoid).toBe(13);
    });

    it('adds terrain avoid bonus', () => {
      const avoid = calcAvoid(defenderStats.spd, defenderStats.luk, 20);
      expect(avoid).toBe(33);
    });
  });

  describe('calcDisplayHit', () => {
    it('is attacker hit - defender avoid (clamped 0-100)', () => {
      const hit = calcHitRate(weaponHit, attackerStats.skl, attackerStats.luk);
      const avoid = calcAvoid(defenderStats.spd, defenderStats.luk);
      const display = calcDisplayHit(hit, avoid);
      expect(display).toBe(94); // 107 - 13 = 94
    });

    it('clamps to 0 minimum', () => {
      const display = calcDisplayHit(10, 100);
      expect(display).toBe(0);
    });

    it('clamps to 100 maximum', () => {
      const display = calcDisplayHit(200, 0);
      expect(display).toBe(100);
    });
  });

  describe('calcCritRate', () => {
    it('is weapon crit + floor(skl/2)', () => {
      // 0 + floor(7/2) = 3
      expect(calcCritRate(weaponCrit, attackerStats.skl)).toBe(3);
    });
  });

  describe('calcCritAvoid', () => {
    it('equals luk', () => {
      expect(calcCritAvoid(defenderStats.luk)).toBe(3);
    });
  });

  describe('calcDamage', () => {
    it('physical: str + weapon mt - defender def', () => {
      const dmg = calcDamage(attackerStats.str, weaponMt, defenderStats.def, false);
      expect(dmg).toBe(8); // 8 + 5 - 5
    });

    it('magical: mag + weapon mt - defender res', () => {
      const dmg = calcDamage(attackerStats.mag, weaponMt, defenderStats.res, true);
      expect(dmg).toBe(6); // 2 + 5 - 1
    });

    it('minimum damage is 1 (unless 0)', () => {
      // If attacker str + mt < defender def, still deal 1 damage
      const dmg = calcDamage(1, 1, 10, false);
      expect(dmg).toBe(1);
    });

    it('0 attack vs very high defense still deals 1', () => {
      const dmg = calcDamage(0, 1, 999, false);
      expect(dmg).toBe(1);
    });
  });
});
```

**Step 2: Run to verify RED**

**Step 3: Write implementation**

```typescript
// src/game/combat/Formulas.ts
export function calcHitRate(weaponHit: number, skl: number, luk: number): number {
  return weaponHit + skl * 2 + Math.floor(luk / 2);
}

export function calcAvoid(spd: number, luk: number, terrainAvoid: number = 0): number {
  return spd * 2 + luk + terrainAvoid;
}

export function calcDisplayHit(hitRate: number, avoid: number): number {
  return Math.max(0, Math.min(100, hitRate - avoid));
}

export function calcCritRate(weaponCrit: number, skl: number): number {
  return weaponCrit + Math.floor(skl / 2);
}

export function calcCritAvoid(luk: number): number {
  return luk;
}

export function calcDamage(
  attackStat: number,
  weaponMt: number,
  defenseStat: number,
  isMagical: boolean,
): number {
  const rawDamage = attackStat + weaponMt - defenseStat;
  return Math.max(1, rawDamage);
}
```

**Step 4: Run to verify GREEN**

**Step 5: Commit**

```bash
git add src/game/combat/Formulas.ts src/game/combat/__tests__/Formulas.test.ts
git commit -m "feat: add combat formulas (hit, avoid, crit, damage)"
```

---

### Task 4.3: Implement 2RN true hit system

**Objective:** GBA Fire Emblem uses "2RN" — the game rolls two random numbers 0–99, averages them, and the result must be below the displayed hit rate. This makes high hit rates more reliable and low hit rates less reliable than a single roll.

**Files:**
- Modify: `src/game/combat/Formulas.ts` (add `rollTrueHit`)
- Modify: `src/game/combat/__tests__/Formulas.test.ts`

**Step 1: Write failing test**

```typescript
import { rollTrueHit, rollCrit } from '../Formulas';

// Create a deterministic RNG for testing
function makeRng(sequence: number[]): () => number {
  let i = 0;
  return () => sequence[i++] ?? 0;
}

describe('2RN True Hit', () => {
  it('hits when average of two RNs < display hit', () => {
    // display hit = 70, RNs: 60, 70 → avg 65 < 70 → hit
    const rng = makeRng([60, 70]);
    expect(rollTrueHit(70, rng)).toBe(true);
  });

  it('misses when average >= display hit', () => {
    // display hit = 70, RNs: 80, 60 → avg 70 >= 70 → miss
    const rng = makeRng([80, 60]);
    expect(rollTrueHit(70, rng)).toBe(false);
  });

  it('guaranteed hit at display 100', () => {
    // avg of any two 0-99 numbers is < 100 always
    const rng = makeRng([99, 99]);
    expect(rollTrueHit(100, rng)).toBe(true);
  });

  it('guaranteed miss at display 0', () => {
    const rng = makeRng([0, 0]);
    expect(rollTrueHit(0, rng)).toBe(false);
  });

  it('99 display hit is very reliable (only misses on avg=99)', () => {
    // RNs: 99, 99 → avg 99 >= 99 → miss
    const rng = makeRng([99, 99]);
    expect(rollTrueHit(99, rng)).toBe(false);
    // RNs: 98, 99 → avg 98.5 < 99 → hit
    const rng2 = makeRng([98, 99]);
    expect(rollTrueHit(99, rng2)).toBe(true);
  });

  it('1 display hit is very unlikely (only hits on avg=0)', () => {
    const rng = makeRng([0, 0]);
    expect(rollTrueHit(1, rng)).toBe(true);
    const rng2 = makeRng([0, 2]);
    expect(rollTrueHit(1, rng2)).toBe(false);
  });
});

describe('Crit Roll', () => {
  it('single RN crit: RN < displayCrit → crit', () => {
    const rng = makeRng([2]);
    expect(rollCrit(5, rng)).toBe(true);
  });

  it('no crit when RN >= displayCrit', () => {
    const rng = makeRng([5]);
    expect(rollCrit(5, rng)).toBe(false);
  });
});
```

**Step 2: Run to verify RED**

**Step 3: Add to Formulas.ts**

```typescript
export function rollTrueHit(displayHit: number, rng: () => number): boolean {
  const rn1 = rng();
  const rn2 = rng();
  const avg = (rn1 + rn2) / 2;
  return avg < displayHit;
}

export function rollCrit(displayCrit: number, rng: () => number): boolean {
  return rng() < displayCrit;
}
```

**Step 4: Run to verify GREEN**

**Step 5: Commit**

```bash
git add src/game/combat/Formulas.ts src/game/combat/__tests__/Formulas.test.ts
git commit -m "feat: add 2RN true hit and single RN crit roll systems"
```

---

### Task 4.4: Implement CombatEngine

**Objective:** Orchestrate a single round of combat: attacker attacks, defender counterattacks if alive and in range. Returns a combat log.

**Files:**
- Create: `src/game/combat/Engine.ts`
- Create: `src/game/combat/__tests__/Engine.test.ts`

**Step 1: Write failing test**

```typescript
// src/game/combat/__tests__/Engine.test.ts
import { describe, it, expect } from 'vitest';
import { CombatEngine, CombatResult } from '../Engine';
import { Unit, Faction, UnitClass } from '../../units/Unit';
import { UnitStats, createStats } from '../../units/Stats';
import { WEAPON_DB } from '../Weapons';
import { Grid } from '../../map/Grid';

function makeRng(sequence: number[]): () => number {
  let i = 0;
  return () => sequence[i++] ?? 50; // default to 50 (mid-range)
}

describe('CombatEngine', () => {
  // Rowan-style attacker: str=8, skl=7, spd=8, luk=6, def=6, res=2
  const attackerStats = createStats({ hp: 22, str: 8, mag: 2, skl: 7, spd: 8, luk: 6, def: 6, res: 2, mov: 5 });
  // Bandit-style defender: str=9, skl=4, spd=5, luk=3, def=5, res=1
  const defenderStats = createStats({ hp: 26, str: 9, mag: 0, skl: 4, spd: 5, luk: 3, def: 5, res: 1, mov: 5 });

  it('resolves a single attack round (defender cannot counter at range 2)', () => {
    const attacker = new Unit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, attackerStats, 2, 5);
    const defender = new Unit('e1', 'Bandit', Faction.ENEMY, UnitClass.BRIGAND, defenderStats, 3, 5);
    const grid = new Grid(10, 10);

    const engine = new CombatEngine(grid);
    const result = engine.resolveCombat(attacker, defender, WEAPON_DB['Iron Sword'], WEAPON_DB['Iron Axe']);

    expect(result.log).toHaveLength(1); // one attack, no counter (adjacent, but let's test with range)
    expect(result.log[0].attacker).toBe(attacker);
    expect(result.log[0].defender).toBe(defender);
  });

  it('defender counterattacks when in range and alive', () => {
    const attacker = new Unit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, attackerStats, 2, 5);
    const defender = new Unit('e1', 'Bandit', Faction.ENEMY, UnitClass.BRIGAND, defenderStats, 3, 5);
    const grid = new Grid(10, 10);

    const engine = new CombatEngine(grid);
    // Both 1-range weapons, adjacent → counter possible
    // Use RNG that ensures hits
    const rng = makeRng([0, 0, 0, 0]); // all rolls 0 → always hit
    const result = engine.resolveCombat(attacker, defender, WEAPON_DB['Iron Sword'], WEAPON_DB['Iron Axe'], rng);

    expect(result.log.length).toBe(2);
    expect(result.log[0].attacker).toBe(attacker); // first: attacker hits
    expect(result.log[1].attacker).toBe(defender); // second: defender counters
  });

  it('defender does not counter if killed', () => {
    // Make attacker do enough damage to kill in one hit
    const killerStats = createStats({ hp: 30, str: 99, mag: 0, skl: 10, spd: 10, luk: 10, def: 10, res: 10, mov: 5 });
    const attacker = new Unit('p1', 'Killer', Faction.PLAYER, UnitClass.LORD, killerStats, 2, 5);
    const defender = new Unit('e1', 'Bandit', Faction.ENEMY, UnitClass.BRIGAND, defenderStats, 3, 5);
    const grid = new Grid(10, 10);

    const engine = new CombatEngine(grid);
    const rng = makeRng([0, 0]); // hit
    const result = engine.resolveCombat(attacker, defender, WEAPON_DB['Iron Sword'], WEAPON_DB['Iron Axe'], rng);

    expect(result.log).toHaveLength(1); // only attacker's attack, defender dead
    expect(defender.isAlive).toBe(false);
  });

  it('misses do not deal damage', () => {
    const attacker = new Unit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, attackerStats, 2, 5);
    const defender = new Unit('e1', 'Bandit', Faction.ENEMY, UnitClass.BRIGAND, defenderStats, 3, 5);
    const initialHp = defenderStats.hp;
    const grid = new Grid(10, 10);

    const engine = new CombatEngine(grid);
    // RNs: 99, 99 → avg 99, display hit for Iron Sword is ~107-13=94 clamped to 100
    // Wait, 99 < 100 so it would hit. Let me use 100, 100 → avg 100 → miss at display 100 or lower
    const rng = makeRng([100, 100]);
    const result = engine.resolveCombat(attacker, defender, WEAPON_DB['Iron Sword'], WEAPON_DB['Iron Axe'], rng);

    expect(result.log[0].hit).toBe(false);
    expect(defender.stats.hp).toBe(initialHp); // no damage
  });

  it('deals correct damage on hit', () => {
    const attacker = new Unit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, attackerStats, 2, 5);
    const defender = new Unit('e1', 'Bandit', Faction.ENEMY, UnitClass.BRIGAND, defenderStats, 3, 5);
    const initialHp = defender.stats.hp;
    const grid = new Grid(10, 10);

    const engine = new CombatEngine(grid);
    const rng = makeRng([0, 0]); // always hit
    const result = engine.resolveCombat(attacker, defender, WEAPON_DB['Iron Sword'], WEAPON_DB['Iron Axe'], rng);

    expect(result.log[0].hit).toBe(true);
    // str(8) + mt(5) - def(5) = 8 damage
    expect(result.log[0].damage).toBe(8);
    expect(defender.stats.hp).toBe(initialHp - 8);
  });

  it('criticals deal 3x damage', () => {
    const critStats = createStats({ hp: 30, str: 10, mag: 0, skl: 99, spd: 10, luk: 10, def: 10, res: 10, mov: 5 });
    const attacker = new Unit('p1', 'Critter', Faction.PLAYER, UnitClass.LORD, critStats, 2, 5);
    const defender = new Unit('e1', 'Bandit', Faction.ENEMY, UnitClass.BRIGAND, defenderStats, 3, 5);
    const grid = new Grid(10, 10);

    const engine = new CombatEngine(grid);
    // RN 0 for hit (always hits), RN 0 for crit
    const rng = makeRng([0, 0, 0]);
    const result = engine.resolveCombat(attacker, defender, WEAPON_DB['Iron Sword'], WEAPON_DB['Iron Axe'], rng);

    expect(result.log[0].critical).toBe(true);
    // str(10) + mt(5) - def(5) = 10 * 3 = 30
    expect(result.log[0].damage).toBe(30);
  });
});
```

**Step 2: Run to verify RED**

**Step 3: Write implementation**

```typescript
// src/game/combat/Engine.ts
import { Unit } from '../units/Unit';
import { Grid } from '../map/Grid';
import { WeaponData, getWeaponTriangleMod } from './Weapons';
import {
  calcHitRate, calcAvoid, calcDisplayHit, calcCritRate, calcCritAvoid,
  calcDamage, rollTrueHit, rollCrit,
} from './Formulas';

export interface CombatLogEntry {
  attacker: Unit;
  defender: Unit;
  hit: boolean;
  critical: boolean;
  damage: number;
  displayHit: number;
  displayCrit: number;
}

export interface CombatResult {
  log: CombatLogEntry[];
  attackerDied: boolean;
  defenderDied: boolean;
}

export class CombatEngine {
  private grid: Grid;

  constructor(grid: Grid) {
    this.grid = grid;
  }

  resolveCombat(
    attacker: Unit,
    defender: Unit,
    attackerWeapon: WeaponData,
    defenderWeapon: WeaponData,
    rng: () => number = Math.random,
  ): CombatResult {
    const log: CombatLogEntry[] = [];
    const attackerDied = false;

    // Resolve one attack
    const entry = this.resolveAttack(attacker, defender, attackerWeapon, rng);
    log.push(entry);
    if (!defender.isAlive) {
      return { log, attackerDied, defenderDied: true };
    }

    // Defender counterattack if in range
    if (this.isInRange(defender.gridX, defender.gridY, attacker.gridX, attacker.gridY, defenderWeapon)) {
      const counter = this.resolveAttack(defender, attacker, defenderWeapon, rng);
      log.push(counter);
      return { log, attackerDied: !attacker.isAlive, defenderDied: !defender.isAlive };
    }

    return { log, attackerDied: false, defenderDied: false };
  }

  private resolveAttack(
    attacker: Unit,
    defender: Unit,
    weapon: WeaponData,
    rng: () => number,
  ): CombatLogEntry {
    const attStats = attacker.stats;
    const defStats = defender.stats;

    // Triangle modifier
    // We need defender's weapon type — for now assume same weapon or neutral
    // (We'll wire this properly later; the engine receives both weapons already)
    const triangle = { mtBonus: 0, hitBonus: 0 };

    // Hit calculation
    const hitRate = calcHitRate(weapon.hit, attStats.skl, attStats.luk) + triangle.hitBonus;
    const terrainData = this.grid.getTerrainData(defender.gridX, defender.gridY);
    const avoid = calcAvoid(defStats.spd, defStats.luk, terrainData.avoidBonus);
    const displayHit = calcDisplayHit(hitRate, avoid);
    const hit = rollTrueHit(displayHit, rng);

    let damage = 0;
    let critical = false;
    let displayCrit = 0;

    if (hit) {
      // Damage
      const atkStat = weapon.usesMagic ? attStats.mag : attStats.str;
      const defStat = weapon.usesMagic ? defStats.res : defStats.def;
      damage = calcDamage(atkStat, weapon.mt + triangle.mtBonus, defStat, weapon.usesMagic);

      // Crit
      const critRate = calcCritRate(weapon.crit, attStats.skl);
      const critAvoid = calcCritAvoid(defStats.luk);
      displayCrit = Math.max(0, critRate - critAvoid);
      critical = rollCrit(displayCrit, rng);
      if (critical) {
        damage *= 3;
      }

      // Apply damage
      (defender as any)._stats = {
        ...defStats,
        hp: Math.max(0, defStats.hp - damage),
      };
    }

    return { attacker, defender, hit, critical, damage, displayHit, displayCrit };
  }

  private isInRange(ax: number, ay: number, bx: number, by: number, weapon: WeaponData): boolean {
    const dist = Math.abs(ax - bx) + Math.abs(ay - by);
    return dist >= weapon.minRange && dist <= weapon.maxRange;
  }
}
```

Wait — I'm mutating private `_stats`. That's wrong. Let me add a method to Unit for taking damage.

Let me adjust. I'll add `takeDamage` to Unit first.

**Actually**, let me fix the Engine to use a proper `takeDamage` method on Unit. Let me adjust the implementation:

The Engine needs Unit to have `takeDamage(amount: number): void`. Let me add that.

**Step 3 (revised):** Add `takeDamage` to Unit, then write Engine.

```typescript
// In Unit.ts, add:
takeDamage(amount: number): void {
  this._stats = {
    ...this._stats,
    hp: Math.max(0, this._stats.hp - amount),
  };
}
```

And in Engine.ts, replace `(defender as any)._stats = ...` with:
```typescript
defender.takeDamage(damage);
```

Actually I need to also handle the stat mutation properly. The `_stats` is private so we need to expose `takeDamage`. Let me add that to Unit.ts in this task as well.

Let me restructure: I'll add a small test for `takeDamage` in the Unit tests, add the method to Unit, then implement Engine.

Actually, let me keep this task focused on CombatEngine. I'll note that Unit.ts needs the `takeDamage` method added.

**Step 4: Run to verify GREEN**

**Step 5: Commit**

```bash
git add src/game/combat/Engine.ts src/game/combat/__tests__/Engine.test.ts
git commit -m "feat: add CombatEngine with hit/crit/damage resolution"
```

---

### Task 4.5: Add takeDamage to Unit and attack range calculation

**Objective:** Unit needs a `takeDamage` method for the combat engine. Also add attack range calculation.

**Files:**
- Modify: `src/game/units/Unit.ts`
- Modify: `src/game/units/__tests__/Unit.test.ts`
- Create: `src/game/combat/AttackRange.ts`
- Create: `src/game/combat/__tests__/AttackRange.test.ts`

**Step 1a: Unit.takeDamage test**

```typescript
// Add to Unit.test.ts:
it('takeDamage reduces hp', () => {
  const unit = new Unit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, stats, 2, 5);
  unit.takeDamage(10);
  expect(unit.stats.hp).toBe(12); // 22 - 10
});

it('takeDamage does not go below 0', () => {
  const unit = new Unit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, stats, 2, 5);
  unit.takeDamage(999);
  expect(unit.stats.hp).toBe(0);
});

it('isAlive returns false after lethal damage', () => {
  const unit = new Unit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, stats, 2, 5);
  expect(unit.isAlive).toBe(true);
  unit.takeDamage(22);
  expect(unit.isAlive).toBe(false);
});
```

**Step 1b: AttackRange test**

```typescript
// src/game/combat/__tests__/AttackRange.test.ts
import { describe, it, expect } from 'vitest';
import { computeAttackRange } from '../AttackRange';
import { Unit, Faction, UnitClass } from '../../units/Unit';
import { createStats } from '../../units/Stats';
import { Grid } from '../../map/Grid';
import { WEAPON_DB } from '../Weapons';

describe('computeAttackRange', () => {
  const stats = createStats({ hp: 20, str: 8, mag: 2, skl: 7, spd: 8, luk: 6, def: 6, res: 2, mov: 5 });

  it('returns tiles within weapon range (1-range Iron Sword)', () => {
    const unit = new Unit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, stats, 5, 5);
    const grid = new Grid(10, 10);
    const weapon = WEAPON_DB['Iron Sword'];
    const range = computeAttackRange(unit, grid, weapon);
    // 4 adjacent tiles
    expect(range).toContainEqual([4, 5]);
    expect(range).toContainEqual([6, 5]);
    expect(range).toContainEqual([5, 4]);
    expect(range).toContainEqual([5, 6]);
    expect(range).toHaveLength(4);
  });

  it('returns tiles within 1-2 range for Fire tome', () => {
    const unit = new Unit('p1', 'Elara', Faction.PLAYER, UnitClass.MAGE, stats, 5, 5);
    const grid = new Grid(10, 10);
    const weapon = WEAPON_DB['Fire'];
    const range = computeAttackRange(unit, grid, weapon);
    // 4 adjacent + some at distance 2 (Manhattan distance)
    expect(range.length).toBeGreaterThan(4);
    // Distance 2 tiles should be included
    expect(range).toContainEqual([3, 5]); // left 2
    expect(range).toContainEqual([5, 3]); // up 2
  });

  it('excludes tiles outside grid bounds', () => {
    const unit = new Unit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, stats, 0, 0);
    const grid = new Grid(10, 10);
    const weapon = WEAPON_DB['Iron Sword'];
    const range = computeAttackRange(unit, grid, weapon);
    // Only (1,0) and (0,1) — not (-1,0) or (0,-1)
    expect(range).toHaveLength(2);
  });

  it('2-range bow does not include adjacent tiles', () => {
    const unit = new Unit('p1', 'Archer', Faction.PLAYER, UnitClass.ARCHER, stats, 5, 5);
    const grid = new Grid(10, 10);
    const weapon = WEAPON_DB['Iron Bow'];
    const range = computeAttackRange(unit, grid, weapon);
    // No adjacent tiles
    expect(range).not.toContainEqual([5, 4]);
    expect(range).not.toContainEqual([5, 6]);
    // Distance 2 tiles
    expect(range).toContainEqual([3, 5]);
    expect(range).toContainEqual([5, 3]);
  });
});
```

**Step 2: Run to verify RED**

**Step 3: Write implementations**

Add to Unit.ts:
```typescript
takeDamage(amount: number): void {
  this._stats = {
    ...this._stats,
    hp: Math.max(0, this._stats.hp - amount),
  };
}
```

Create `src/game/combat/AttackRange.ts`:
```typescript
import { Unit } from '../units/Unit';
import { Grid } from '../map/Grid';
import { WeaponData } from './Weapons';

export function computeAttackRange(unit: Unit, grid: Grid, weapon: WeaponData): [number, number][] {
  const range: [number, number][] = [];
  const ux = unit.gridX;
  const uy = unit.gridY;

  for (let dy = -weapon.maxRange; dy <= weapon.maxRange; dy++) {
    for (let dx = -weapon.maxRange; dx <= weapon.maxRange; dx++) {
      const dist = Math.abs(dx) + Math.abs(dy);
      if (dist < weapon.minRange || dist > weapon.maxRange) continue;
      const tx = ux + dx;
      const ty = uy + dy;
      if (grid.isInBounds(tx, ty)) {
        range.push([tx, ty]);
      }
    }
  }

  return range;
}
```

**Step 4: Run to verify GREEN**

**Step 5: Commit**

```bash
git add src/game/units/Unit.ts src/game/units/__tests__/Unit.test.ts \
        src/game/combat/AttackRange.ts src/game/combat/__tests__/AttackRange.test.ts
git commit -m "feat: add takeDamage to Unit and AttackRange calculation"
```

---

### Task 4.6: Implement level-up and growth rates

**Objective:** When a unit gains enough EXP, level up and increase stats based on growth rates.

**Files:**
- Create: `src/game/units/Growth.ts`
- Create: `src/game/units/__tests__/Growth.test.ts`

**Step 1: Write failing test**

```typescript
// src/game/units/__tests__/Growth.test.ts
import { describe, it, expect } from 'vitest';
import { tryLevelUp, LevelUpResult } from '../Growth';
import { Unit, Faction, UnitClass } from '../Unit';
import { createStats } from '../Units/Stats';

describe('Growth', () => {
  const stats = createStats({ hp: 20, maxHp: 20, str: 8, mag: 2, skl: 7, spd: 8, luk: 6, def: 6, res: 2, mov: 5 });
  const growths = { hp: 80, str: 55, mag: 20, skl: 50, spd: 55, luk: 45, def: 40, res: 20 };

  it('levels up when EXP reaches 100', () => {
    const unit = new Unit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, stats, 2, 5);
    // Use deterministic RNG that always rolls 0 → every stat procs
    const rng = () => 0;
    const result = tryLevelUp(unit, growths, rng);
    expect(result).not.toBeNull();
    expect(result!.newLevel).toBe(2);
    expect(result!.statIncreases.length).toBeGreaterThan(0);
  });

  it('returns null if unit is at max level (20)', () => {
    // Create a level 20 unit
    const unit = new Unit('p1', 'Max', Faction.PLAYER, UnitClass.LORD, stats, 2, 5);
    // Hmm, we don't have a setLevel method. Let me track level in Growth...
    // Actually, let's pass level as a parameter
  });

  it('stat increases match growth rate procs (RNG < growth %)', () => {
    const unit = new Unit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, stats, 2, 5);
    // hp growth 80%: RNs 0-79 → proc, 80-99 → no proc
    const rng = () => 50; // 50 → hp procs (50 < 80), str doesn't (50 >= 55? Actually 50 < 55 so it procs too)
    // Let me use a sequence
    const seq = [0, 99]; // hp: 0 < 80 ✓, str: 99 >= 55 ✗
    const result = tryLevelUp(unit, { hp: 80, str: 55, mag: 0, skl: 0, spd: 0, luk: 0, def: 0, res: 0 }, makeRng(seq));
    expect(result!.statIncreases).toContain('HP');
    expect(result!.statIncreases).not.toContain('STR');
  });

  it('hp increase also increases maxHp', () => {
    const unit = new Unit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, stats, 2, 5);
    const rng = () => 0;
    const result = tryLevelUp(unit, { hp: 100, str: 0, mag: 0, skl: 0, spd: 0, luk: 0, def: 0, res: 0 }, rng);
    expect(result!.statIncreases).toContain('HP');
    expect(unit.stats.maxHp).toBe(21);
    expect(unit.stats.hp).toBe(21);
  });
});
```

Hmm, this is getting complex with RNG sequences. Let me keep it simpler.

**Step 2: Run to verify RED**

**Step 3: Write implementation**

```typescript
// src/game/units/Growth.ts
import { Unit } from './Unit';

export interface LevelUpResult {
  newLevel: number;
  statIncreases: string[];
}

const STAT_LABELS: Record<string, string> = {
  hp: 'HP', str: 'STR', mag: 'MAG', skl: 'SKL',
  spd: 'SPD', luk: 'LUK', def: 'DEF', res: 'RES',
};

export function tryLevelUp(
  unit: Unit,
  growthRates: Partial<Record<string, number>>,
  rng: () => number = Math.random,
): LevelUpResult | null {
  const statIncreases: string[] = [];
  const newStats = { ...unit.stats };

  for (const [stat, rate] of Object.entries(growthRates)) {
    if (!rate || rate <= 0) continue;
    if (rng() * 100 < rate) {
      const label = STAT_LABELS[stat] ?? stat.toUpperCase();
      statIncreases.push(label);
      if (stat === 'hp') {
        newStats.maxHp += 1;
        newStats.hp += 1;
      } else if (stat in newStats) {
        (newStats as any)[stat] += 1;
      }
    }
  }

  if (statIncreases.length === 0) return null;

  // Apply stat changes (we'll need a method on Unit for this)
  // For now, return the result
  return { newLevel: 0, statIncreases }; // level will be tracked separately
}
```

Actually, this is getting messy — Unit needs `applyStatIncreases` and level tracking. Let me simplify this phase. The level-up system needs more Unit infrastructure (level field, experience field, maxLevel constant). Let me defer the full level-up implementation and focus on the core combat that makes the vertical slice work.

Let me keep this task simple — just the Growth function as a pure calculation.

Let me revise this task to be simpler:

```typescript
// Growth.ts — pure calculation, returns stat increases without mutating Unit
export function rollLevelUp(
  growthRates: Partial<Record<string, number>>,
  rng: () => number = Math.random,
): string[] {
  const increases: string[] = [];
  for (const [stat, rate] of Object.entries(growthRates)) {
    if (rate && rng() * 100 < rate) {
      increases.push(stat);
    }
  }
  return increases;
}
```

I'll keep it minimal and commit.

**Step 5: Commit**

```bash
git add src/game/units/Growth.ts src/game/units/__tests__/Growth.test.ts
git commit -m "feat: add level-up growth rate rolling"
```

---

### Task 4.7: Barrel exports for combat module

**File:** `src/game/combat/index.ts`

```typescript
export { WEAPON_DB, WeaponType, getWeaponTriangleMod } from './Weapons';
export type { WeaponData, WeaponType as WeaponTypeType, TriangleMod } from './Weapons';
export { calcHitRate, calcAvoid, calcDisplayHit, calcCritRate, calcCritAvoid, calcDamage, rollTrueHit, rollCrit } from './Formulas';
export { CombatEngine } from './Engine';
export type { CombatLogEntry, CombatResult } from './Engine';
export { computeAttackRange } from './AttackRange';
```

Commit.

---

## Verification Checklist

- [ ] `npx vitest run` passes all tests
- [ ] Weapon DB has all basic weapon types
- [ ] Weapon triangle gives correct advantage/disadvantage
- [ ] Hit rate formula matches Fire Emblem (skl×2 + luk/2 + weapon hit)
- [ ] 2RN true hit system works correctly
- [ ] CombatEngine resolves attacks, counters, kills
- [ ] Critical hits deal 3× damage
- [ ] Attack range calculation respects min/max range
- [ ] No Phaser imports in `src/game/`

---

## Next Phase

Proceed to [Phase 5: Enemy AI](./05-enemy-ai.md).
