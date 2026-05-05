# Phase 11: Promotion System

> **For Hermes:** Use `subagent-driven-development` skill to implement this plan task-by-task. Enforce strict TDD: write failing test, watch it fail, write minimal code, watch it pass, commit.

**Goal:** Implement a Fire Emblem-style class promotion system. Unpromoted units who reach level 10+ can promote to an advanced class, receiving immediate flat stat bonuses, a new class identity, raised stat caps, and a reset to level 1 (promoted). Promoted units level 1–20 with higher caps and new growth rates.

**Architecture:** Pure game logic lives in `src/game/promotion/`. `PromotionEngine` handles eligibility checks and bonus application. `PROMOTION_TREE` and `CLASS_PROMO_BONUSES` are plain data. `Unit` gains `tier` and a `promote()` method. `ProgressionEngine` respects promoted level caps. The Phaser layer gets a `PromotionDisplay` UI state machine. All game logic is 100% unit-testable.

**Tech Stack:** TypeScript, Vitest

**Prerequisite:** Phase 8 (character progression) complete.

---

## Fire Emblem Mechanics Reference

### Promotion Rules
- **Eligibility:** Unpromoted unit at level 10 or higher.
- **Effect:** Class changes to the promoted counterpart. Level resets to 1. Exp resets to 0.
- **Stat Bonuses:** Flat additions (not RNG rolls). Common pattern: +2–5 to several core stats.
- **Base Stat Guarantee:** If a stat is below the new class's minimum base, bump it to that minimum.
- **New Caps:** Promoted classes have higher stat caps than their unpromoted counterparts.
- **New Growths:** Optional — promoted classes may have different growth rates.
- **Max Level:** Promoted units cap at level 20 (effectively level 21–40 in some FE titles, but we display 1–20 promoted).

### Promotion Tree (initial)

| Base Class | Promoted Class |
|------------|----------------|
| lord | paladin |
| mercenary | swordmaster |
| mage | sage |
| archer | sniper |
| cavalry | paladin |
| pegasus_knight | falcon_knight |
| soldier | general |
| brigand | berserker |

---

## Task 11.1: Define Promotion Data Types

**Objective:** Create `PromotionDefinition`, `PromoBonus`, and the `PROMOTION_TREE` lookup.

**Files:**
- Create: `src/game/promotion/PromotionData.ts`
- Create: `src/game/promotion/__tests__/PromotionData.test.ts`

**Step 1: Write failing tests**

```typescript
// src/game/promotion/__tests__/PromotionData.test.ts
import { describe, it, expect } from 'vitest';
import { PROMOTION_TREE, getPromotedClass, CLASS_PROMO_BONUSES } from '../PromotionData';
import { UnitClass } from '../../units/Unit';

describe('PromotionData', () => {
  it('every unpromoted class has a promotion target', () => {
    const baseClasses = [
      UnitClass.LORD,
      UnitClass.MERCENARY,
      UnitClass.MAGE,
      UnitClass.ARCHER,
      UnitClass.CAVALRY,
      UnitClass.PEGASUS_KNIGHT,
      UnitClass.SOLDIER,
      UnitClass.BRIGAND,
    ];
    for (const cls of baseClasses) {
      expect(getPromotedClass(cls)).toBeDefined();
    }
  });

  it('lord promotes to paladin', () => {
    expect(getPromotedClass(UnitClass.LORD)).toBe('paladin');
  });

  it('mercenary promotes to swordmaster', () => {
    expect(getPromotedClass(UnitClass.MERCENARY)).toBe('swordmaster');
  });

  it('promoted classes have bonus definitions', () => {
    const bonuses = CLASS_PROMO_BONUSES.paladin;
    expect(bonuses).toBeDefined();
    expect(bonuses.hp).toBeGreaterThanOrEqual(0);
  });

  it('promoted classes do not promote further', () => {
    expect(getPromotedClass(UnitClass.SWORDMASTER)).toBeNull();
    expect(getPromotedClass('paladin' as UnitClass)).toBeNull();
  });
});
```

**Step 2: Run tests to verify RED**

```bash
npx vitest run src/game/promotion/__tests__/PromotionData.test.ts
```

**Step 3: Write minimal implementation**

