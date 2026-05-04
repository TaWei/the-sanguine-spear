# Phase 15: Luck and Critical Attacks Enhancement

> **For Hermes:** Use `subagent-driven-development` skill to implement this plan task-by-task.

**Goal:** Expand the existing luck/critical foundation into a full Fire Emblem GBA-style system: Killer weapons with high crit, class-based crit bonuses (Swordmaster/Berserker), pre-combat Hit% / Crit% display in battle panels, and enemy threat preview showing incoming crit risk.

**Research Summary (Fire Emblem GBA — Blazing Blade / Sacred Stones):**
- **Hit Rate** = weapon hit + (skill × 2) + floor(luck / 2) + triangle bonus — *already implemented*
- **Avoid** = (speed × 2) + luck + terrain avoid bonus — *already implemented*
- **Display Hit** = attacker hit − defender avoid, clamped 0–100 — *already implemented*
- **2RN True Hit** = average of two RNs 0–99 vs display hit — *already implemented*
- **Crit Rate** = floor(skill / 2) + weapon crit + class bonus + support bonus + S-rank bonus
- **Crit Avoid (Dodge)** = luck — *already implemented*
- **Display Crit** = attacker crit − defender crit avoid, clamped 0–100
- **Crit Damage** = normal damage × 3 — *already implemented*
- **Class Crit Bonuses:** Swordmaster/Berserker +15 in Blazing Blade; +15 Swordmaster/Berserker/Journeyman(3)/Recruit(3) in Sacred Stones
- **Killer Weapons:** Killer Sword/Lance/Axe/Bow typically have +30 crit over iron versions

**Architecture:** Pure logic additions to `Formulas.ts` and `Weapons.ts`. UI changes in `BattleScene.ts` (battle panels + enemy preview). All game rules remain in `src/game/`.

**Tech Stack:** TypeScript, Vitest

**Prerequisite:** Phase 14 complete.

---

### Task 15.1: Add `calcDisplayCrit` formula helper and crit clamping

**Objective:** Extract the display crit calculation into a testable pure function with 0–100 clamping, matching the `calcDisplayHit` pattern.

**Files:**
- Modify: `src/game/combat/Formulas.ts`
- Modify: `src/game/combat/__tests__/Formulas.test.ts`

**Step 1: Write failing test**

```typescript
// Add to src/game/combat/__tests__/Formulas.test.ts
import { calcDisplayCrit } from '../Formulas';

describe('calcDisplayCrit', () => {
  it('is attacker crit rate - defender crit avoid', () => {
    const crit = calcCritRate(30, 10); // weapon 30 + floor(10/2) = 35
    const avoid = calcCritAvoid(5);    // 5
    expect(calcDisplayCrit(crit, avoid)).toBe(30);
  });

  it('clamps to 0 minimum', () => {
    expect(calcDisplayCrit(3, 10)).toBe(0);
  });

  it('clamps to 100 maximum', () => {
    expect(calcDisplayCrit(200, 0)).toBe(100);
  });

  it('0 display crit means no crit possible', () => {
    expect(calcDisplayCrit(0, 0)).toBe(0);
  });
});
```

**Step 2: Run to verify RED**

```bash
npx vitest run src/game/combat/__tests__/Formulas.test.ts
```

**Step 3: Write implementation**

```typescript
// Add to src/game/combat/Formulas.ts
export function calcDisplayCrit(critRate: number, critAvoid: number): number {
  return Math.max(0, Math.min(100, critRate - critAvoid));
}
```

**Step 4: Run to verify GREEN**

**Step 5: Refactor `CombatEngine` to use the new helper**

Replace the inline `Math.max(0, critRate - critAvoid)` in `Engine.ts` with `calcDisplayCrit`.

**Step 6: Commit**

```bash
git add src/game/combat/Formulas.ts src/game/combat/__tests__/Formulas.test.ts src/game/combat/Engine.ts
git commit -m "feat: add calcDisplayCrit helper with clamping"
```

---

### Task 15.2: Add Killer weapons to the weapon database

**Objective:** Introduce high-crit weapons so the crit system is actually reachable in gameplay. Killer weapons are the Fire Emblem standard for reliable crit.

