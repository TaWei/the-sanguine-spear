# Phase 7: Enhanced Enemy AI — Aggressive & Intelligent Behavior

> **For Hermes:** Use `subagent-driven-development` skill to implement this plan task-by-task.

**Goal:** Overhaul the enemy AI to be significantly more aggressive and intelligent, drawing directly from Fire Emblem GBA's battle-tested AI architecture. Enemies will evaluate self-preservation, use terrain tactically, pursue players when out of range, retreat when critical, and adopt distinct combat personalities.

**Architecture:** The existing `Targeting.ts` scoring system is replaced by a `CombatEvaluator` that simulates both the attack AND the counterattack to compute a net-damage score. `Commander.ts` gains pursuit logic for enemies with no targets in range, terrain-aware movement scoring, and per-enemy `AiPersonality` configuration. A new `AiBehavior` module encodes FE GBA-style behavior patterns (Pursue, AttackInRange, Guard, etc.). All pure logic — zero Phaser imports.

**Tech Stack:** TypeScript, Vitest

**Reference Research:** Fire Emblem GBA AI documentation from Fire Emblem Universe (Crazycolorz5, Gryz, Venno):
- AI uses TP (Target Points) system: evaluates every weapon×target combo
- TP penalty = `20 - attackerHP` (self-preservation)
- AI1 controls action willingness (0x00=pursue, 0x03=attack-in-range-only, 0x06=do nothing)
- AI2 controls movement (0x00=pursue, 0x03=stand still, 0x0F=move-as-close-when-blocked)
- AI3 controls recovery mode thresholds (retreat when HP < 50%/30%/10%)
- Enemies blocked by terrain/walls with 0x00 wait until path opens; with 0x1C they hug walls

**Prerequisite:** Phase 5 (basic enemy AI) complete.

---

## Task Index

| # | Task | Files Touched |
|---|------|---------------|
| 7.1 | `CombatEvaluator` — simulate attack + counter for net damage scoring | `src/game/ai/CombatEvaluator.ts` + test |
| 7.2 | `AiPersonality` type + `scoreAction` with personality weighting | `src/game/ai/Personality.ts` + test |
| 7.3 | `AiBehavior` — FE GBA behavior pattern enum + predicate helpers | `src/game/ai/Behavior.ts` + test |
| 7.4 | `Targeting.ts` refactor — use `CombatEvaluator` + personality | `src/game/ai/Targeting.ts` + test |
| 7.5 | `Commander.ts` — pursuit when no targets, terrain-aware move scoring | `src/game/ai/Commander.ts` + test |
| 7.6 | `Unit` extension — add `aiBehavior` and `aiPersonality` fields | `src/game/units/Unit.ts` + test |
| 7.7 | `GameEngine` integration — wire personality/behavior into enemy phase | `src/game/GameEngine.ts` + test |
| 7.8 | Barrel export update + full test suite verification | `src/game/ai/index.ts` |

---

### Task 7.1: Create `CombatEvaluator` — Net Damage Scoring

**Objective:** Build a pure function that, given an attacker, defender, weapon, and grid, computes the expected outcome of combat including the counterattack. Returns a `CombatScore` with `netDamage`, `canKill`, `counterDamage`, and `survivalRisk`.

**Files:**
- Create: `src/game/ai/CombatEvaluator.ts`
- Create: `src/game/ai/__tests__/CombatEvaluator.test.ts`

**Step 1: Write failing test**

```typescript
// src/game/ai/__tests__/CombatEvaluator.test.ts
import { describe, it, expect } from 'vitest';
import { evaluateCombat } from '../CombatEvaluator';
import { Unit, Faction, UnitClass } from '../../units/Unit';
import { createStats } from '../../units/Stats';
import { WEAPON_DB } from '../../combat/Weapons';
import { Grid } from '../../map/Grid';

describe('CombatEvaluator', () => {
  const grid = new Grid(10, 10);

  const makeBandit = () => {
    const stats = createStats({ hp: 26, str: 9, mag: 0, skl: 4, spd: 5, luk: 3, def: 5, res: 1, mov: 5 });
    return new Unit('e1', 'Bandit', Faction.ENEMY, UnitClass.BRIGAND, stats, 5, 5);
  };

  const makeLord = () => {
    const stats = createStats({ hp: 22, str: 8, mag: 2, skl: 7, spd: 8, luk: 6, def: 6, res: 2, mov: 5 });
    return new Unit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, stats, 6, 5);
  };

  it('returns positive netDamage when attacker outclasses defender', () => {
    const bandit = makeBandit();
    const lord = makeLord();
    const score = evaluateCombat(bandit, lord, WEAPON_DB['Iron Axe'], grid);
    expect(score.netDamage).toBeGreaterThan(0);
  });

  it('canKill is true when damage >= target HP', () => {
    const bandit = makeBandit();
    const weakStats = createStats({ hp: 10, str: 1, mag: 1, skl: 1, spd: 1, luk: 1, def: 1, res: 1, mov: 5 });
    const weak = new Unit('p2', 'Weak', Faction.PLAYER, UnitClass.MAGE, weakStats, 6, 5);
    const score = evaluateCombat(bandit, weak, WEAPON_DB['Iron Axe'], grid);
    expect(score.canKill).toBe(true);
  });

  it('counterDamage is 0 when defender cannot counterattack (out of range)', () => {
    const bandit = makeBandit();
    const archerStats = createStats({ hp: 18, str: 5, mag: 0, skl: 6, spd: 6, luk: 4, def: 4, res: 2, mov: 5 });
    const archer = new Unit('p3', 'Archer', Faction.PLAYER, UnitClass.ARCHER, archerStats, 6, 5);
    // Bow range 2, but assume we're at range 1 for this test
    // We pass a mock defenderWeapon with range 2 to simulate out-of-range counter
    const score = evaluateCombat(bandit, archer, WEAPON_DB['Iron Axe'], grid, WEAPON_DB['Iron Bow']);
    // Iron Bow minRange=2, maxRange=2, so at melee range counter = 0
    expect(score.counterDamage).toBe(0);
  });

  it('survivalRisk increases when counterDamage is high relative to attacker HP', () => {
    const bandit = makeBandit();
    bandit.takeDamage(20); // hp now 6
    const lord = makeLord();
    const score = evaluateCombat(bandit, lord, WEAPON_DB['Iron Axe'], grid);
    expect(score.survivalRisk).toBeGreaterThan(0);
  });

  it('returns zero netDamage and canKill false for dead target', () => {
    const bandit = makeBandit();
    const lord = makeLord();
    lord.takeDamage(999);
    const score = evaluateCombat(bandit, lord, WEAPON_DB['Iron Axe'], grid);
    expect(score.netDamage).toBe(0);
    expect(score.canKill).toBe(false);
  });

  it('uses magic stat when weapon usesMagic is true', () => {
    const mageStats = createStats({ hp: 18, str: 2, mag: 8, skl: 6, spd: 7, luk: 5, def: 3, res: 6, mov: 5 });
    const mage = new Unit('e2', 'Dark Mage', Faction.ENEMY, UnitClass.MAGE, mageStats, 5, 5);
    const lord = makeLord();
    const score = evaluateCombat(mage, lord, WEAPON_DB['Fire'], grid);
    // Fire uses magic; mage mag=8, lord res=2 -> should deal significant damage
    expect(score.netDamage).toBeGreaterThan(0);
  });
});
```