```typescript
// src/game/promotion/PromotionData.ts
import { UnitClass } from '../units/Unit';
import { UnitStats } from '../units/Stats';

export interface PromoBonus {
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

export const PROMOTION_TREE: Record<string, string> = {
  [UnitClass.LORD]: 'paladin',
  [UnitClass.MERCENARY]: 'swordmaster',
  [UnitClass.MAGE]: 'sage',
  [UnitClass.ARCHER]: 'sniper',
  [UnitClass.CAVALRY]: 'paladin',
  [UnitClass.PEGASUS_KNIGHT]: 'falcon_knight',
  [UnitClass.SOLDIER]: 'general',
  [UnitClass.BRIGAND]: 'berserker',
};

export function getPromotedClass(unitClass: UnitClass): string | null {
  return PROMOTION_TREE[unitClass] ?? null;
}

export const CLASS_PROMO_BONUSES: Record<string, PromoBonus> = {
  paladin:        { hp: 4, str: 3, mag: 0, skl: 2, spd: 2, luk: 2, def: 3, res: 2, mov: 1 },
  swordmaster:    { hp: 3, str: 2, mag: 0, skl: 3, spd: 3, luk: 2, def: 1, res: 1, mov: 1 },
  sage:           { hp: 3, str: 0, mag: 4, skl: 2, spd: 2, luk: 2, def: 1, res: 3, mov: 1 },
  sniper:         { hp: 3, str: 2, mag: 0, skl: 3, spd: 2, luk: 2, def: 2, res: 1, mov: 1 },
  falcon_knight:  { hp: 3, str: 2, mag: 2, skl: 2, spd: 3, luk: 2, def: 1, res: 3, mov: 1 },
  general:        { hp: 5, str: 2, mag: 0, skl: 1, spd: 0, luk: 1, def: 4, res: 2, mov: 0 },
  berserker:      { hp: 4, str: 4, mag: 0, skl: 1, spd: 2, luk: 0, def: 2, res: 0, mov: 1 },
};

export const PROMOTED_CLASS_BASES: Record<string, Partial<UnitStats>> = {
  paladin:        { hp: 24, str: 9, mag: 3, skl: 8, spd: 8, luk: 7, def: 8, res: 5, mov: 7 },
  swordmaster:    { hp: 22, str: 8, mag: 2, skl: 10, spd: 10, luk: 7, def: 6, res: 4, mov: 6 },
  sage:           { hp: 20, str: 3, mag: 9, skl: 8, spd: 7, luk: 7, def: 4, res: 8, mov: 6 },
  sniper:         { hp: 22, str: 8, mag: 2, skl: 10, spd: 8, luk: 7, def: 6, res: 4, mov: 6 },
  falcon_knight:  { hp: 22, str: 7, mag: 4, skl: 8, spd: 10, luk: 8, def: 5, res: 8, mov: 8 },
  general:        { hp: 28, str: 9, mag: 2, skl: 6, spd: 5, luk: 5, def: 10, res: 5, mov: 5 },
  berserker:      { hp: 26, str: 11, mag: 1, skl: 6, spd: 7, luk: 4, def: 6, res: 3, mov: 6 },
};
```

**Step 4: Run tests to verify GREEN**

```bash
npx vitest run src/game/promotion/__tests__/PromotionData.test.ts
```

**Step 5: Commit**

```bash
git add src/game/promotion/PromotionData.ts src/game/promotion/__tests__/PromotionData.test.ts
git commit -m "feat(promotion): define promotion tree, bonuses, and base stats"
```

---

## Task 11.2: Add Promoted Class Stat Caps

**Objective:** Extend `CLASS_CAPS` with caps for all promoted classes.

**Files:**
- Modify: `src/game/progression/StatCaps.ts`
- Modify: `src/game/progression/__tests__/StatCaps.test.ts`

**Step 1: Write failing test**

Add to `StatCaps.test.ts`:

```typescript
  it('every promoted class has caps defined', () => {
    const promotedClasses = [
      'paladin',
      'swordmaster',
      'sage',
      'sniper',
      'falcon_knight',
      'general',
      'berserker',
    ];
    for (const cls of promotedClasses) {
      expect(CLASS_CAPS[cls]).toBeDefined();
    }
  });

  it('promoted class caps are higher than base counterparts', () => {
    expect(CLASS_CAPS.swordmaster.hp).toBeGreaterThan(CLASS_CAPS.mercenary.hp);
    expect(CLASS_CAPS.swordmaster.str).toBeGreaterThan(CLASS_CAPS.mercenary.str);
  });
```

**Step 2: Run to verify RED**

```bash
npx vitest run src/game/progression/__tests__/StatCaps.test.ts
```

**Step 3: Add promoted caps to `StatCaps.ts`**