**Files:**
- Modify: `src/game/combat/Weapons.ts`
- Modify: `src/game/combat/__tests__/Weapons.test.ts`

**Step 1: Write failing test**

```typescript
// Add to src/game/combat/__tests__/Weapons.test.ts
import { WEAPON_DB } from '../Weapons';

describe('Killer Weapons', () => {
  it('Killer Sword has +30 crit and lower hit than Iron Sword', () => {
    const w = WEAPON_DB['Killer Sword'];
    expect(w).toBeDefined();
    expect(w.type).toBe('sword');
    expect(w.mt).toBe(6);
    expect(w.hit).toBe(85);
    expect(w.crit).toBe(30);
    expect(w.minRange).toBe(1);
    expect(w.maxRange).toBe(1);
  });

  it('Killer Lance has +30 crit', () => {
    const w = WEAPON_DB['Killer Lance'];
    expect(w).toBeDefined();
    expect(w.type).toBe('lance');
    expect(w.crit).toBe(30);
  });

  it('Killer Axe has +30 crit', () => {
    const w = WEAPON_DB['Killer Axe'];
    expect(w).toBeDefined();
    expect(w.type).toBe('axe');
    expect(w.crit).toBe(30);
  });

  it('Killer Bow has +30 crit', () => {
    const w = WEAPON_DB['Killer Bow'];
    expect(w).toBeDefined();
    expect(w.type).toBe('bow');
    expect(w.crit).toBe(30);
    expect(w.minRange).toBe(2);
    expect(w.maxRange).toBe(2);
  });
});
```

**Step 2: Run to verify RED**

**Step 3: Write implementation**

```typescript
// Add entries to WEAPON_DB in src/game/combat/Weapons.ts
'Killer Sword': {
  name: 'Killer Sword',
  type: WeaponType.SWORD,
  mt: 6,
  hit: 85,
  crit: 30,
  minRange: 1,
  maxRange: 1,
  usesMagic: false,
},
'Killer Lance': {
  name: 'Killer Lance',
  type: WeaponType.LANCE,
  mt: 7,
  hit: 80,
  crit: 30,
  minRange: 1,
  maxRange: 1,
  usesMagic: false,
},
'Killer Axe': {
  name: 'Killer Axe',
  type: WeaponType.AXE,
  mt: 9,
  hit: 75,
  crit: 30,
  minRange: 1,
  maxRange: 1,
  usesMagic: false,
},
'Killer Bow': {
  name: 'Killer Bow',
  type: WeaponType.BOW,
  mt: 7,
  hit: 80,
  crit: 30,
  minRange: 2,
  maxRange: 2,
  usesMagic: false,
},
```

**Step 4: Run to verify GREEN**

**Step 5: Commit**

```bash
git add src/game/combat/Weapons.ts src/game/combat/__tests__/Weapons.test.ts
git commit -m "feat: add Killer weapons with +30 crit"
```

---

### Task 15.3: Add class-based critical bonuses

**Objective:** In GBA Fire Emblem, Swordmasters and Berserkers get a +15 class bonus to crit rate. Update `calcCritRate` to accept an optional class bonus, and wire it through `CombatEngine`.

**Files:**
- Modify: `src/game/combat/Formulas.ts`
- Modify: `src/game/combat/__tests__/Formulas.test.ts`
- Modify: `src/game/combat/Engine.ts`

**Step 1: Write failing test**

```typescript
// Add to src/game/combat/__tests__/Formulas.test.ts
import { calcCritRate } from '../Formulas';

describe('calcCritRate with class bonus', () => {
  it('adds class bonus to base crit', () => {
    // weapon 0 + floor(10/2) + 15 class = 20
    expect(calcCritRate(0, 10, 15)).toBe(20);
  });

  it('defaults class bonus to 0', () => {
    expect(calcCritRate(0, 10)).toBe(5);
  });

  it('stacks weapon crit, skill, and class bonus', () => {
    // Killer weapon 30 + floor(20/2) + 15 = 55
    expect(calcCritRate(30, 20, 15)).toBe(55);
  });
});
```

**Step 2: Run to verify RED**

**Step 3: Write implementation**