**Step 2: Run to verify RED**

```bash
npx vitest run src/game/ai/__tests__/CombatEvaluator.test.ts
```
Expected: FAIL — `evaluateCombat` not defined.

**Step 3: Write minimal implementation**

```typescript
// src/game/ai/CombatEvaluator.ts
import { Unit } from '../units/Unit';
import { Grid } from '../map/Grid';
import { WeaponData } from '../combat/Weapons';
import { calcDamage } from '../combat/Formulas';

export interface CombatScore {
  /** Damage attacker deals to defender (before counter) */
  attackerDamage: number;
  /** Damage defender deals back on counterattack */
  counterDamage: number;
  /** Net expected damage (attackerDamage - counterDamage) */
  netDamage: number;
  /** True if attackerDamage >= defender current HP */
  canKill: boolean;
  /** 0-100 estimate of how dangerous this engagement is for the attacker */
  survivalRisk: number;
}

/**
 * Evaluate a combat engagement from the attacker's perspective.
 * Simulates both the attack and a potential counterattack.
 *
 * @param attacker      The unit initiating combat
 * @param defender      The target unit
 * @param attackerWeapon Weapon the attacker will use
 * @param grid          The game grid (for terrain defense bonuses)
 * @param defenderWeapon Weapon the defender would counter with (optional)
 */
export function evaluateCombat(
  attacker: Unit,
  defender: Unit,
  attackerWeapon: WeaponData,
  grid: Grid,
  defenderWeapon?: WeaponData,
): CombatScore {
  if (!defender.isAlive) {
    return { attackerDamage: 0, counterDamage: 0, netDamage: 0, canKill: false, survivalRisk: 0 };
  }

  // Attacker's strike
  const atkStat = attackerWeapon.usesMagic ? attacker.stats.mag : attacker.stats.str;
  const defTerrain = grid.getTerrainData(defender.gridX, defender.gridY);
  const defDefStat = attackerWeapon.usesMagic
    ? defender.stats.res + defTerrain.defenseBonus
    : defender.stats.def + defTerrain.defenseBonus;
  const attackerDamage = calcDamage(atkStat, attackerWeapon.mt, defDefStat, attackerWeapon.usesMagic);

  // Counterattack (only if defender has a weapon and is in range)
  let counterDamage = 0;
  if (defenderWeapon && defenderWeapon.usesMagic !== undefined) {
    // Check if defender can reach attacker with their weapon
    const dist = Math.abs(attacker.gridX - defender.gridX) + Math.abs(attacker.gridY - defender.gridY);
    if (dist >= defenderWeapon.minRange && dist <= defenderWeapon.maxRange) {
      const defAtkStat = defenderWeapon.usesMagic ? defender.stats.mag : defender.stats.str;
      const attTerrain = grid.getTerrainData(attacker.gridX, attacker.gridY);
      const attDefStat = defenderWeapon.usesMagic
        ? attacker.stats.res + attTerrain.defenseBonus
        : attacker.stats.def + attTerrain.defenseBonus;
      counterDamage = calcDamage(defAtkStat, defenderWeapon.mt, attDefStat, defenderWeapon.usesMagic);
    }
  }

  const netDamage = attackerDamage - counterDamage;
  const canKill = attackerDamage >= defender.stats.hp;

  // Survival risk: percentage of attacker HP that counter could consume
  // Clamped to 0-100. Formula inspired by FE GBA TP penalty.
  const rawRisk = attacker.stats.maxHp > 0 ? (counterDamage / attacker.stats.maxHp) * 100 : 0;
  const survivalRisk = Math.min(100, Math.max(0, rawRisk));

  return { attackerDamage, counterDamage, netDamage, canKill, survivalRisk };
}
```

**Step 4: Run to verify GREEN**

```bash
npx vitest run src/game/ai/__tests__/CombatEvaluator.test.ts
```
Expected: PASS

**Step 5: Commit**

```bash
git add src/game/ai/CombatEvaluator.ts src/game/ai/__tests__/CombatEvaluator.test.ts
git commit -m "feat(ai): add CombatEvaluator for net-damage scoring with counterattack simulation"
```

---

### Task 7.2: Create `AiPersonality` and `scoreAction`

**Objective:** Define personality types that weight the `CombatScore` differently. FE GBA effectively has this via the TP Modifier table — different enemies value kills vs. safety differently. We make it explicit: `AGGRESSIVE`, `CAUTIOUS`, `BALANCED`, `BERSERKER`.

**Files:**
- Create: `src/game/ai/Personality.ts`
- Create: `src/game/ai/__tests__/Personality.test.ts`

**Step 1: Write failing test**