```typescript
export const CLASS_CAPS: Record<string, StatCaps> = {
  // --- Base classes (existing) ---
  lord:            { hp: 60, str: 27, mag: 20, skl: 28, spd: 30, luk: 30, def: 22, res: 22, mov: 6 },
  mercenary:       { hp: 60, str: 26, mag: 20, skl: 30, spd: 28, luk: 25, def: 24, res: 20, mov: 5 },
  mage:            { hp: 55, str: 20, mag: 29, skl: 28, spd: 27, luk: 25, def: 15, res: 28, mov: 5 },
  archer:          { hp: 60, str: 25, mag: 20, skl: 30, spd: 29, luk: 25, def: 20, res: 20, mov: 5 },
  cavalry:         { hp: 60, str: 28, mag: 20, skl: 27, spd: 26, luk: 25, def: 26, res: 20, mov: 7 },
  pegasus_knight:  { hp: 55, str: 24, mag: 22, skl: 28, spd: 32, luk: 30, def: 18, res: 26, mov: 7 },
  soldier:         { hp: 60, str: 25, mag: 20, skl: 26, spd: 24, luk: 25, def: 25, res: 22, mov: 5 },
  brigand:         { hp: 62, str: 30, mag: 15, skl: 22, spd: 25, luk: 20, def: 20, res: 15, mov: 5 },

  // --- Promoted classes ---
  paladin:         { hp: 70, str: 30, mag: 22, skl: 30, spd: 28, luk: 30, def: 28, res: 25, mov: 8 },
  swordmaster:     { hp: 65, str: 28, mag: 20, skl: 35, spd: 35, luk: 30, def: 24, res: 22, mov: 6 },
  sage:            { hp: 60, str: 22, mag: 32, skl: 30, spd: 28, luk: 28, def: 20, res: 32, mov: 6 },
  sniper:          { hp: 65, str: 28, mag: 20, skl: 35, spd: 30, luk: 28, def: 24, res: 22, mov: 6 },
  falcon_knight:   { hp: 60, str: 26, mag: 25, skl: 30, spd: 35, luk: 32, def: 22, res: 30, mov: 8 },
  general:         { hp: 75, str: 30, mag: 20, skl: 26, spd: 24, luk: 25, def: 35, res: 25, mov: 5 },
  berserker:       { hp: 72, str: 35, mag: 18, skl: 26, spd: 28, luk: 22, def: 24, res: 18, mov: 6 },
};
```

**Step 4: Run to verify GREEN**

```bash
npx vitest run src/game/progression/__tests__/StatCaps.test.ts
```

**Step 5: Commit**

```bash
git add src/game/progression/StatCaps.ts src/game/progression/__tests__/StatCaps.test.ts
git commit -m "feat(progression): add stat caps for all promoted classes"
```

---

## Task 11.3: Implement PromotionEngine

**Objective:** Pure function that takes a unit and returns promotion result: new class, new stats with bonuses + base-guarantee, reset level/exp, and a diff report.

**Files:**
- Create: `src/game/promotion/PromotionEngine.ts`
- Create: `src/game/promotion/__tests__/PromotionEngine.test.ts`

**Step 1: Write failing tests**