```typescript
// Update in src/game/combat/Formulas.ts
export function calcCritRate(weaponCrit: number, skl: number, classBonus = 0): number {
  return weaponCrit + Math.floor(skl / 2) + classBonus;
}
```

**Step 4: Run to verify GREEN**

**Step 5: Wire class bonus into CombatEngine**

Add a helper in `Engine.ts` to compute class bonus based on `unit.unitClass`:

```typescript
private getClassCritBonus(unit: Unit): number {
  if (unit.unitClass === 'mercenary' || unit.unitClass === 'brigand') {
    return 15; // Swordmaster / Berserker line
  }
  return 0;
}
```

Update the crit calculation in `resolveAttack`:

```typescript
const critRate = calcCritRate(weapon.crit, attStats.skl, this.getClassCritBonus(attacker));
```

Add integration test in `src/game/combat/__tests__/Engine.test.ts`:

```typescript
it('critical hit deals 3x damage', () => {
  // Use RNG that forces a crit: RN 0 < displayCrit
  const rng = makeRng([0, 0, 0]); // hit RN1, hit RN2, crit RN
  const result = engine.resolveCombat(attacker, defender, WEAPON_DB['Killer Sword'], WEAPON_DB['Iron Axe'], rng);
  const entry = result.log[0];
  expect(entry.critical).toBe(true);
  expect(entry.damage).toBeGreaterThan(8); // normal is ~8, crit should be ~24
});
```

**Step 6: Commit**

```bash
git add src/game/combat/Formulas.ts src/game/combat/__tests__/Formulas.test.ts src/game/combat/Engine.ts src/game/combat/__tests__/Engine.test.ts
git commit -m "feat: class-based crit bonuses for swordmaster/berserker"
```

---

### Task 15.4: Compute and expose pre-combat Hit% / Crit% in GameEngine

**Objective:** Before combat resolves, the UI needs the *displayed* hit and crit percentages. Add a pure function to `GameEngine` that returns these stats for a prospective attacker→defender engagement.

**Files:**
- Modify: `src/game/GameEngine.ts`
- Modify: `src/game/__tests__/GameEngine.test.ts`

**Step 1: Write failing test**

```typescript
// Add to src/game/__tests__/GameEngine.test.ts
import { calcDisplayHit, calcHitRate, calcAvoid, calcCritRate, calcCritAvoid, calcDisplayCrit } from '../combat/Formulas';

describe('combat preview stats', () => {
  it('returns hit% and crit% for a prospective combat', () => {
    const engine = new GameEngine(10, 10);
    const pStats = createStats({ hp: 22, str: 8, mag: 2, skl: 7, spd: 8, luk: 6, def: 6, res: 2, mov: 5 });
    const eStats = createStats({ hp: 26, str: 9, mag: 0, skl: 4, spd: 5, luk: 3, def: 5, res: 1, mov: 5 });
    const player = engine.addUnit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, pStats, 5, 5);
    const enemy = engine.addUnit('e1', 'Bandit', Faction.ENEMY, UnitClass.BRIGAND, eStats, 6, 5);

    const preview = engine.getCombatPreview(player, enemy);

    // Iron Sword: hit 90, crit 0
    // hitRate = 90 + 7*2 + floor(6/2) = 107
    // avoid = 5*2 + 3 = 13
    // displayHit = 107 - 13 = 94
    expect(preview.hit).toBe(94);

    // critRate = 0 + floor(7/2) + 0 = 3
    // critAvoid = 6
    // displayCrit = max(0, 3 - 6) = 0
    expect(preview.crit).toBe(0);

    // Expected damage: str 8 + mt 5 - def 5 = 8
    expect(preview.damage).toBe(8);
  });

  it('returns crit% > 0 when using a Killer weapon', () => {
    const engine = new GameEngine(10, 10);
    const pStats = createStats({ hp: 22, str: 8, mag: 2, skl: 10, spd: 8, luk: 6, def: 6, res: 2, mov: 5 });
    const eStats = createStats({ hp: 26, str: 9, mag: 0, skl: 4, spd: 5, luk: 3, def: 5, res: 1, mov: 5 });
    const player = engine.addUnit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, pStats, 5, 5);
    const enemy = engine.addUnit('e1', 'Bandit', Faction.ENEMY, UnitClass.BRIGAND, eStats, 6, 5);

    const preview = engine.getCombatPreview(player, enemy, WEAPON_DB['Killer Sword']);

    // critRate = 30 + floor(10/2) + 0 = 35
    // critAvoid = 3
    // displayCrit = 32
    expect(preview.crit).toBe(32);
  });
});
```

