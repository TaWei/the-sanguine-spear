# Phase 8: Character Progression (Leveling Up and Stats)

> **For Hermes:** Use `subagent-driven-development` skill to implement this plan task-by-task. Enforce strict TDD: write failing test, watch it fail, write minimal code, watch it pass, commit.

**Goal:** Implement Fire Emblem-style character progression: experience points (EXP), level-ups with growth-rate-based stat increases, class-based stat caps, and promotion.

**Architecture:** Pure game logic in `src/game/progression/`. `ProgressionEngine` handles EXP grants and level-ups. `GrowthRates` and `StatCaps` are plain data objects. `Unit` gains `level`, `exp`, and `growthRates`. All existing combat and stats systems remain untouched except for EXP reward hooks.

**Tech Stack:** TypeScript, Vitest

**Prerequisite:** Phases 0–7 complete (especially Phase 4 combat system).

---

## Fire Emblem Mechanics Reference

### Primary Stats (grow on level-up)
- **HP** — Hit Points. Current `hp` vs maximum `maxHp`.
- **Str** — Physical attack power.
- **Mag** — Magical attack power.
- **Skl** — Skill. Affects hit rate and crit rate.
- **Spd** — Speed. Affects avoid and follow-up attacks.
- **Lck** — Luck. Affects crit avoid, hit, and avoid.
- **Def** — Defense. Reduces physical damage.
- **Res** — Resistance. Reduces magical damage.
- **Mov** — Movement. Spaces the unit can move per turn.

### Secondary Stats (calculated from primary)
- **Hit** — `weaponHit + skl*2 + floor(luk/2)` (already in `Formulas.ts`)
- **Avoid** — `spd*2 + luk + terrainAvoid` (already in `Formulas.ts`)
- **Crit** — `weaponCrit + floor(skl/2)` (already in `Formulas.ts`)
- **Ddg** (Dodge) — `luk` (already in `Formulas.ts` as `calcCritAvoid`)

### Level & Experience
- Unpromoted classes: levels 1–20.
- Promoted classes: levels 1–20 (or effectively 21–40 in some titles).
- **100 EXP** required per level-up.
- EXP sources: dealing damage, killing enemies, using staves, etc.
- When EXP reaches ≥ 100, a level-up triggers: one stat roll per point over 100 carries over.

### Growth Rates
- Each unit has a growth rate % for each primary stat (e.g., HP 80%, Str 55%).
- On level-up, roll `rng() * 100 < rate` for each stat. If true, that stat increases by 1.
- **HP increases maxHp by 1 and heals current hp by 1** (or fully heals—pick one and document it).
- Guaranteed minimum: if no stats proc, reroll until at least one does (Fire Emblem convention).

### Stat Caps
- Each class has maximum values (caps) for each stat.
- A stat cannot exceed its cap via level-up.
- If a stat is at cap, it cannot proc on level-up.
- Caps may change on class change / promotion.

### Promotion
- At level 10+ (unpromoted), a unit may promote to an advanced class.
- Promotion grants immediate stat bonuses (flat additions, not rolls).
- Promotion raises level cap and changes class stat caps.
- Promotion typically resets level to 1 (promoted) while preserving total effective level.

---

## Task 8.1: Define GrowthRates and StatCaps types

**Objective:** Create strongly-typed interfaces for per-stat growth rates and per-class stat maximums.

**Files:**
- Create: `src/game/progression/GrowthRates.ts`
- Create: `src/game/progression/StatCaps.ts`
- Create: `src/game/progression/__tests__/GrowthRates.test.ts`
- Create: `src/game/progression/__tests__/StatCaps.test.ts`

**Step 1: Write failing tests**