```typescript
// src/game/ai/__tests__/Personality.test.ts
import { describe, it, expect } from 'vitest';
import { scoreAction, AiPersonality } from '../Personality';
import { CombatScore } from '../CombatEvaluator';

describe('Personality scoring', () => {
  const baseScore: CombatScore = {
    attackerDamage: 15,
    counterDamage: 5,
    netDamage: 10,
    canKill: false,
    survivalRisk: 20,
  };

  it('AGGRESSIVE values canKill extremely highly', () => {
    const killScore: CombatScore = { ...baseScore, canKill: true, attackerDamage: 22 };
    const aggressive = scoreAction(killScore, AiPersonality.AGGRESSIVE);
    const balanced = scoreAction(killScore, AiPersonality.BALANCED);
    expect(aggressive).toBeGreaterThan(balanced);
  });

  it('CAUTIOUS penalizes survivalRisk heavily', () => {
    const risky: CombatScore = { ...baseScore, counterDamage: 20, survivalRisk: 80 };
    const cautious = scoreAction(risky, AiPersonality.CAUTIOUS);
    const balanced = scoreAction(risky, AiPersonality.BALANCED);
    expect(cautious).toBeLessThan(balanced);
  });

  it('BERSERKER ignores survivalRisk completely', () => {
    const risky: CombatScore = { ...baseScore, counterDamage: 25, survivalRisk: 100 };
    const berserk = scoreAction(risky, AiPersonality.BERSERKER);
    const safe: CombatScore = { ...baseScore, counterDamage: 0, survivalRisk: 0 };
    const berserkSafe = scoreAction(safe, AiPersonality.BERSERKER);
    // Berserker only cares about damage dealt; both have same attackerDamage
    expect(berserk).toBe(berserkSafe);
  });

  it('BALANCED is the default moderate weighting', () => {
    const score = scoreAction(baseScore, AiPersonality.BALANCED);
    expect(score).toBeGreaterThan(0);
  });

  it('returns higher score for higher netDamage', () => {
    const lowNet: CombatScore = { ...baseScore, netDamage: 2 };
    const highNet: CombatScore = { ...baseScore, netDamage: 18 };
    expect(scoreAction(highNet, AiPersonality.BALANCED))
      .toBeGreaterThan(scoreAction(lowNet, AiPersonality.BALANCED));
  });
});
```

**Step 2: Run to verify RED**

**Step 3: Write implementation**

```typescript
// src/game/ai/Personality.ts
import { CombatScore } from './CombatEvaluator';

export enum AiPersonality {
  /** Prioritizes kills and maximum damage; accepts high risk. FE GBA "boss" behavior. */
  AGGRESSIVE = 'aggressive',
  /** Avoids counterdamage; prefers safe trades. FE GBA archer/mage on fort behavior. */
  CAUTIOUS = 'cautious',
  /** Standard weighting. Most grunts use this. */
  BALANCED = 'balanced',
  /** Suicidal charge; only cares about damage dealt. FE GBA reinforcements. */
  BERSERKER = 'berserker',
}

/**
 * Convert a CombatScore into a single numeric action score based on personality.
 * Higher = better action.
 *
 * Inspired by FE GBA Target Points (TP) system:
 * - Base from damage dealt
 * - Kill bonus
 * - Penalty from expected counter damage / survival risk
 * - Personality modifies the weights
 */
export function scoreAction(combat: CombatScore, personality: AiPersonality): number {
  const weights = PERSONALITY_WEIGHTS[personality];

  let score = 0;

  // Base damage reward
  score += combat.attackerDamage * weights.damageWeight;

  // Kill bonus (massive spike)
  if (combat.canKill) {
    score += weights.killBonus;
  }

  // Net damage bonus (favors trades where we come out ahead)
  score += combat.netDamage * weights.netDamageWeight;

  // Survival penalty (FE GBA TP penalty = 20 - attackerHP, scaled)
  score -= combat.survivalRisk * weights.riskWeight;

  // Ensure score is never negative (matches FE GBA clamping behavior)
  return Math.max(0, score);
}

interface PersonalityWeights {
  damageWeight: number;
  killBonus: number;
  netDamageWeight: number;
  riskWeight: number;
}

const PERSONALITY_WEIGHTS: Record<AiPersonality, PersonalityWeights> = {
  [AiPersonality.AGGRESSIVE]: {
    damageWeight: 1.5,
    killBonus: 80,
    netDamageWeight: 1.0,
    riskWeight: 0.3,
  },
  [AiPersonality.CAUTIOUS]: {
    damageWeight: 1.0,
    killBonus: 30,
    netDamageWeight: 2.0,
    riskWeight: 2.0,
  },
  [AiPersonality.BALANCED]: {
    damageWeight: 1.0,
    killBonus: 50,
    netDamageWeight: 1.0,
    riskWeight: 1.0,
  },
  [AiPersonality.BERSERKER]: {
    damageWeight: 2.0,
    killBonus: 40,
    netDamageWeight: 0,
    riskWeight: 0,
  },
};
```

**Step 4: Run to verify GREEN**

**Step 5: Commit**

```bash
git add src/game/ai/Personality.ts src/game/ai/__tests__/Personality.test.ts
git commit -m "feat(ai): add AiPersonality types with weighted action scoring"
```

---

### Task 7.3: Create `AiBehavior` — FE GBA Behavior Patterns

**Objective:** Encode the classic FE GBA AI behavior bytes as a clean TypeScript enum + predicate system. This lets level designers assign behaviors like `PURSUE`, `ATTACK_IN_RANGE`, `GUARD`, `BOSS_GUARD` to enemies.

**Files:**
- Create: `src/game/ai/Behavior.ts`
- Create: `src/game/ai/__tests__/Behavior.test.ts`

**Step 1: Write failing test**

```typescript
// src/game/ai/__tests__/Behavior.test.ts
import { describe, it, expect } from 'vitest';
import { AiBehavior, shouldPursue, shouldAttackInRange, shouldRetreat } from '../Behavior';
import { Unit, Faction, UnitClass } from '../../units/Unit';
import { createStats } from '../../units/Stats';

describe('AiBehavior', () => {
  const makeUnit = (hp: number, maxHp: number) => {
    const stats = createStats({ hp, maxHp, str: 5, mag: 0, skl: 5, spd: 5, luk: 5, def: 5, res: 5, mov: 5 });
    return new Unit('e1', 'Grunt', Faction.ENEMY, UnitClass.SOLDIER, stats, 0, 0);
  };

  it('PURSUE always allows pursuit', () => {
    const unit = makeUnit(20, 20);
    expect(shouldPursue(AiBehavior.PURSUE, unit)).toBe(true);
  });

  it('ATTACK_IN_RANGE does not pursue when no targets in range', () => {
    const unit = makeUnit(20, 20);
    expect(shouldPursue(AiBehavior.ATTACK_IN_RANGE, unit)).toBe(false);
  });

  it('GUARD never pursues', () => {
    const unit = makeUnit(20, 20);
    expect(shouldPursue(AiBehavior.GUARD, unit)).toBe(false);
    expect(shouldAttackInRange(AiBehavior.GUARD, unit)).toBe(false);
  });

  it('BOSS_GUARD only attacks in range and never pursues', () => {
    const unit = makeUnit(20, 20);
    expect(shouldPursue(AiBehavior.BOSS_GUARD, unit)).toBe(false);
    expect(shouldAttackInRange(AiBehavior.BOSS_GUARD, unit)).toBe(true);
  });

  it('RECOVER_MODE triggers retreat when HP below threshold', () => {
    const unit = makeUnit(3, 20); // 15% HP
    expect(shouldRetreat(AiBehavior.RECOVER_MODE, unit)).toBe(true);
  });

  it('RECOVER_MODE does not trigger retreat when HP is healthy', () => {
    const unit = makeUnit(18, 20); // 90% HP
    expect(shouldRetreat(AiBehavior.RECOVER_MODE, unit)).toBe(false);
  });

  it('THIEF raids then switches to PURSUE', () => {
    // THIEF is a two-phase behavior: raid first, then pursue.
    // The predicate just reports current phase based on a flag.
    const unit = makeUnit(20, 20);
    expect(shouldPursue(AiBehavior.THIEF, unit)).toBe(true); // default after raid
  });
});
```