**Step 2: Run to verify RED**

**Step 3: Write implementation**

```typescript
// Add to src/game/GameEngine.ts
import { calcDisplayHit, calcHitRate, calcAvoid, calcCritRate, calcCritAvoid, calcDisplayCrit, calcDamage } from './combat/Formulas';
import { getWeaponTriangleMod } from './combat/Weapons';

export interface CombatPreview {
  hit: number;
  crit: number;
  damage: number;
  doubleAttack: boolean;
}

// inside GameEngine class:
getCombatPreview(attacker: Unit, defender: Unit, attackerWeapon?: WeaponData, defenderWeapon?: WeaponData): CombatPreview {
  const attWeapon = attackerWeapon ?? this.getWeaponForUnit(attacker);
  const defWeapon = defenderWeapon ?? this.getWeaponForUnit(defender);
  const attStats = attacker.stats;
  const defStats = defender.stats;

  const triangle = getWeaponTriangleMod(attWeapon.type, defWeapon.type);

  // Hit
  const hitRate = calcHitRate(attWeapon.hit, attStats.skl, attStats.luk) + triangle.hitBonus;
  const terrainData = this.grid.getTerrainData(defender.gridX, defender.gridY);
  const avoid = calcAvoid(defStats.spd, defStats.luk, terrainData.avoidBonus);
  const hit = calcDisplayHit(hitRate, avoid);

  // Crit
  const classBonus = this.getClassCritBonus(attacker);
  const critRate = calcCritRate(attWeapon.crit, attStats.skl, classBonus);
  const critAvoid = calcCritAvoid(defStats.luk);
  const crit = calcDisplayCrit(critRate, critAvoid);

  // Damage
  const atkStat = attWeapon.usesMagic ? attStats.mag : attStats.str;
  const defStat = attWeapon.usesMagic ? defStats.res : defStats.def;
  const damage = calcDamage(atkStat, attWeapon.mt + triangle.mtBonus, defStat, attWeapon.usesMagic);

  // Follow-up attack check (speed difference ≥ 4)
  const doubleAttack = attStats.spd - defStats.spd >= 4;

  return { hit, crit, damage, doubleAttack };
}

private getClassCritBonus(unit: Unit): number {
  if (unit.unitClass === 'mercenary' || unit.unitClass === 'brigand') {
    return 15;
  }
  return 0;
}
```

**Step 4: Run to verify GREEN**

**Step 5: Commit**

```bash
git add src/game/GameEngine.ts src/game/__tests__/GameEngine.test.ts
git commit -m "feat: add combat preview with hit%, crit%, and double-attack flag"
```

---

### Task 15.5: Render Hit% / Crit% / Dmg in battle panels

**Objective:** When the battle overlay opens, show the attacker and defender's prospective hit, crit, and expected damage. This is standard Fire Emblem UI.

**Files:**
- Modify: `src/scenes/BattleScene.ts`
- Modify: `src/scenes/__tests__/BattleSceneState.test.ts` (if applicable)

**Step 1: Write failing test (engine-level)**

The BattleScene is a Phaser scene and has no unit tests. Verify via the existing `GameEngine` tests after adding preview support, then test manually in the browser.

**Step 2: Modify `createUnitBattlePanel`**

In `BattleScene.ts`, update `createUnitBattlePanel` to accept an optional `CombatPreview` and render stats:

```typescript
private createUnitBattlePanel(
  unit: Unit,
  x: number,
  y: number,
  color: number,
  preview?: CombatPreview,
): Phaser.GameObjects.Container {
  // ... existing panel setup (name, class, HP) ...

  // Combat stats row
  if (preview) {
    const statsText = this.add.text(
      0,
      55,
      `Hit ${preview.hit}%  Crit ${preview.crit}%  Dmg ${preview.damage}`,
      { fontSize: '11px', color: '#ecf0f1' },
    ).setOrigin(0.5);
    panel.add(statsText);
  }

  return panel;
}
```