```typescript
// src/game/progression/__tests__/GrowthRates.test.ts
import { describe, it, expect } from 'vitest';
import { GrowthRates, createGrowthRates } from '../GrowthRates';

describe('GrowthRates', () => {
  it('creates growth rates for all stats', () => {
    const growths: GrowthRates = createGrowthRates({
      hp: 80, str: 55, mag: 20, skl: 50, spd: 60, luk: 45, def: 35, res: 25, mov: 0,
    });
    expect(growths.hp).toBe(80);
    expect(growths.str).toBe(55);
    expect(growths.mov).toBe(0);
  });

  it('defaults missing stats to 0', () => {
    const growths = createGrowthRates({ hp: 50 });
    expect(growths.hp).toBe(50);
    expect(growths.str).toBe(0);
    expect(growths.skl).toBe(0);
  });

  it('clamps negative growths to 0', () => {
    const growths = createGrowthRates({ hp: -10 });
    expect(growths.hp).toBe(0);
  });

  it('clamps growths above 100 to 100', () => {
    const growths = createGrowthRates({ hp: 150 });
    expect(growths.hp).toBe(100);
  });
});
```

```typescript
// src/game/progression/__tests__/StatCaps.test.ts
import { describe, it, expect } from 'vitest';
import { StatCaps, CLASS_CAPS } from '../StatCaps';

describe('StatCaps', () => {
  it('lord class has defined caps', () => {
    const caps: StatCaps = CLASS_CAPS.lord;
    expect(caps.hp).toBeGreaterThan(0);
    expect(caps.str).toBeGreaterThan(0);
    expect(caps.mov).toBeGreaterThan(0);
  });

  it('every unit class has caps defined', () => {
    const classes = ['lord', 'mercenary', 'mage', 'archer', 'cavalry', 'pegasus_knight', 'soldier', 'brigand'];
    for (const cls of classes) {
      expect(CLASS_CAPS[cls as keyof typeof CLASS_CAPS]).toBeDefined();
    }
  });
});
```

**Step 2: Run tests to verify RED**

```bash
npx vitest run src/game/progression/__tests__/GrowthRates.test.ts src/game/progression/__tests__/StatCaps.test.ts
```

**Step 3: Write minimal implementation**

```typescript
// src/game/progression/GrowthRates.ts
export interface GrowthRates {
  hp: number;
  str: number;
  mag: number;
  skl: number;
  spd: number;
  luk: number;
  def: number;
  res: number;
  mov: number;
}

export function createGrowthRates(partial: Partial<GrowthRates> = {}): GrowthRates {
  const clamp = (n: number) => Math.max(0, Math.min(100, n));
  return {
    hp: clamp(partial.hp ?? 0),
    str: clamp(partial.str ?? 0),
    mag: clamp(partial.mag ?? 0),
    skl: clamp(partial.skl ?? 0),
    spd: clamp(partial.spd ?? 0),
    luk: clamp(partial.luk ?? 0),
    def: clamp(partial.def ?? 0),
    res: clamp(partial.res ?? 0),
    mov: clamp(partial.mov ?? 0),
  };
}
```

```typescript
// src/game/progression/StatCaps.ts
import { UnitStats } from '../units/Stats';

export type StatCaps = Required<Pick<UnitStats, 'hp' | 'str' | 'mag' | 'skl' | 'spd' | 'luk' | 'def' | 'res' | 'mov'>>;

export const CLASS_CAPS: Record<string, StatCaps> = {
  lord:            { hp: 60, str: 27, mag: 20, skl: 28, spd: 30, luk: 30, def: 22, res: 22, mov: 6 },
  mercenary:       { hp: 60, str: 26, mag: 20, skl: 30, spd: 28, luk: 25, def: 24, res: 20, mov: 5 },
  mage:            { hp: 55, str: 20, mag: 29, skl: 28, spd: 27, luk: 25, def: 15, res: 28, mov: 5 },
  archer:          { hp: 60, str: 25, mag: 20, skl: 30, spd: 29, luk: 25, def: 20, res: 20, mov: 5 },
  cavalry:         { hp: 60, str: 28, mag: 20, skl: 27, spd: 26, luk: 25, def: 26, res: 20, mov: 7 },
  pegasus_knight:  { hp: 55, str: 24, mag: 22, skl: 28, spd: 32, luk: 30, def: 18, res: 26, mov: 7 },
  soldier:         { hp: 60, str: 25, mag: 20, skl: 26, spd: 24, luk: 25, def: 25, res: 22, mov: 5 },
  brigand:         { hp: 62, str: 30, mag: 15, skl: 22, spd: 25, luk: 20, def: 20, res: 15, mov: 5 },
};
```