**Step 2: Run to verify RED**

**Step 3: Write implementation**

```typescript
// src/game/ai/Behavior.ts
import { Unit } from '../units/Unit';

/**
 * Fire Emblem GBA-inspired AI behavior patterns.
 * These map closely to the AI1/AI2 byte combinations documented by the ROM hacking community.
 *
 * Reference:
 * - 0x00/0x00 = PURSUE (aggressive, move toward enemies, attack)
 * - 0x03/0x03 = GUARD (stand still, do nothing)
 * - 0x00/0x03 = ATTACK_IN_RANGE (attack if in range, otherwise don't move)
 * - 0x03/0x00 = BOSS_GUARD (don't move, but attack in range)
 * - 0x06/0x0C = THIEF (raid/escape behavior)
 * - AI3 recovery thresholds = RECOVER_MODE (retreat when HP low)
 * - 0x06/0x06 = EXPANDED_RANGE (activate when foe in move×2 range)
 */
export enum AiBehavior {
  /** Move toward and attack enemies. Classic grunt AI (AI1=0x00, AI2=0x00). */
  PURSUE = 'pursue',
  /** Attack only if target already in range; do not move to engage (AI1=0x03, AI2=0x03). */
  ATTACK_IN_RANGE = 'attack_in_range',
  /** Do not move, do not attack. Pure obstacle (AI1=0x06, AI2=0x03). */
  GUARD = 'guard',
  /** Do not move, but attack if something enters range (AI1=0x03, AI2=0x00-ish). */
  BOSS_GUARD = 'boss_guard',
  /** Retreat when HP is below threshold; seek healing (AI3 recovery mode). */
  RECOVER_MODE = 'recover_mode',
  /** Raid objective, then change to PURSUE (brigand/pirate AI). */
  THIEF = 'thief',
  /** Activate only when enemy enters expanded range (move × 2) (AI2=0x06). */
  EXPANDED_RANGE = 'expanded_range',
}

/** Recovery threshold: enter recovery mode when HP < 50%. Matches FE GBA default AI3=0x00. */
const RECOVERY_THRESHOLD = 0.5;

export function shouldPursue(behavior: AiBehavior, _unit: Unit): boolean {
  switch (behavior) {
    case AiBehavior.PURSUE:
    case AiBehavior.THIEF:
    case AiBehavior.EXPANDED_RANGE:
      return true;
    case AiBehavior.ATTACK_IN_RANGE:
    case AiBehavior.GUARD:
    case AiBehavior.BOSS_GUARD:
    case AiBehavior.RECOVER_MODE:
      return false;
  }
}

export function shouldAttackInRange(behavior: AiBehavior, _unit: Unit): boolean {
  switch (behavior) {
    case AiBehavior.PURSUE:
    case AiBehavior.ATTACK_IN_RANGE:
    case AiBehavior.BOSS_GUARD:
    case AiBehavior.THIEF:
    case AiBehavior.EXPANDED_RANGE:
      return true;
    case AiBehavior.GUARD:
    case AiBehavior.RECOVER_MODE:
      return false;
  }
}

export function shouldRetreat(behavior: AiBehavior, unit: Unit): boolean {
  if (behavior === AiBehavior.RECOVER_MODE) {
    return unit.stats.hp / unit.stats.maxHp < RECOVERY_THRESHOLD;
  }
  // Other behaviors may also retreat if critically wounded — optional extension point
  return false;
}

export function isStationary(behavior: AiBehavior): boolean {
  return behavior === AiBehavior.GUARD || behavior === AiBehavior.BOSS_GUARD;
}
```

**Step 4: Run to verify GREEN**

**Step 5: Commit**

```bash
git add src/game/ai/Behavior.ts src/game/ai/__tests__/Behavior.test.ts
git commit -m "feat(ai): add AiBehavior enum with FE GBA-style pattern predicates"
```

---

### Task 7.4: Refactor `Targeting.ts`

**Objective:** Replace the old `scoreTarget` implementation with one that uses `CombatEvaluator` + `AiPersonality`. The old function only looked at raw damage; the new one considers counterattacks, personality weighting, and kill potential.

**Files:**
- Modify: `src/game/ai/Targeting.ts`
- Modify: `src/game/ai/__tests__/Targeting.test.ts`

**Step 1: Write the new test first (update existing test file)**

Add new tests to the existing `Targeting.test.ts`:

```typescript
// Add to src/game/ai/__tests__/Targeting.test.ts
import { AiPersonality } from '../Personality';
import { CombatScore } from '../CombatEvaluator';

// ... existing tests ...

describe('Targeting with personality', () => {
  const grid = new Grid(10, 10);

  const makeEnemy = () => {
    const stats = createStats({ hp: 26, str: 9, mag: 0, skl: 4, spd: 5, luk: 3, def: 5, res: 1, mov: 5 });
    return new Unit('e1', 'Bandit', Faction.ENEMY, UnitClass.BRIGAND, stats, 5, 5);
  };

  const makeWeak = () => {
    const stats = createStats({ hp: 16, str: 1, mag: 9, skl: 6, spd: 7, luk: 5, def: 2, res: 7, mov: 5 });
    return new Unit('p1', 'Elara', Faction.PLAYER, UnitClass.MAGE, stats, 6, 5);
  };

  it('AGGRESSIVE prefers a kill even with counter risk', () => {
    const enemy = makeEnemy();
    const weak = makeWeak();
    // With a weapon that can kill but takes counter damage
    const killWeapon = { ...WEAPON_DB['Iron Axe'], mt: 10 };
    const scoreAgg = scoreTarget(enemy, weak, killWeapon, grid, AiPersonality.AGGRESSIVE);
    const scoreCaut = scoreTarget(enemy, weak, killWeapon, grid, AiPersonality.CAUTIOUS);
    // Aggressive should value the kill more despite any risk
    expect(scoreAgg).toBeGreaterThanOrEqual(scoreCaut);
  });

  it('CAUTIOUS avoids high-risk targets', () => {
    const enemy = makeEnemy();
    // Place enemy on low terrain; target is on forest with high def
    const toughStats = createStats({ hp: 25, str: 10, mag: 0, skl: 8, spd: 8, luk: 6, def: 8, res: 2, mov: 5 });
    const tough = new Unit('p2', 'Knight', Faction.PLAYER, UnitClass.SOLDIER, toughStats, 6, 5);
    grid.setTerrain(tough.gridX, tough.gridY, TerrainType.FOREST);

    const scoreCaut = scoreTarget(enemy, tough, WEAPON_DB['Iron Axe'], grid, AiPersonality.CAUTIOUS);
    const scoreBers = scoreTarget(enemy, tough, WEAPON_DB['Iron Axe'], grid, AiPersonality.BERSERKER);
    // Berserker ignores risk, so should score higher than cautious
    expect(scoreBers).toBeGreaterThan(scoreCaut);
  });
});
```

**Step 2: Run to verify RED**

**Step 3: Update implementation**

Replace the contents of `src/game/ai/Targeting.ts`:

```typescript
import { Unit, Faction } from '../units/Unit';
import { Grid } from '../map/Grid';
import { WeaponData } from '../combat/Weapons';
import { evaluateCombat, CombatScore } from './CombatEvaluator';
import { scoreAction, AiPersonality } from './Personality';

export { AiPersonality } from './Personality';

export interface TargetScore {
  target: Unit;
  combat: CombatScore;
  actionScore: number;
}

/**
 * Score a potential target for the attacker.
 * Higher score = better target.
 *
 * Replacement for the old damage-only scoring.
 * Now simulates full combat (attack + counter) and applies personality weighting.
 *
 * @param attacker    The enemy unit evaluating targets
 * @param target      A candidate target
 * @param weapon      Attacker's weapon
 * @param grid        Game grid
 * @param personality AI personality driving decision weights
 * @param targetWeapon Optional: weapon the target would counter with
 */
export function scoreTarget(
  attacker: Unit,
  target: Unit,
  weapon: WeaponData,
  grid: Grid,
  personality: AiPersonality = AiPersonality.BALANCED,
  targetWeapon?: WeaponData,
): number {
  if (!target.isAlive) {
    return 0;
  }
  if (target.faction === attacker.faction) {
    return 0;
  }
  if (target.faction === Faction.ALLY) {
    return 0;
  }

  const combat = evaluateCombat(attacker, target, weapon, grid, targetWeapon);

  // Bonus for already-damaged targets (finish them off)
  // This is a FE GBA heuristic: wounded units are prioritized
  const woundedBonus = (target.stats.maxHp - target.stats.hp) * 2;

  const actionScore = scoreAction(combat, personality);
  return actionScore + woundedBonus;
}

/**
 * Pick the best target from a list. Returns null if no valid targets.
 */
export function pickBestTarget(
  attacker: Unit,
  targets: Unit[],
  weapon: WeaponData,
  grid: Grid,
  personality: AiPersonality = AiPersonality.BALANCED,
  targetWeaponResolver?: (unit: Unit) => WeaponData | undefined,
): Unit | null {
  let best: Unit | null = null;
  let bestScore = 0;

  for (const target of targets) {
    const targetWeapon = targetWeaponResolver ? targetWeaponResolver(target) : undefined;
    const score = scoreTarget(attacker, target, weapon, grid, personality, targetWeapon);
    if (score > bestScore) {
      bestScore = score;
      best = target;
    }
  }

  return best;
}
```

**Step 4: Run to verify GREEN**

```bash
npx vitest run src/game/ai/__tests__/Targeting.test.ts
```
Expected: all old tests still pass + new personality tests pass.

**Step 5: Commit**

```bash
git add src/game/ai/Targeting.ts src/game/ai/__tests__/Targeting.test.ts
git commit -m "refactor(ai): Targeting now uses CombatEvaluator + AiPersonality scoring"
```

---

### Task 7.5: Refactor `Commander.ts`

**Objective:** Major overhaul. Add:
1. **Pursuit logic**: When no player is in move+attack range, move toward the nearest player anyway (FE GBA AI2=0x00 behavior).
2. **Terrain-aware movement scoring**: When multiple tiles are equally close to the target, prefer tiles with higher defense/avoid bonuses.
3. **Behavior filtering**: Skip enemies whose `AiBehavior` forbids movement or attack.
4. **Claimed-tile safety**: Keep the existing anti-overlap logic but also prevent moving onto tiles threatened by players (optional advanced feature — skip for MVP if too complex).

**Files:**
- Modify: `src/game/ai/Commander.ts`
- Modify: `src/game/ai/__tests__/Commander.test.ts`

**Step 1: Write failing test additions**