```typescript
// src/game/promotion/__tests__/PromotionEngine.test.ts
import { describe, it, expect } from 'vitest';
import { Unit, Faction, UnitClass } from '../../units/Unit';
import { createStats } from '../../units/Stats';
import { PromotionEngine, PromotionResult } from '../PromotionEngine';
import { createGrowthRates } from '../../progression/GrowthRates';

describe('PromotionEngine', () => {
  const engine = new PromotionEngine();
  const lordStats = createStats({
    hp: 22, str: 8, mag: 2, skl: 7, spd: 8, luk: 6, def: 6, res: 2, mov: 5,
  });

  it('allows promotion at level 10', () => {
    const unit = new Unit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, lordStats, 0, 0, {
      level: 10,
    });
    expect(engine.canPromote(unit)).toBe(true);
  });

  it('does not allow promotion below level 10', () => {
    const unit = new Unit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, lordStats, 0, 0, {
      level: 9,
    });
    expect(engine.canPromote(unit)).toBe(false);
  });

  it('does not allow double promotion', () => {
    const unit = new Unit('p1', 'Rowan', Faction.PLAYER, UnitClass.SWORDMASTER, lordStats, 0, 0, {
      level: 10,
    });
    expect(engine.canPromote(unit)).toBe(false);
  });

  it('applies promotion bonuses and changes class', () => {
    const unit = new Unit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, lordStats, 0, 0, {
      level: 10,
      exp: 50,
    });
    const result = engine.promote(unit);

    expect(result.success).toBe(true);
    expect(result.newClass).toBe('paladin');
    expect(result.oldClass).toBe('lord');
    expect(unit.unitClass).toBe('paladin');
    expect(unit.level).toBe(1);
    expect(unit.exp).toBe(0);
  });

  it('bumps stats below promoted class base minimums', () => {
    const lowStats = createStats({
      hp: 10, str: 3, mag: 1, skl: 2, spd: 2, luk: 1, def: 1, res: 1, mov: 3,
    });
    const unit = new Unit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, lowStats, 0, 0, {
      level: 10,
    });
    engine.promote(unit);
    // Paladin base HP is 24; unit should be bumped to at least that
    expect(unit.stats.hp).toBeGreaterThanOrEqual(24);
    expect(unit.stats.str).toBeGreaterThanOrEqual(9);
  });

  it('adds flat bonuses on top of current stats (when above base)', () => {
    const highStats = createStats({
      hp: 30, str: 12, mag: 5, skl: 10, spd: 10, luk: 8, def: 8, res: 5, mov: 5,
    });
    const unit = new Unit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, highStats, 0, 0, {
      level: 10,
    });
    const result = engine.promote(unit);
    // HP bonus for paladin is +4
    expect(result.newStats.hp).toBe(34);
    expect(result.newStats.maxHp).toBe(34);
  });

  it('caps promoted stats at new class cap', () => {
    const maxedStats = createStats({
      hp: 80, str: 40, mag: 30, skl: 40, spd: 40, luk: 40, def: 40, res: 40, mov: 10,
    });
    const unit = new Unit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, maxedStats, 0, 0, {
      level: 10,
    });
    engine.promote(unit);
    expect(unit.stats.hp).toBeLessThanOrEqual(CLASS_CAPS.paladin.hp);
    expect(unit.stats.str).toBeLessThanOrEqual(CLASS_CAPS.paladin.str);
  });

  it('returns a diff showing which stats changed', () => {
    const unit = new Unit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, lordStats, 0, 0, {
      level: 10,
    });
    const result = engine.promote(unit);
    expect(result.diff.hp).toBeGreaterThan(0);
    expect(result.diff.str).toBeGreaterThan(0);
  });

  it('is idempotent — second promotion fails', () => {
    const unit = new Unit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, lordStats, 0, 0, {
      level: 10,
    });
    engine.promote(unit);
    const second = engine.promote(unit);
    expect(second.success).toBe(false);
  });

  it('updates unit tier to promoted', () => {
    const unit = new Unit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, lordStats, 0, 0, {
      level: 10,
    });
    expect(unit.tier).toBe('base');
    engine.promote(unit);
    expect(unit.tier).toBe('promoted');
  });
});
```

**Step 2: Run to verify RED**

```bash
npx vitest run src/game/promotion/__tests__/PromotionEngine.test.ts
```

**Step 3: Write minimal implementation**

```typescript
// src/game/promotion/PromotionEngine.ts
import { Unit, UnitClass } from '../units/Unit';
import { UnitStats, createStats } from '../units/Stats';
import { getPromotedClass, CLASS_PROMO_BONUSES, PROMOTED_CLASS_BASES } from './PromotionData';
import { CLASS_CAPS } from '../progression/StatCaps';

export interface PromotionResult {
  success: boolean;
  oldClass: UnitClass;
  newClass: string | null;
  newStats: UnitStats;
  diff: Partial<Record<keyof UnitStats, number>>;
}

export class PromotionEngine {
  canPromote(unit: Unit): boolean {
    if (unit.tier !== 'base') return false;
    return unit.level >= 10;
  }

  promote(unit: Unit): PromotionResult {
    if (!this.canPromote(unit)) {
      return { success: false, oldClass: unit.unitClass, newClass: null, newStats: unit.stats, diff: {} };
    }

    const promotedClass = getPromotedClass(unit.unitClass);
    if (!promotedClass) {
      return { success: false, oldClass: unit.unitClass, newClass: null, newStats: unit.stats, diff: {} };
    }

    const bonuses = CLASS_PROMO_BONUSES[promotedClass];
    const bases = PROMOTED_CLASS_BASES[promotedClass];
    const caps = CLASS_CAPS[promotedClass];

    const oldStats = { ...unit.stats };
    const newStats: UnitStats = { ...unit.stats };

    const statKeys = Object.keys(bonuses) as (keyof UnitStats)[];
    for (const key of statKeys) {
      const bonus = bonuses[key];
      const baseMin = bases?.[key] ?? 0;

      let val = newStats[key] + bonus;
      if (baseMin > 0 && val < baseMin) {
        val = baseMin;
      }
      if (caps && val > caps[key]) {
        val = caps[key];
      }
      (newStats as Record<keyof UnitStats, number>)[key] = val;
    }

    // Ensure maxHp tracks hp changes
    if (newStats.hp !== oldStats.hp) {
      newStats.maxHp = newStats.hp;
    }

    const diff: Partial<Record<keyof UnitStats, number>> = {};
    for (const key of statKeys) {
      const d = newStats[key] - oldStats[key];
      if (d !== 0) diff[key] = d;
    }

    (unit as unknown as { applyPromotion(className: string, stats: UnitStats): void }).applyPromotion(promotedClass, newStats);

    return {
      success: true,
      oldClass: unit.unitClass,
      newClass: promotedClass,
      newStats,
      diff,
    };
  }
}
```