**Step 4: Run tests to verify GREEN**

```bash
npx vitest run src/game/progression/__tests__
```

**Step 5: Commit**

```bash
git add src/game/progression/GrowthRates.ts src/game/progression/StatCaps.ts src/game/progression/__tests__
git commit -m "feat(progression): add GrowthRates and StatCaps types with tests"
```

---

## Task 8.2: Implement LevelUpEngine (roll + apply growths with caps)

**Objective:** Given a unit's current stats, growth rates, and class caps, roll for stat increases and return the new stats plus which stats increased.

**Files:**
- Create: `src/game/progression/LevelUpEngine.ts`
- Create: `src/game/progression/__tests__/LevelUpEngine.test.ts`

**Step 1: Write failing tests**

```typescript
// src/game/progression/__tests__/LevelUpEngine.test.ts
import { describe, it, expect } from 'vitest';
import { levelUp, LevelUpResult } from '../LevelUpEngine';
import { UnitStats, createStats } from '../../units/Stats';
import { GrowthRates, createGrowthRates } from '../GrowthRates';
import { StatCaps } from '../StatCaps';

function makeRng(sequence: number[]): () => number {
  let i = 0;
  return () => sequence[i++] ?? 0.99;
}

describe('LevelUpEngine', () => {
  const baseStats = createStats({ hp: 20, str: 8, mag: 2, skl: 7, spd: 8, luk: 6, def: 6, res: 2, mov: 5 });
  const caps: StatCaps = { hp: 60, str: 27, mag: 20, skl: 28, spd: 30, luk: 30, def: 22, res: 22, mov: 6 };

  it('increases stats where RNG rolls below growth rate', () => {
    const growths = createGrowthRates({ hp: 100, str: 0, skl: 100 });
    const rng = makeRng([0, 0]); // both proc
    const result = levelUp(baseStats, growths, caps, rng);
    expect(result.increases).toContain('hp');
    expect(result.increases).toContain('skl');
    expect(result.increases).not.toContain('str');
    expect(result.newStats.hp).toBe(baseStats.hp + 1);
    expect(result.newStats.maxHp).toBe(baseStats.maxHp + 1);
    expect(result.newStats.skl).toBe(baseStats.skl + 1);
  });

  it('does not increase stats at cap', () => {
    const maxedStats = createStats({ hp: 60, str: 27, mag: 20, skl: 28, spd: 30, luk: 30, def: 22, res: 22, mov: 6 });
    const growths = createGrowthRates({ hp: 100, str: 100 });
    const rng = makeRng([0, 0]);
    const result = levelUp(maxedStats, growths, caps, rng);
    expect(result.increases).toEqual([]);
    expect(result.newStats.hp).toBe(maxedStats.hp);
  });

  it('guarantees at least one stat increase if any uncapped growth > 0', () => {
    const growths = createGrowthRates({ hp: 1 });
    // First roll misses, second roll hits (guaranteed reroll)
    const rng = makeRng([0.99, 0]);
    const result = levelUp(baseStats, growths, caps, rng);
    expect(result.increases.length).toBeGreaterThanOrEqual(1);
  });

  it('does not reroll if all applicable stats are capped', () => {
    const cappedStats = createStats({ hp: 60, str: 8, mag: 2, skl: 7, spd: 8, luk: 6, def: 6, res: 2, mov: 5 });
    const growths = createGrowthRates({ hp: 100 }); // hp capped, nothing else grows
    const rng = makeRng([0]);
    const result = levelUp(cappedStats, growths, caps, rng);
    expect(result.increases).toEqual([]);
  });

  it('does not modify original stats object', () => {
    const growths = createGrowthRates({ hp: 100 });
    const rng = makeRng([0]);
    levelUp(baseStats, growths, caps, rng);
    expect(baseStats.hp).toBe(20);
    expect(baseStats.maxHp).toBe(20);
  });
});
```