```typescript
// Additions to src/game/ai/__tests__/Commander.test.ts
import { AiBehavior } from '../Behavior';
import { AiPersonality } from '../Personality';

// ... existing tests ...

describe('Commander enhanced behaviors', () => {
  it('pursues nearest player when no target is in attack range', () => {
    const grid = new Grid(10, 10);

    const enemyStats = createStats({ hp: 26, str: 9, mag: 0, skl: 4, spd: 5, luk: 3, def: 5, res: 1, mov: 3 });
    const enemy = new Unit('e1', 'Bandit', Faction.ENEMY, UnitClass.BRIGAND, enemyStats, 0, 0);
    enemy.aiBehavior = AiBehavior.PURSUE;
    grid.placeUnit(enemy, 0, 0);

    const playerStats = createStats({ hp: 22, str: 8, mag: 2, skl: 7, spd: 8, luk: 6, def: 6, res: 2, mov: 5 });
    const player = new Unit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, playerStats, 9, 9);
    grid.placeUnit(player, 9, 9);

    const commander = new Commander(grid, WEAPON_DB);
    const actions = commander.planEnemyTurn([enemy], [player]);

    // Should move toward player even though no attack is possible this turn
    const moveAction = actions.find((a) => a.type === ActionType.MOVE);
    expect(moveAction).toBeDefined();
    // Should have moved closer to (9,9)
    const destDist = Math.abs(moveAction!.x - 9) + Math.abs(moveAction!.y - 9);
    const startDist = Math.abs(0 - 9) + Math.abs(0 - 9);
    expect(destDist).toBeLessThan(startDist);
  });

  it('GUARD behavior does not move or attack', () => {
    const grid = new Grid(10, 10);

    const enemyStats = createStats({ hp: 26, str: 9, mag: 0, skl: 4, spd: 5, luk: 3, def: 5, res: 1, mov: 5 });
    const enemy = new Unit('e1', 'Guard', Faction.ENEMY, UnitClass.SOLDIER, enemyStats, 5, 5);
    enemy.aiBehavior = AiBehavior.GUARD;
    grid.placeUnit(enemy, 5, 5);

    const playerStats = createStats({ hp: 22, str: 8, mag: 2, skl: 7, spd: 8, luk: 6, def: 6, res: 2, mov: 5 });
    const player = new Unit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, playerStats, 6, 5);
    grid.placeUnit(player, 6, 5);

    const commander = new Commander(grid, WEAPON_DB);
    const actions = commander.planEnemyTurn([enemy], [player]);

    expect(actions).toHaveLength(0);
  });

  it('BOSS_GUARD attacks in range but does not move', () => {
    const grid = new Grid(10, 10);

    const enemyStats = createStats({ hp: 40, str: 12, mag: 0, skl: 6, spd: 6, luk: 4, def: 8, res: 3, mov: 5 });
    const enemy = new Unit('e1', 'Boss', Faction.ENEMY, UnitClass.BRIGAND, enemyStats, 5, 5);
    enemy.aiBehavior = AiBehavior.BOSS_GUARD;
    grid.placeUnit(enemy, 5, 5);

    const playerStats = createStats({ hp: 22, str: 8, mag: 2, skl: 7, spd: 8, luk: 6, def: 6, res: 2, mov: 5 });
    const player = new Unit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, playerStats, 6, 5);
    grid.placeUnit(player, 6, 5);

    const commander = new Commander(grid, WEAPON_DB);
    const actions = commander.planEnemyTurn([enemy], [player]);

    expect(actions.find((a) => a.type === ActionType.MOVE)).toBeUndefined();
    expect(actions.find((a) => a.type === ActionType.ATTACK)).toBeDefined();
  });

  it('prefers moving to terrain with defense bonus when approaching', () => {
    const grid = new Grid(10, 10);
    grid.setTerrain(4, 5, TerrainType.FOREST); // forest tile next to player

    const enemyStats = createStats({ hp: 26, str: 9, mag: 0, skl: 4, spd: 5, luk: 3, def: 5, res: 1, mov: 3 });
    const enemy = new Unit('e1', 'Bandit', Faction.ENEMY, UnitClass.BRIGAND, enemyStats, 3, 5);
    enemy.aiBehavior = AiBehavior.PURSUE;
    grid.placeUnit(enemy, 3, 5);

    const playerStats = createStats({ hp: 22, str: 8, mag: 2, skl: 7, spd: 8, luk: 6, def: 6, res: 2, mov: 5 });
    const player = new Unit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, playerStats, 6, 5);
    grid.placeUnit(player, 6, 5);

    const commander = new Commander(grid, WEAPON_DB);
    const actions = commander.planEnemyTurn([enemy], [player]);

    const moveAction = actions.find((a) => a.type === ActionType.MOVE);
    expect(moveAction).toBeDefined();
    // Forest at (4,5) is on the path and has a defense bonus; smart AI should end there
    // At minimum, should not end on a worse tile when a better one is equally reachable
    expect(moveAction!.x).toBe(4);
    expect(moveAction!.y).toBe(5);
  });
});
```

**Step 2: Run to verify RED**

**Step 3: Update implementation**

Replace `src/game/ai/Commander.ts`:

```typescript
import { Unit } from '../units/Unit';
import { Grid } from '../map/Grid';
import { WeaponData } from '../combat/Weapons';
import { computeMoveRange } from '../movement/MoveRange';
import { findPath } from '../movement/Pathfinder';
import { pickBestTarget } from './Targeting';
import { Action, ActionType, GridPoint } from '../state/ActionQueue';
import { AiBehavior, shouldPursue, shouldAttackInRange, isStationary } from './Behavior';
import { AiPersonality } from './Personality';
import { TerrainData } from '../map/Terrain';

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
      if (!enemy.isAlive) continue;

      const behavior = enemy.aiBehavior ?? AiBehavior.PURSUE;
      const personality = enemy.aiPersonality ?? AiPersonality.BALANCED;

      if (behavior === AiBehavior.GUARD) continue;

      const weapon = this.getWeapon(enemy);
      if (!weapon) continue;

      const moveRange = computeMoveRange(enemy, this.grid);
      // Remove already-claimed tiles
      for (const key of claimedTiles) {
        moveRange.delete(key);
      }

      const reachable = this.findReachableTargets(enemy, players, moveRange, weapon);

      if (reachable.length > 0 && shouldAttackInRange(behavior, enemy)) {
        // Standard attack flow
        const target = pickBestTarget(
          enemy,
          reachable,
          weapon,
          this.grid,
          personality,
          (u) => this.getWeapon(u) ?? undefined,
        );
        if (target) {
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
          continue;
        }
      }

      // No reachable target — pursue if behavior allows
      if (shouldPursue(behavior, enemy) && !isStationary(behavior)) {
        const nearest = this.findNearestPlayer(enemy, players);
        if (nearest) {
          const approachPos = this.findBestApproachOrPursuit(enemy, nearest, moveRange);
          if (approachPos && (approachPos[0] !== enemy.gridX || approachPos[1] !== enemy.gridY)) {
            const rawPath = findPath(enemy, this.grid, approachPos[0], approachPos[1]);
            const path: GridPoint[] | undefined = rawPath
              ? rawPath.map((p) => ({ x: p.x, y: p.y }))
              : undefined;
            actions.push({
              type: ActionType.MOVE,
              actor: enemy,
              x: approachPos[0],
              y: approachPos[1],
              path,
            });
            claimedTiles.add(`${String(approachPos[0])},${String(approachPos[1])}`);
          }
        }
      }
    }

    return actions;
  }

  private getWeapon(unit: Unit): WeaponData | null {
    if (unit.unitClass === 'mage') return this.weaponDb.Fire;
    if (unit.unitClass === 'brigand') return this.weaponDb['Iron Axe'];
    if (unit.unitClass === 'soldier') return this.weaponDb['Iron Lance'];
    if (unit.unitClass === 'archer') return this.weaponDb['Iron Bow'];
    return this.weaponDb['Iron Sword'];
  }

  private findReachableTargets(
    _enemy: Unit,
    players: Unit[],
    moveRange: Map<string, number>,
    weapon: WeaponData,
  ): Unit[] {
    return players.filter((player) => {
      if (!player.isAlive) return false;
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
    let bestScore = -Infinity;

    for (const [key] of moveRange) {
      const [x, y] = key.split(',').map(Number);
      const dist = Math.abs(x - target.gridX) + Math.abs(y - target.gridY);
      if (dist >= weapon.minRange && dist <= weapon.maxRange) {
        // Terrain scoring: prefer tiles with higher defense/avoid
        const terrain = this.grid.getTerrainData(x, y);
        const terrainScore = terrain.defenseBonus * 10 + terrain.avoidBonus * 0.5;
        // Closer is better, but terrain can outweigh 1-tile difference
        const score = -dist * 100 + terrainScore;
        if (score > bestScore) {
          bestScore = score;
          best = [x, y];
        }
      }
    }

    return best;
  }

  private findNearestPlayer(enemy: Unit, players: Unit[]): Unit | null {
    let nearest: Unit | null = null;
    let nearestDist = Infinity;
    for (const player of players) {
      if (!player.isAlive) continue;
      const dist = Math.abs(enemy.gridX - player.gridX) + Math.abs(enemy.gridY - player.gridY);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = player;
      }
    }
    return nearest;
  }

  private findBestApproachOrPursuit(
    enemy: Unit,
    target: Unit,
    moveRange: Map<string, number>,
  ): [number, number] | null {
    let best: [number, number] | null = null;
    let bestScore = -Infinity;

    for (const [key] of moveRange) {
      const [x, y] = key.split(',').map(Number);
      const dist = Math.abs(x - target.gridX) + Math.abs(y - target.gridY);
      const terrain = this.grid.getTerrainData(x, y);
      const terrainScore = terrain.defenseBonus * 10 + terrain.avoidBonus * 0.5;
      // Pursuit: minimize distance to target, but still value good terrain
      const score = -dist * 100 + terrainScore;
      if (score > bestScore) {
        bestScore = score;
        best = [x, y];
      }
    }

    return best;
  }
}
```