**Step 4: Run to verify GREEN**

```bash
npx vitest run src/game/promotion/__tests__/PromotionEngine.test.ts
```

**Step 5: Commit**

```bash
git add src/game/promotion/PromotionEngine.ts src/game/promotion/__tests__/PromotionEngine.test.ts
git commit -m "feat(promotion): add PromotionEngine with eligibility, bonuses, and base guarantees"
```

---

## Task 11.4: Extend Unit with Tier and applyPromotion

**Objective:** Add `tier` ('base' | 'promoted'), `applyPromotion()`, and update `isAtMaxLevel` to respect tier.

**Files:**
- Modify: `src/game/units/Unit.ts`
- Modify: `src/game/units/__tests__/Unit.test.ts`

**Step 1: Write failing tests**

Add to `Unit.test.ts`:

```typescript
  it('starts at base tier', () => {
    const unit = new Unit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, stats, 2, 5);
    expect(unit.tier).toBe('base');
  });

  it('can apply promotion changing class and stats', () => {
    const unit = new Unit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, stats, 2, 5, { level: 10 });
    const promotedStats = createStats({
      hp: 26, str: 11, mag: 2, skl: 9, spd: 10, luk: 8, def: 9, res: 4, mov: 6,
    });
    unit.applyPromotion('paladin', promotedStats);
    expect(unit.unitClass).toBe('paladin');
    expect(unit.level).toBe(1);
    expect(unit.exp).toBe(0);
    expect(unit.tier).toBe('promoted');
    expect(unit.stats.hp).toBe(26);
  });

  it('is at max level at 20 for base tier', () => {
    const unit = new Unit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, stats, 2, 5, { level: 20 });
    expect(unit.isAtMaxLevel).toBe(true);
  });

  it('is at max level at 20 for promoted tier', () => {
    const unit = new Unit('p1', 'Rowan', Faction.PLAYER, UnitClass.SWORDMASTER, stats, 2, 5, { level: 20 });
    expect(unit.isAtMaxLevel).toBe(true);
  });

  it('is not at max level below 20 for promoted tier', () => {
    const unit = new Unit('p1', 'Rowan', Faction.PLAYER, UnitClass.SWORDMASTER, stats, 2, 5, { level: 19 });
    expect(unit.isAtMaxLevel).toBe(false);
  });
```

**Step 2: Run to verify RED**

```bash
npx vitest run src/game/units/__tests__/Unit.test.ts
```

**Step 3: Modify `Unit.ts`**

```typescript
export type UnitTier = 'base' | 'promoted';

// Inside class Unit:
  private _tier: UnitTier = 'base';

  get tier(): UnitTier {
    return this._tier;
  }

  get isAtMaxLevel(): boolean {
    return this._level >= 20;
  }

  applyPromotion(newClass: UnitClass, newStats: UnitStats): void {
    (this as unknown as { unitClass: UnitClass }).unitClass = newClass;
    this._stats = newStats;
    this._level = 1;
    this._exp = 0;
    this._tier = 'promoted';
  }
```

> **Note:** `unitClass` is currently `readonly`. You must either:
> - Remove `readonly` from `unitClass`, OR
> - Use a package-private pattern (e.g., `private _unitClass` with getter).
>
> Preferred: change `readonly unitClass` to `private _unitClass` with a getter. This is a small refactor. Update all references (they already use the getter).

**Step 4: Run to verify GREEN**

```bash
npx vitest run src/game/units/__tests__/Unit.test.ts
```

**Step 5: Commit**

```bash
git add src/game/units/Unit.ts src/game/units/__tests__/Unit.test.ts
git commit -m "feat(units): add tier, applyPromotion, and promoted max-level behavior"
```

---

## Task 11.5: Wire Promotion into GameEngine

**Objective:** Add `canPromote(unit)`, `promote(unit)`, and `getPromotionResult(unit)` facade methods on `GameEngine`.

**Files:**
- Modify: `src/game/GameEngine.ts`
- Modify: `src/game/__tests__/GameEngine.test.ts`

**Step 1: Write failing test**

Add to `GameEngine.test.ts`:

```typescript
  it('can check promotion eligibility through GameEngine', () => {
    const engine = new GameEngine(10, 8);
    const stats = createStats({
      hp: 22, str: 8, mag: 2, skl: 7, spd: 8, luk: 6, def: 6, res: 2, mov: 5,
    });
    const unit = engine.addUnit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, stats, 2, 5);
    // Default level 1 — not eligible
    expect(engine.canPromote(unit)).toBe(false);
  });

  it('promotes a unit through GameEngine', () => {
    const engine = new GameEngine(10, 8);
    const stats = createStats({
      hp: 22, str: 8, mag: 2, skl: 7, spd: 8, luk: 6, def: 6, res: 2, mov: 5,
    });
    const unit = engine.addUnit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, stats, 2, 5);
    // Simulate level 10 via internal assignment for test
    (unit as unknown as { _level: number })._level = 10;
    const result = engine.promote(unit);
    expect(result.success).toBe(true);
    expect(unit.unitClass).toBe('paladin');
  });
```

**Step 2: Run to verify RED**

```bash
npx vitest run src/game/__tests__/GameEngine.test.ts
```

**Step 3: Add to `GameEngine.ts`**

```typescript
import { PromotionEngine } from './promotion/PromotionEngine';

// Inside GameEngine class:
  private promotionEngine = new PromotionEngine();

  canPromote(unit: Unit): boolean {
    return this.promotionEngine.canPromote(unit);
  }

  promote(unit: Unit): import('./promotion/PromotionEngine').PromotionResult {
    return this.promotionEngine.promote(unit);
  }
```

**Step 4: Run to verify GREEN**

```bash
npx vitest run src/game/__tests__/GameEngine.test.ts
```

**Step 5: Commit**

```bash
git add src/game/GameEngine.ts src/game/__tests__/GameEngine.test.ts
git commit -m "feat(engine): wire PromotionEngine into GameEngine facade"
```

---

## Task 11.6: Build PromotionDisplay UI State Machine

**Objective:** Create a pure UI logic class that drives the promotion animation sequence (banner → stat diff reveal → wait for input → done), mirroring `LevelUpDisplay`.

**Files:**
- Create: `src/game/ui/PromotionDisplay.ts`
- Create: `src/game/ui/__tests__/PromotionDisplay.test.ts`

**Step 1: Write failing tests**

```typescript
// src/game/ui/__tests__/PromotionDisplay.test.ts
import { describe, it, expect } from 'vitest';
import { PromotionDisplay, PROMOTION_PHASE } from '../PromotionDisplay';
import { createStats } from '../../units/Stats';

describe('PromotionDisplay', () => {
  const oldStats = createStats({ hp: 22, str: 8, mag: 2, skl: 7, spd: 8, luk: 6, def: 6, res: 2, mov: 5 });
  const newStats = createStats({ hp: 26, str: 11, mag: 2, skl: 9, spd: 10, luk: 8, def: 9, res: 4, mov: 6 });
  const diff = { hp: 4, str: 3, skl: 2, spd: 2, luk: 2, def: 3, res: 2, mov: 1 };

  it('starts in BANNER_IN phase', () => {
    const d = new PromotionDisplay('Rowan', 'lord', 'paladin', oldStats, newStats, diff);
    expect(d.phase).toBe(PROMOTION_PHASE.BANNER_IN);
  });

  it('advances through phases with time', () => {
    const d = new PromotionDisplay('Rowan', 'lord', 'paladin', oldStats, newStats, diff);
    d.update(10000);
    expect(d.phase).toBe(PROMOTION_PHASE.WAIT_FOR_INPUT);
  });

  it('reports correct diff for a stat', () => {
    const d = new PromotionDisplay('Rowan', 'lord', 'paladin', oldStats, newStats, diff);
    expect(d.getDiff('hp')).toBe(4);
    expect(d.getDiff('mag')).toBe(0);
  });

  it('can be dismissed in WAIT_FOR_INPUT', () => {
    const d = new PromotionDisplay('Rowan', 'lord', 'paladin', oldStats, newStats, diff);
    d.update(10000);
    d.dismiss();
    expect(d.isComplete()).toBe(true);
  });

  it('exposes old and new class names', () => {
    const d = new PromotionDisplay('Rowan', 'lord', 'paladin', oldStats, newStats, diff);
    expect(d.oldClass).toBe('lord');
    expect(d.newClass).toBe('paladin');
  });
});
```

**Step 2: Run to verify RED**

```bash
npx vitest run src/game/ui/__tests__/PromotionDisplay.test.ts
```

**Step 3: Write minimal implementation**

Model this after `LevelUpDisplay.ts`. Phases: `BANNER_IN`, `BANNER_HOLD`, `CLASS_REVEAL`, `STATS_IN`, `STAT_REVEAL`, `WAIT_FOR_INPUT`, `DONE`.