**Step 2: Run to verify RED**

```bash
npx vitest run src/game/progression/__tests__/LevelUpEngine.test.ts
```

**Step 3: Write minimal implementation**

```typescript
// src/game/progression/LevelUpEngine.ts
import { UnitStats } from '../units/Stats';
import { GrowthRates } from './GrowthRates';
import { StatCaps } from './StatCaps';

export interface LevelUpResult {
  newStats: UnitStats;
  increases: string[];
}

export function levelUp(
  stats: UnitStats,
  growths: GrowthRates,
  caps: StatCaps,
  rng: () => number = Math.random,
): LevelUpResult {
  let increases: string[] = [];
  const newStats: UnitStats = { ...stats };

  const tryRoll = (): void => {
    increases = [];
    for (const key of Object.keys(growths) as (keyof GrowthRates)[]) {
      const rate = growths[key];
      const current = newStats[key];
      const cap = caps[key];
      if (rate > 0 && current < cap) {
        if (rng() * 100 < rate) {
          increases.push(key);
          (newStats as Record<keyof GrowthRates, number>)[key] = current + 1;
        }
      }
    }
  };

  tryRoll();

  // Fire Emblem guarantee: if no stats proc and at least one uncapped growth exists, reroll
  const hasUncappedGrowth = (Object.keys(growths) as (keyof GrowthRates)[]).some(
    (k) => growths[k] > 0 && newStats[k] < caps[k],
  );

  let rerollSafety = 0;
  while (increases.length === 0 && hasUncappedGrowth && rerollSafety < 10) {
    tryRoll();
    rerollSafety++;
  }

  // If hp increased, heal current hp by 1 as well (maxHp already bumped)
  if (increases.includes('hp')) {
    newStats.hp = Math.min(newStats.maxHp, newStats.hp + 1);
  }

  return { newStats, increases };
}
```

**Step 4: Run to verify GREEN**

```bash
npx vitest run src/game/progression/__tests__/LevelUpEngine.test.ts
```

**Step 5: Commit**

```bash
git add src/game/progression/LevelUpEngine.ts src/game/progression/__tests__/LevelUpEngine.test.ts
git commit -m "feat(progression): add LevelUpEngine with cap enforcement and guaranteed proc"
```

---

## Task 8.3: Add level, exp, and growthRates to Unit

**Objective:** Extend the `Unit` class to track level, EXP, and growth rates. Add methods for gaining EXP and applying level-ups.

**Files:**
- Modify: `src/game/units/Unit.ts`
- Modify: `src/game/units/index.ts`
- Modify: `src/game/units/__tests__/Unit.test.ts`

**Step 1: Write failing tests**

Add to `src/game/units/__tests__/Unit.test.ts`:

```typescript
import { createGrowthRates, GrowthRates } from '../../progression/GrowthRates';

// ... inside describe('Unit', () => { ...

  it('starts at level 1 with 0 exp by default', () => {
    const unit = new Unit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, stats, 2, 5);
    expect(unit.level).toBe(1);
    expect(unit.exp).toBe(0);
  });

  it('can be constructed with a custom level and exp', () => {
    const unit = new Unit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, stats, 2, 5, { level: 5, exp: 30 });
    expect(unit.level).toBe(5);
    expect(unit.exp).toBe(30);
  });

  it('has default zero growth rates', () => {
    const unit = new Unit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, stats, 2, 5);
    expect(unit.growthRates.hp).toBe(0);
    expect(unit.growthRates.str).toBe(0);
  });

  it('can be constructed with custom growth rates', () => {
    const growths = createGrowthRates({ hp: 80, str: 55 });
    const unit = new Unit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, stats, 2, 5, { growthRates: growths });
    expect(unit.growthRates.hp).toBe(80);
    expect(unit.growthRates.str).toBe(55);
  });

  it('gainExp adds to exp total', () => {
    const unit = new Unit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, stats, 2, 5);
    unit.gainExp(40);
    expect(unit.exp).toBe(40);
  });

  it('gainExp does not exceed 99 below max level', () => {
    const unit = new Unit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, stats, 2, 5);
    unit.gainExp(150);
    expect(unit.exp).toBe(99);
  });

  it('is at max level when level reaches 20 (unpromoted)', () => {
    const unit = new Unit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, stats, 2, 5, { level: 20 });
    expect(unit.isAtMaxLevel).toBe(true);
  });

  it('is not at max level below 20', () => {
    const unit = new Unit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, stats, 2, 5, { level: 19 });
    expect(unit.isAtMaxLevel).toBe(false);
  });
```

**Step 2: Run to verify RED**

```bash
npx vitest run src/game/units/__tests__/Unit.test.ts
```

**Step 3: Modify Unit.ts**

```typescript
// Add imports at top
import { GrowthRates, createGrowthRates } from '../progression/GrowthRates';

// Add interface for optional constructor args
export interface UnitOptions {
  level?: number;
  exp?: number;
  growthRates?: GrowthRates;
}

// Modify constructor signature and body
  constructor(
    id: string,
    name: string,
    faction: Faction,
    unitClass: UnitClass,
    stats: UnitStats,
    gridX: number,
    gridY: number,
    options: UnitOptions = {},
  ) {
    // ... existing assignments ...
    this._level = Math.max(1, Math.min(20, options.level ?? 1));
    this._exp = Math.max(0, Math.min(99, options.exp ?? 0));
    this._growthRates = options.growthRates ?? createGrowthRates();
  }

// Add private fields
  private _level: number;
  private _exp: number;
  private _growthRates: GrowthRates;

// Add getters
  get level(): number { return this._level; }
  get exp(): number { return this._exp; }
  get growthRates(): Readonly<GrowthRates> { return this._growthRates; }
  get isAtMaxLevel(): boolean { return this._level >= 20; }

// Add methods
  gainExp(amount: number): void {
    if (this.isAtMaxLevel) return;
    this._exp = Math.min(99, this._exp + amount);
  }

  applyLevelUp(newStats: UnitStats): void {
    this._stats = newStats;
    this._exp = 0;
    this._level = Math.min(20, this._level + 1);
  }
```

**Step 4: Run to verify GREEN**

```bash
npx vitest run src/game/units/__tests__/Unit.test.ts
```

**Step 5: Update barrel export in `src/game/units/index.ts`**

```typescript
export { Unit, Faction, UnitClass } from './Unit';
export type { Faction as FactionType, UnitClass as UnitClassType, UnitOptions } from './Unit';
export { createStats } from './Stats';
export type { UnitStats, UnitStatsInput } from './Stats';
```

**Step 6: Commit**

```bash
git add src/game/units/Unit.ts src/game/units/index.ts src/game/units/__tests__/Unit.test.ts
git commit -m "feat(units): add level, exp, and growthRates to Unit"
```

---

## Task 8.4: Create ProgressionEngine

**Objective:** A pure engine that orchestrates EXP grants, checks for level-up triggers, rolls stats, and applies them to the unit. Returns a detailed result for UI feedback.

**Files:**
- Create: `src/game/progression/ProgressionEngine.ts`
- Create: `src/game/progression/__tests__/ProgressionEngine.test.ts`

**Step 1: Write failing tests**