**Step 3: Compute preview in `startBattleMode`**

```typescript
// In startBattleMode, before creating panels:
const attPreview = this.engine.getCombatPreview(attacker, defender);
const defPreview = this.engine.getCombatPreview(defender, attacker);

// Then pass to panel creation:
const attPanel = this.createUnitBattlePanel(attacker, attX, attY, 0x3498db, attPreview);
const defPanel = this.createUnitBattlePanel(defender, defX, defY, 0xe74c3c, defPreview);
```

**Step 4: Manual verification**

Run `npm run dev`, start a battle, move adjacent to an enemy, select Fight → target. Verify:
- Attacker panel shows Hit%, Crit%, Dmg
- Defender panel shows counter Hit%, Crit%, Dmg (if in range)
- Killer weapon equipped → Crit% is 30+ instead of 0

**Step 5: Commit**

```bash
git add src/scenes/BattleScene.ts
git commit -m "feat: display hit%, crit%, and dmg in battle overlay panels"
```

---

### Task 15.6: Enhance Enemy Preview with threat stats

**Objective:** When the player clicks an enemy, show not just the enemy's raw stats but the *derived* combat stats: how much damage the enemy would deal, their hit%, and their crit% against the currently selected player unit.

**Files:**
- Modify: `src/game/ui/EnemyPreview.ts`
- Modify: `src/game/ui/__tests__/EnemyPreview.test.ts`
- Modify: `src/scenes/BattleScene.ts`

**Step 1: Write failing test**

```typescript
// src/game/ui/__tests__/EnemyPreview.test.ts
import { describe, it, expect } from 'vitest';
import { EnemyPreview } from '../EnemyPreview';
import { Unit, Faction, UnitClass } from '../../units/Unit';
import { createStats } from '../../units/Stats';

describe('EnemyPreview with threat stats', () => {
  it('stores threat preview data', () => {
    const preview = new EnemyPreview();
    const enemy = new Unit('e1', 'Bandit', Faction.ENEMY, UnitClass.BRIGAND, createStats({
      hp: 20, str: 8, mag: 0, skl: 4, spd: 5, luk: 3, def: 5, res: 1, mov: 5,
    }), 5, 5);

    preview.show(enemy, { hit: 65, crit: 5, damage: 12, doubleAttack: false });

    expect(preview.unit).toBe(enemy);
    expect(preview.threat?.hit).toBe(65);
    expect(preview.threat?.crit).toBe(5);
    expect(preview.threat?.damage).toBe(12);
  });

  it('clears threat data on clear()', () => {
    const preview = new EnemyPreview();
    const enemy = new Unit('e1', 'Bandit', Faction.ENEMY, UnitClass.BRIGAND, createStats({
      hp: 20, str: 8, mag: 0, skl: 4, spd: 5, luk: 3, def: 5, res: 1, mov: 5,
    }), 5, 5);
    preview.show(enemy, { hit: 65, crit: 5, damage: 12, doubleAttack: false });

    preview.clear();
    expect(preview.unit).toBeNull();
    expect(preview.threat).toBeNull();
  });
});
```

**Step 2: Run to verify RED**

**Step 3: Update EnemyPreview**

```typescript
// src/game/ui/EnemyPreview.ts
import { Unit } from '../units/Unit';
import { CombatPreview } from '../GameEngine';

export class EnemyPreview {
  private _unit: Unit | null = null;
  private _threat: CombatPreview | null = null;

  get isActive(): boolean {
    return this._unit !== null;
  }

  get unit(): Unit | null {
    return this._unit;
  }

  get threat(): CombatPreview | null {
    return this._threat;
  }

  show(unit: Unit, threat?: CombatPreview): void {
    this._unit = unit;
    this._threat = threat ?? null;
  }

  clear(): void {
    this._unit = null;
    this._threat = null;
  }
}
```

**Step 4: Update BattleScene `showEnemyPreview`**

When the player has a `selectedUnit` and clicks an enemy, compute the enemy's threat against the selected unit:

```typescript
private showEnemyPreview(enemy: Unit): void {
  let threat: CombatPreview | undefined;
  if (this.selectedUnit) {
    threat = this.engine.getCombatPreview(enemy, this.selectedUnit);
  }
  this.enemyPreview.show(enemy, threat);
  // ... existing overlay rendering ...
}
```

Update the overlay rendering to include threat stats (Hit%, Crit%, Dmg) if available.

**Step 5: Run to verify GREEN**

**Step 6: Commit**

```bash
git add src/game/ui/EnemyPreview.ts src/game/ui/__tests__/EnemyPreview.test.ts src/scenes/BattleScene.ts
git commit -m "feat: enemy preview shows threat hit%, crit%, and dmg"
```

---

### Task 15.7: Full integration test — end-to-end crit kill

**Objective:** Write a combat integration test that verifies a critical hit from a Killer weapon actually kills a low-HP enemy, and that luck-based crit avoid can prevent it.

**Files:**
- Modify: `src/game/__tests__/GameEngine.test.ts`

**Step 1: Write failing test**

```typescript
// Add to src/game/__tests__/GameEngine.test.ts
import { WEAPON_DB } from '../combat/Weapons';

describe('critical hit integration', () => {
  it('killer weapon crit deals 3x damage and can one-shot', () => {
    const engine = new GameEngine(10, 10);
    const pStats = createStats({ hp: 22, str: 10, mag: 2, skl: 10, spd: 8, luk: 6, def: 6, res: 2, mov: 5 });
    const eStats = createStats({ hp: 20, str: 9, mag: 0, skl: 4, spd: 5, luk: 3, def: 3, res: 1, mov: 5 });
    const player = engine.addUnit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, pStats, 5, 5);
    const enemy = engine.addUnit('e1', 'Bandit', Faction.ENEMY, UnitClass.BRIGAND, eStats, 6, 5);

    // Guaranteed hit, guaranteed crit
    const result = engine.resolvePlayerCombat(player, enemy, () => 0);
    expect(result.log[0].critical).toBe(true);

    // Normal damage: 10 + 6 - 3 = 13. Crit = 39. Enemy has 20 HP → dies.
    expect(enemy.isAlive).toBe(false);
  });

  it('high luck reduces crit chance to 0', () => {
    const engine = new GameEngine(10, 10);
    const pStats = createStats({ hp: 22, str: 10, mag: 2, skl: 10, spd: 8, luk: 6, def: 6, res: 2, mov: 5 });
    const eStats = createStats({ hp: 50, str: 9, mag: 0, skl: 4, spd: 5, luk: 40, def: 3, res: 1, mov: 5 });
    const player = engine.addUnit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, pStats, 5, 5);
    const enemy = engine.addUnit('e1', 'Bandit', Faction.ENEMY, UnitClass.BRIGAND, eStats, 6, 5);

    const preview = engine.getCombatPreview(player, enemy, WEAPON_DB['Killer Sword']);
    // critRate = 30 + 5 + 0 = 35. critAvoid = 40. displayCrit = 0.
    expect(preview.crit).toBe(0);
  });
});
```

**Step 2: Run to verify RED**

**Step 3: Ensure implementation passes**

The implementation from previous tasks should make this green. If `getCombatPreview` takes an optional weapon, wire it.

**Step 4: Run to verify GREEN**

**Step 5: Commit**

```bash
git add src/game/__tests__/GameEngine.test.ts
git commit -m "test: integration tests for killer crit kills and luck-based crit avoidance"
```

---

## Acceptance Checklist

- [ ] `calcDisplayCrit` exists, is tested, and is used by `CombatEngine`
- [ ] Killer Sword, Killer Lance, Killer Axe, Killer Bow exist with crit=30
- [ ] `calcCritRate` accepts an optional class bonus; Swordmaster/Berserker get +15
- [ ] `GameEngine.getCombatPreview` returns `{ hit, crit, damage, doubleAttack }`
- [ ] Battle overlay panels show Hit%, Crit%, and Dmg for both combatants
- [ ] Enemy preview shows threat stats (enemy's hit/crit/dmg vs selected player unit)
- [ ] All new tests pass: `npx vitest run`
- [ ] Manual browser test: equip Killer weapon, observe crit % > 0 in battle panel