**Step 4: Run to verify GREEN**

```bash
npx vitest run src/game/ai/__tests__/Commander.test.ts
```
Expected: all existing tests pass + new behavior tests pass.

**Step 5: Commit**

```bash
git add src/game/ai/Commander.ts src/game/ai/__tests__/Commander.test.ts
git commit -m "feat(ai): Commander adds pursuit, terrain-aware movement, and AiBehavior filtering"
```

---

### Task 7.6: Extend `Unit` with AI fields

**Objective:** Add `aiBehavior` and `aiPersonality` optional properties to the `Unit` class so level designers and `GameEngine.addUnit` can configure them.

**Files:**
- Modify: `src/game/units/Unit.ts`
- Modify: `src/game/units/__tests__/Unit.test.ts`

**Step 1: Write failing test**

```typescript
// Add to src/game/units/__tests__/Unit.test.ts
import { AiBehavior } from '../../ai/Behavior';
import { AiPersonality } from '../../ai/Personality';

// ... existing tests ...

describe('Unit AI configuration', () => {
  it('defaults aiBehavior to undefined', () => {
    const stats = createStats({ hp: 20, str: 5, mag: 0, skl: 5, spd: 5, luk: 5, def: 5, res: 5, mov: 5 });
    const unit = new Unit('u1', 'Test', Faction.ENEMY, UnitClass.SOLDIER, stats, 0, 0);
    expect(unit.aiBehavior).toBeUndefined();
    expect(unit.aiPersonality).toBeUndefined();
  });

  it('can set aiBehavior and aiPersonality', () => {
    const stats = createStats({ hp: 20, str: 5, mag: 0, skl: 5, spd: 5, luk: 5, def: 5, res: 5, mov: 5 });
    const unit = new Unit('u1', 'Test', Faction.ENEMY, UnitClass.SOLDIER, stats, 0, 0);
    unit.aiBehavior = AiBehavior.GUARD;
    unit.aiPersonality = AiPersonality.CAUTIOUS;
    expect(unit.aiBehavior).toBe(AiBehavior.GUARD);
    expect(unit.aiPersonality).toBe(AiPersonality.CAUTIOUS);
  });
});
```

**Step 2: Run to verify RED**

**Step 3: Update implementation**

Add to `src/game/units/Unit.ts` inside the `Unit` class:

```typescript
  /** AI behavior pattern (e.g., PURSUE, GUARD, ATTACK_IN_RANGE). */
  aiBehavior?: import('../ai/Behavior').AiBehavior;
  /** AI personality affecting target prioritization (e.g., AGGRESSIVE, CAUTIOUS). */
  aiPersonality?: import('../ai/Personality').AiPersonality;
```

Place these after the existing private fields, before the constructor.

**Step 4: Run to verify GREEN**

```bash
npx vitest run src/game/units/__tests__/Unit.test.ts
```

**Step 5: Commit**

```bash
git add src/game/units/Unit.ts src/game/units/__tests__/Unit.test.ts
git commit -m "feat(units): add aiBehavior and aiPersonality fields to Unit"
```

---

### Task 7.7: Wire into `GameEngine`

**Objective:** Update `GameEngine.addUnit` to accept optional `aiBehavior` and `aiPersonality` parameters, and pass them through to the `Unit`. Also update `GameEngine` tests.

**Files:**
- Modify: `src/game/GameEngine.ts`
- Modify: `src/game/__tests__/GameEngine.test.ts`

**Step 1: Write failing test**