```typescript
// src/game/progression/__tests__/ProgressionEngine.test.ts
import { describe, it, expect } from 'vitest';
import { ProgressionEngine } from '../ProgressionEngine';
import { Unit, Faction, UnitClass } from '../../units/Unit';
import { createStats } from '../../units/Stats';
import { createGrowthRates } from '../GrowthRates';
import { CLASS_CAPS } from '../StatCaps';

function makeRng(sequence: number[]): () => number {
  let i = 0;
  return () => sequence[i++] ?? 0.99;
}

describe('ProgressionEngine', () => {
  const stats = createStats({ hp: 20, str: 8, mag: 2, skl: 7, spd: 8, luk: 6, def: 6, res: 2, mov: 5 });
  const growths = createGrowthRates({ hp: 100, str: 0, skl: 100 });

  it('grants exp without leveling up when below threshold', () => {
    const unit = new Unit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, stats, 0, 0, { growthRates: growths });
    const engine = new ProgressionEngine();
    const result = engine.grantExp(unit, 50);
    expect(result.leveledUp).toBe(false);
    expect(unit.exp).toBe(50);
    expect(unit.level).toBe(1);
  });

  it('levels up when exp reaches 100', () => {
    const unit = new Unit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, stats, 0, 0, { growthRates: growths });
    const engine = new ProgressionEngine();
    const rng = makeRng([0, 0]);
    const result = engine.grantExp(unit, 100, rng);
    expect(result.leveledUp).toBe(true);
    expect(result.levelUpResult).toBeDefined();
    expect(result.levelUpResult!.increases).toContain('hp');
    expect(result.levelUpResult!.increases).toContain('skl');
    expect(unit.level).toBe(2);
    expect(unit.exp).toBe(0);
    expect(unit.stats.hp).toBe(21);
  });

  it('carries over excess exp after level up', () => {
    const unit = new Unit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, stats, 0, 0, { growthRates: growths });
    const engine = new ProgressionEngine();
    const rng = makeRng([0, 0]);
    const result = engine.grantExp(unit, 130, rng);
    expect(result.leveledUp).toBe(true);
    expect(unit.exp).toBe(30);
  });

  it('does not grant exp when at max level', () => {
    const unit = new Unit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, stats, 0, 0, { level: 20, growthRates: growths });
    const engine = new ProgressionEngine();
    const result = engine.grantExp(unit, 100);
    expect(result.leveledUp).toBe(false);
    expect(unit.exp).toBe(0);
    expect(unit.level).toBe(20);
  });

  it('does not level up past max level', () => {
    const unit = new Unit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, stats, 0, 0, { level: 19, exp: 50, growthRates: growths });
    const engine = new ProgressionEngine();
    const rng = makeRng([0, 0]);
    engine.grantExp(unit, 100, rng); // should cap at level 20
    expect(unit.level).toBe(20);
    expect(unit.exp).toBe(50); // exp remains since max level
  });
});
```

**Step 2: Run to verify RED**

```bash
npx vitest run src/game/progression/__tests__/ProgressionEngine.test.ts
```

**Step 3: Write implementation**

```typescript
// src/game/progression/ProgressionEngine.ts
import { Unit } from '../units/Unit';
import { levelUp, LevelUpResult } from './LevelUpEngine';
import { CLASS_CAPS } from './StatCaps';

export interface ProgressionResult {
  expGained: number;
  leveledUp: boolean;
  levelUpResult?: LevelUpResult;
}

export class ProgressionEngine {
  grantExp(unit: Unit, amount: number, rng: () => number = Math.random): ProgressionResult {
    if (unit.isAtMaxLevel) {
      return { expGained: 0, leveledUp: false };
    }

    const previousExp = unit.exp;
    const totalExp = previousExp + amount;

    if (totalExp < 100) {
      unit.gainExp(amount);
      return { expGained: amount, leveledUp: false };
    }

    // Level up occurs
    const overflow = totalExp - 100;
    const caps = CLASS_CAPS[unit.unitClass];
    if (!caps) {
      throw new Error(`No stat caps defined for class: ${unit.unitClass}`);
    }

    const result = levelUp(unit.stats, unit.growthRates, caps, rng);
    unit.applyLevelUp(result.newStats);

    // After level-up, absorb overflow exp (but cap at 99 unless another level-up is desired)
    if (!unit.isAtMaxLevel && overflow > 0) {
      unit.gainExp(overflow);
    }

    return { expGained: amount, leveledUp: true, levelUpResult: result };
  }
}
```