```typescript
// src/game/ui/PromotionDisplay.ts
import { UnitStats } from '../units/Stats';

export const PROMOTION_PHASE = {
  BANNER_IN: 'banner_in',
  BANNER_HOLD: 'banner_hold',
  CLASS_REVEAL: 'class_reveal',
  STATS_IN: 'stats_in',
  STAT_REVEAL: 'stat_reveal',
  WAIT_FOR_INPUT: 'wait_for_input',
  DONE: 'done',
} as const;
export type PromotionPhase = (typeof PROMOTION_PHASE)[keyof typeof PROMOTION_PHASE];

const STAT_KEYS: (keyof UnitStats)[] = ['hp', 'str', 'mag', 'skl', 'spd', 'luk', 'def', 'res', 'mov'];

export class PromotionDisplay {
  readonly unitName: string;
  readonly oldClass: string;
  readonly newClass: string;
  readonly oldStats: UnitStats;
  readonly newStats: UnitStats;
  private readonly diff: Partial<Record<keyof UnitStats, number>>;

  private _elapsed = 0;
  phase: PromotionPhase = PROMOTION_PHASE.BANNER_IN;

  private readonly bannerInDuration = 300;
  private readonly bannerHoldDuration = 600;
  private readonly classRevealDuration = 400;
  private readonly statsInDuration = 400;
  private readonly statRevealDelay = 80;

  constructor(
    unitName: string,
    oldClass: string,
    newClass: string,
    oldStats: UnitStats,
    newStats: UnitStats,
    diff: Partial<Record<keyof UnitStats, number>>,
  ) {
    this.unitName = unitName;
    this.oldClass = oldClass;
    this.newClass = newClass;
    this.oldStats = oldStats;
    this.newStats = newStats;
    this.diff = diff;
  }

  get elapsed(): number {
    return this._elapsed;
  }

  update(deltaMs: number): void {
    if (this.phase === PROMOTION_PHASE.DONE) return;
    this._elapsed += deltaMs;

    while (true) {
      const t = this._elapsed;
      if (this.phase === PROMOTION_PHASE.BANNER_IN && t >= this.bannerInDuration) {
        this.phase = PROMOTION_PHASE.BANNER_HOLD;
        continue;
      }
      if (this.phase === PROMOTION_PHASE.BANNER_HOLD && t >= this.bannerInDuration + this.bannerHoldDuration) {
        this.phase = PROMOTION_PHASE.CLASS_REVEAL;
        continue;
      }
      if (this.phase === PROMOTION_PHASE.CLASS_REVEAL && t >= this.bannerInDuration + this.bannerHoldDuration + this.classRevealDuration) {
        this.phase = PROMOTION_PHASE.STATS_IN;
        continue;
      }
      if (this.phase === PROMOTION_PHASE.STATS_IN && t >= this.bannerInDuration + this.bannerHoldDuration + this.classRevealDuration + this.statsInDuration) {
        this.phase = PROMOTION_PHASE.STAT_REVEAL;
        continue;
      }
      if (this.phase === PROMOTION_PHASE.STAT_REVEAL && this.allStatsRevealed()) {
        this.phase = PROMOTION_PHASE.WAIT_FOR_INPUT;
        continue;
      }
      break;
    }
  }

  getRevealProgress(statKey: keyof UnitStats): number {
    if (this.phase === PROMOTION_PHASE.DONE || this.phase === PROMOTION_PHASE.WAIT_FOR_INPUT) return 1;
    if (this.phase !== PROMOTION_PHASE.STAT_REVEAL) return 0;
    const base = this.bannerInDuration + this.bannerHoldDuration + this.classRevealDuration + this.statsInDuration;
    const index = STAT_KEYS.indexOf(statKey);
    const revealStart = base + index * this.statRevealDelay;
    return Math.max(0, Math.min(1, (this._elapsed - revealStart) / this.statRevealDelay));
  }

  allStatsRevealed(): boolean {
    const lastIndex = STAT_KEYS.length - 1;
    const base = this.bannerInDuration + this.bannerHoldDuration + this.classRevealDuration + this.statsInDuration;
    return this._elapsed >= base + lastIndex * this.statRevealDelay + this.statRevealDelay;
  }

  dismiss(): void {
    if (this.phase === PROMOTION_PHASE.WAIT_FOR_INPUT) {
      this.phase = PROMOTION_PHASE.DONE;
    }
  }

  isComplete(): boolean {
    return this.phase === PROMOTION_PHASE.DONE;
  }

  getDiff(statKey: keyof UnitStats): number {
    return this.diff[statKey] ?? 0;
  }

  hasDiff(statKey: keyof UnitStats): boolean {
    return (this.diff[statKey] ?? 0) !== 0;
  }
}
```