```typescript
// Add to src/game/__tests__/GameEngine.test.ts
import { AiBehavior } from '../ai/Behavior';
import { AiPersonality } from '../ai/Personality';

// ... existing tests ...

describe('GameEngine AI configuration', () => {
  it('can add a unit with aiBehavior and aiPersonality', () => {
    const engine = new GameEngine(10, 10);
    const stats = createStats({ hp: 20, str: 5, mag: 0, skl: 5, spd: 5, luk: 5, def: 5, res: 5, mov: 5 });
    const unit = engine.addUnit('e1', 'Guard', Faction.ENEMY, UnitClass.SOLDIER, stats, 5, 5, {
      aiBehavior: AiBehavior.GUARD,
      aiPersonality: AiPersonality.CAUTIOUS,
    });
    expect(unit.aiBehavior).toBe(AiBehavior.GUARD);
    expect(unit.aiPersonality).toBe(AiPersonality.CAUTIOUS);
  });

  it('enemy phase respects GUARD behavior', () => {
    const engine = new GameEngine(10, 10);

    const enemyStats = createStats({ hp: 26, str: 9, mag: 0, skl: 4, spd: 5, luk: 3, def: 5, res: 1, mov: 5 });
    engine.addUnit('e1', 'Guard', Faction.ENEMY, UnitClass.BRIGAND, enemyStats, 5, 5, {
      aiBehavior: AiBehavior.GUARD,
    });

    const playerStats = createStats({ hp: 22, str: 8, mag: 2, skl: 7, spd: 8, luk: 6, def: 6, res: 2, mov: 5 });
    engine.addUnit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, playerStats, 6, 5);

    // End player turn to trigger enemy phase
    engine.endTurn(); // player -> enemy
    const actions = engine.getPendingActions();

    // GUARD unit should produce no actions
    expect(actions).toHaveLength(0);
  });
});
```

**Step 2: Run to verify RED**

**Step 3: Update implementation**

Update the `addUnit` signature and body in `src/game/GameEngine.ts`:

```typescript
  addUnit(
    id: string,
    name: string,
    faction: Faction,
    unitClass: UnitClass,
    stats: UnitStats,
    gridX: number,
    gridY: number,
    aiConfig?: { aiBehavior?: import('./ai/Behavior').AiBehavior; aiPersonality?: import('./ai/Personality').AiPersonality },
  ): Unit {
    const unit = new Unit(id, name, faction, unitClass, stats, gridX, gridY);
    if (aiConfig?.aiBehavior) {
      unit.aiBehavior = aiConfig.aiBehavior;
    }
    if (aiConfig?.aiPersonality) {
      unit.aiPersonality = aiConfig.aiPersonality;
    }
    const startingItems = getStartingItems(unitClass);
    for (const item of startingItems) {
      unit.inventory.add(item);
    }
    this.units.push(unit);
    this.grid.placeUnit(unit, gridX, gridY);
    return unit;
  }
```

**Step 4: Run to verify GREEN**

```bash
npx vitest run src/game/__tests__/GameEngine.test.ts
```

**Step 5: Commit**

```bash
git add src/game/GameEngine.ts src/game/__tests__/GameEngine.test.ts
git commit -m "feat(engine): addUnit accepts aiBehavior and aiPersonality config"
```

---

### Task 7.8: Update barrel exports and run full suite

**Objective:** Export all new AI modules from `src/game/ai/index.ts` and verify the entire test suite is green.

**Files:**
- Modify: `src/game/ai/index.ts`

**Step 1: Update barrel export**

```typescript
// src/game/ai/index.ts
export { Commander } from './Commander';
export { scoreTarget, pickBestTarget } from './Targeting';
export { evaluateCombat, type CombatScore } from './CombatEvaluator';
export { scoreAction, AiPersonality } from './Personality';
export { AiBehavior, shouldPursue, shouldAttackInRange, shouldRetreat, isStationary } from './Behavior';
```

**Step 2: Run full test suite**

```bash
npx vitest run
```

Expected: all tests pass. If any `tsc --noEmit` noise appears from ES5 target, ignore per project convention; only fix actual test failures.

**Step 3: Commit**

```bash
git add src/game/ai/index.ts
git commit -m "chore(ai): export new AI modules from barrel index"
```

---

## Verification Checklist

- [ ] `npx vitest run` passes all tests
- [ ] `CombatEvaluator` correctly simulates counterattacks and returns `survivalRisk`
- [ ] `AiPersonality.AGGRESSIVE` scores kills higher than `CAUTIOUS`
- [ ] `AiPersonality.CAUTIOUS` heavily penalizes high `survivalRisk`
- [ ] `AiPersonality.BERSERKER` ignores survival risk entirely
- [ ] `AiBehavior.PURSUE` enemies move toward nearest player when no attack is possible
- [ ] `AiBehavior.GUARD` enemies produce zero actions
- [ ] `AiBehavior.BOSS_GUARD` enemies attack in range but never move
- [ ] `AiBehavior.RECOVER_MODE` enemies retreat when HP < 50%
- [ ] `Commander` terrain-aware movement prefers forest/mountain tiles over plains when equally close
- [ ] `Unit` stores `aiBehavior` and `aiPersonality` correctly
- [ ] `GameEngine.addUnit` accepts and applies AI configuration
- [ ] No Phaser imports anywhere in `src/game/`
- [ ] No existing gameplay behavior regressed (old Targeting/Commander tests still pass)

---

## Design Decisions & Reference Notes

### Why these specific features?

| Feature | FE GBA Source | Why it matters |
|---------|---------------|----------------|
| Counterattack simulation | TP system evaluates both attack and counter | Prevents AI from suiciding into strong counters |
| Personality weighting | FE GBA TP_Modifier table | Different enemy types feel distinct |
| `PURSUE` vs `ATTACK_IN_RANGE` | AI1/AI2 bytes 0x00/0x00 vs 0x03/0x03 | Grunts chase; sentries hold position |
| `BOSS_GUARD` | Bosses that don't move but counterattack | Creates tactical puzzles |
| Terrain-aware movement | FE AI considers terrain for target selection | Enemies hug forests and forts |
| Pursuit when out of range | AI2=0x00 "move toward opponents" | Prevents enemies from standing idle |
| Recovery mode | AI3 thresholds (50%/30%/10% HP) | Damaged enemies become less aggressive |

### What was deliberately NOT included (YAGNI)

- **Staff usage by AI** — no enemy healers in current roster
- **Stealing/looting** — no stealable items or village mechanics yet
- **Door keys / terrain destruction** — no doors or breakable walls yet
- **Expanded range activation (AI2=0x06)** — can be added later when maps are larger
- **Exact FE GBA TP formula** — simplified to net-damage + personality; the original formula has many magic constants that don't map cleanly to our stat system

---

## Next Phase

- Level designers can now assign `aiBehavior` and `aiPersonality` in `LevelDefinition` units.
- Future work: add `AiBehavior.EXPANDED_RANGE` for ambush encounters.
- Future work: enemy staff users with `AiBehavior.HEALER`.