**Step 4: Run to verify GREEN**

```bash
npx vitest run src/game/progression/__tests__/ProgressionEngine.test.ts
```

**Step 5: Commit**

```bash
git add src/game/progression/ProgressionEngine.ts src/game/progression/__tests__/ProgressionEngine.test.ts
git commit -m "feat(progression): add ProgressionEngine for EXP grants and level-ups"
```

---

## Task 8.5: Wire EXP rewards into CombatEngine

**Objective:** After combat resolves, award EXP to the attacker (and possibly defender). For now, grant flat EXP for dealing damage and a bonus for kills.

**Files:**
- Modify: `src/game/combat/Engine.ts`
- Modify: `src/game/combat/__tests__/Engine.test.ts`
- Modify: `src/game/GameEngine.ts` (optional: convenience method)

**Step 1: Write failing tests**

Add to `src/game/combat/__tests__/Engine.test.ts`:

```typescript
import { ProgressionEngine } from '../../progression/ProgressionEngine';
import { createGrowthRates } from '../../progression/GrowthRates';

  it('awards exp for dealing damage', () => {
    const attacker = new Unit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, attackerStats, 2, 5, { growthRates: createGrowthRates({ hp: 100 }) });
    const defender = new Unit('e1', 'Bandit', Faction.ENEMY, UnitClass.BRIGAND, defenderStats, 3, 5);
    const grid = new Grid(10, 10);
    const engine = new CombatEngine(grid);
    const progression = new ProgressionEngine();

    const rng = makeRng([0, 0, 0, 0]); // hit, no crit, counter miss, counter no crit
    const result = engine.resolveCombat(attacker, defender, WEAPON_DB['Iron Sword'], WEAPON_DB['Iron Axe'], rng);

    // Award 10 EXP per damage dealt, 30 bonus for kill
    const killBonus = result.defenderDied ? 30 : 0;
    const damageExp = result.log[0].hit ? 10 : 0;
    progression.grantExp(attacker, damageExp + killBonus);

    expect(attacker.exp).toBeGreaterThan(0);
  });
```

**Step 2: Run to verify RED**

```bash
npx vitest run src/game/combat/__tests__/Engine.test.ts
```

**Step 3: Add EXP helper to CombatEngine or GameEngine**

Rather than bloating `CombatEngine` with progression concerns, add a thin helper method to `GameEngine`:

```typescript
// In src/game/GameEngine.ts
import { ProgressionEngine } from './progression/ProgressionEngine';

// Add to class
  private progressionEngine = new ProgressionEngine();

  awardCombatExp(unit: Unit, damageDealt: number, killed: boolean): void {
    const base = damageDealt > 0 ? 10 : 0;
    const killBonus = killed ? 30 : 0;
    this.progressionEngine.grantExp(unit, base + killBonus);
  }
```

**Step 4: Run full suite to verify no regressions**

```bash
npx vitest run
```

**Step 5: Commit**

```bash
git add src/game/GameEngine.ts src/game/combat/__tests__/Engine.test.ts
git commit -m "feat(progression): wire EXP rewards into combat resolution"
```

---

## Task 8.6: Add barrel exports and update GameEngine index

**Objective:** Export all progression modules from `src/game/progression/index.ts` and ensure `src/game/index.ts` re-exports them.

**Files:**
- Create: `src/game/progression/index.ts`
- Modify: `src/game/index.ts`

**Step 1: Write failing test (smoke)**