**Step 4: Run to verify GREEN**

```bash
npx vitest run src/game/ui/__tests__/PromotionDisplay.test.ts
```

**Step 5: Commit**

```bash
git add src/game/ui/PromotionDisplay.ts src/game/ui/__tests__/PromotionDisplay.test.ts
git commit -m "feat(ui): add PromotionDisplay state machine for promotion animation"
```

---

## Task 11.7: Integrate Promotion Flow into BattleScene

**Objective:** After a level-up sequence completes, if the unit is now level 10+ and eligible for promotion, show a "PROMOTION!" banner and a choice to promote. If accepted, run `PromotionDisplay` animation.

**Files:**
- Modify: `src/scenes/BattleScene.ts`

**Flow:**
1. After `LevelUpDisplay` dismisses, check `engine.canPromote(unit)`.
2. If eligible, show a simple choice overlay: "Promote to <Class>?" with Yes / No.
3. If Yes → call `engine.promote(unit)`, then instantiate `PromotionDisplay` and animate it (reuse the level-up banner rendering pattern).
4. If No → continue as normal.

**Step 1: Add helper methods in `BattleScene.ts`**

```typescript
private showPromotionPrompt(unit: Unit, onComplete: () => void): void {
  // Render a simple two-option menu: "Promote to <class>?" [Yes] [No]
  // On Yes: call engine.promote(unit), then showPromotionSequence
  // On No: call onComplete()
}

private showPromotionSequence(
  unit: Unit,
  result: import('../game/promotion/PromotionEngine').PromotionResult,
  onComplete: () => void,
): void {
  // Similar to showLevelUpSequence but uses PromotionDisplay
}
```

**Step 2: Hook into the existing level-up completion callback**

Find the location in `BattleScene.ts` where `showLevelUpSequence`'s `onComplete` is invoked (around line 2016–2019). After level-up completes:

```typescript
if (engine.canPromote(unit)) {
  this.showPromotionPrompt(unit, () => {
    this.hideExpPopup();
    onComplete();
  });
} else {
  this.hideExpPopup();
  onComplete();
}
```

**Step 3: Run the game to verify visually**

```bash
npm run dev
```

Trigger a level-up to 10 in combat and confirm the promotion prompt appears.

**Step 4: Commit**

```bash
git add src/scenes/BattleScene.ts
git commit -m "feat(scene): add promotion prompt and sequence in BattleScene"
```

---

## Task 11.8: Add Promotion Item Support (Optional Extension)

**Objective:** Introduce a `Master Seal` item that enables promotion when used from the item menu.

**Files:**
- Modify: `src/game/items/ItemTypes.ts` — add `promotion` item kind
- Modify: `src/game/items/Inventory.ts` — allow using items
- Modify: `src/game/GameEngine.ts` — `useItem(unit, itemIndex)`

**Data:**

```typescript
export interface PromotionItem extends BaseItem {
  kind: 'promotion';
  targetClasses?: UnitClass[]; // null = any base class
}
```

**Test:** Using a Master Seal on an eligible unit promotes them.

Skip this task if you want to keep promotion level-only (no item gating). It can be added later without breaking existing code.

---

## Task 11.9: Update README and Master Plan

**Objective:** Mark Phase 11 as complete in `docs/plans/README.md`.

**Files:**
- Modify: `docs/plans/README.md`

Add row:

```markdown
| 11 | [11-promotion-system.md](./11-promotion-system.md) | ⬜ | Fire Emblem-style class promotion |
```

**Commit:**

```bash
git add docs/plans/README.md
git commit -m "docs: add Phase 11 promotion system to master plan"
```

---

## Summary of New Files

```
src/game/promotion/
  PromotionData.ts
  PromotionEngine.ts
  __tests__/
    PromotionData.test.ts
    PromotionEngine.test.ts

src/game/ui/
  PromotionDisplay.ts
  __tests__/
    PromotionDisplay.test.ts
```

## Summary of Modified Files

```
src/game/progression/StatCaps.ts
src/game/progression/__tests__/StatCaps.test.ts
src/game/units/Unit.ts
src/game/units/__tests__/Unit.test.ts
src/game/GameEngine.ts
src/game/__tests__/GameEngine.test.ts
src/scenes/BattleScene.ts
docs/plans/README.md
```

## Core Principles Checklist

- [ ] TDD always — every new behavior has a failing test first
- [ ] Pure game logic stays in `src/game/` — zero Phaser imports
- [ ] `UnitClass` refactor to allow class mutation is isolated and tested
- [ ] Promoted caps are strictly higher than base caps
- [ ] Promotion is idempotent — no double-promotion exploits
- [ ] BattleScene integration is thin — all decisions delegated to engine