Add to `src/game/__tests__/smoke.test.ts`:

```typescript
import { expect, it } from 'vitest';

it('can import progression types from game barrel', async () => {
  const mod = await import('../index');
  expect(mod.ProgressionEngine).toBeDefined();
  expect(mod.createGrowthRates).toBeDefined();
  expect(mod.CLASS_CAPS).toBeDefined();
  expect(mod.levelUp).toBeDefined();
});
```

**Step 2: Run to verify RED**

```bash
npx vitest run src/game/__tests__/smoke.test.ts
```

**Step 3: Add exports**

```typescript
// src/game/progression/index.ts
export { createGrowthRates } from './GrowthRates';
export type { GrowthRates } from './GrowthRates';
export { CLASS_CAPS } from './StatCaps';
export type { StatCaps } from './StatCaps';
export { levelUp } from './LevelUpEngine';
export type { LevelUpResult } from './LevelUpEngine';
export { ProgressionEngine } from './ProgressionEngine';
export type { ProgressionResult } from './ProgressionEngine';
```

```typescript
// src/game/index.ts — add this line
export * from './progression';
```

**Step 4: Run to verify GREEN**

```bash
npx vitest run src/game/__tests__/smoke.test.ts
```

**Step 5: Commit**

```bash
git add src/game/progression/index.ts src/game/index.ts src/game/__tests__/smoke.test.ts
git commit -m "chore(progression): add barrel exports for progression system"
```

---

## Task 8.7: Full test suite verification

**Objective:** Ensure all tests pass and there are no regressions across the entire game engine.

**Step 1: Run full suite**

```bash
npx vitest run
```

**Step 2: If any failures, fix them following TDD**

- Write/revise failing test
- Watch it fail
- Implement fix
- Watch it pass

**Step 3: Commit**

```bash
git commit -am "test(progression): verify full suite passes with character progression"
```

---

## Optional Future Work (NOT in this phase — YAGNI)

- **Promotion system:** `Promote(unit, promotedClass)` with flat stat bonuses and new caps.
- **Class change:** Reclassing with different bases/caps.
- **Child units / inheritance:** Parent growth rates averaged + modifiers.
- **Item-based permanent stat boosters:** `applyStatBooster(unit, item)`.
- **Difficulty-based EXP scaling:** `grantExp(unit, amount * difficultyMultiplier)`.
- **Support bonuses:** Adjacent allies providing small hit/avoid bonuses.

---

## Summary of New Files

| File | Purpose |
|------|---------|
| `src/game/progression/GrowthRates.ts` | `GrowthRates` interface + `createGrowthRates` factory |
| `src/game/progression/StatCaps.ts` | `StatCaps` type + `CLASS_CAPS` database per class |
| `src/game/progression/LevelUpEngine.ts` | Rolls growths against caps, returns new stats + increases |
| `src/game/progression/ProgressionEngine.ts` | Grants EXP, triggers level-ups, manages overflow |
| `src/game/progression/index.ts` | Barrel exports |
| `src/game/progression/__tests__/GrowthRates.test.ts` | TDD tests |
| `src/game/progression/__tests__/StatCaps.test.ts` | TDD tests |
| `src/game/progression/__tests__/LevelUpEngine.test.ts` | TDD tests |
| `src/game/progression/__tests__/ProgressionEngine.test.ts` | TDD tests |

## Modified Files

| File | Change |
|------|--------|
| `src/game/units/Unit.ts` | Add `level`, `exp`, `growthRates`, `gainExp()`, `applyLevelUp()` |
| `src/game/units/index.ts` | Export `UnitOptions` |
| `src/game/units/__tests__/Unit.test.ts` | Tests for level/exp/growths |
| `src/game/GameEngine.ts` | Add `awardCombatExp()` helper |
| `src/game/index.ts` | Re-export `progression` |
| `src/game/__tests__/smoke.test.ts` | Smoke test for progression imports |
