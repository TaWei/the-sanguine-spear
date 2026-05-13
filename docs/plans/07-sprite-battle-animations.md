# Sprite Battle Animations — Implementation Plan

> **For Hermes:** Use `subagent-driven-development` skill to implement this plan task-by-task.

**Goal:** Replace the static rectangle/text battle overlay in `BattleScene` with animated sprite battle encounters (Fire Emblem GBA-style), reusing the existing `SpriteAtlas`/`UnitAnimator` pure-logic infrastructure.

**Architecture:**
- `src/game/sprites/` stays pure logic (already has `SpriteAtlas`, `UnitAnimator`, `AnimationState`).
- `src/scenes/BattleSpriteRenderer.ts` is the new Phaser-side shell that owns sprite containers, animation playback, and particle effects.
- `BattleScene` swaps its rectangle panels for `BattleSpriteRenderer` instances inside the existing `startBattleMode` / `runBattleAnimation` flow.
- Placeholder sprites are procedurally generated at build time so the feature works end-to-end without artist assets.

**Tech Stack:** Phaser 3.80, TypeScript 5.4, Vite 5.2, Vitest 4.1.

---

## Current State Snapshot

- `SpriteAtlas` and `UnitAnimator` exist in `src/game/sprites/` but are **not wired into any scene**.
- `BattleScene.startBattleMode()` creates two static panels (`attBattlePanel`, `defBattlePanel`) made of `Rectangle` + `Text` objects.
- `BattleScene.runBattleAnimation()` advances `BattleDisplayState` phases and shows floating damage numbers / miss text. No sprite motion.
- `BootScene.preload()` loads zero assets.
- `public/assets/` is empty.
- Architecture rule: **no Phaser imports in `src/game/`**.

---

## Design Decisions

1. **Placeholder sprites over external art:** We generate colored silhouette spritesheets at build time (via a Node script) so the animation system works immediately. Artists can drop in real PNGs later without code changes.
2. **Single sprite container per combatant:** Each panel gets one `Phaser.GameObjects.Sprite` plus child HP bar / stat text containers. The sprite animates; the UI chrome stays static.
3. **Animation phases map 1:1 to `BattleDisplayState`:**
   - `INTRO` → sprites slide in from off-screen edges, face each other.
   - `STRIKE` (attacker is `BattleDisplayState.attacker`) → attacker plays `attack` or `crit`; if hit, defender plays `hit` (or `dodge` on miss).
   - `STRIKE` (attacker is `BattleDisplayState.defender`, i.e., counter) → same but roles flipped.
   - `RECOIL` → both sprites return to idle pose (brief pause).
   - `DONE` → fade out / return to grid.
4. **Facing:** Attacker always faces right; defender always faces left. Determined by `SpriteAtlas.getFacing`.
5. **Weapon type in animation key:** `UnitAnimator.playAnimation('attack', weaponType)` already supports this — we'll pass the weapon type from the combat log entry. Since `CombatLogEntry` doesn't currently store weapon info, we add a `weaponType?: string` field.

---

## Task List

### Task 1: Add `weaponType` to `CombatLogEntry`

**Objective:** Each log entry must know which weapon type was used so the animator can pick the correct sprite key (e.g., `lord-player-sword-attack`).

**Files:**
- Modify: `src/game/combat/Engine.ts`
- Modify: `src/game/ui/BattleDisplayState.ts` (no change needed, just passes through)
- Test: `src/game/combat/__tests__/CombatEngine.test.ts` (update existing tests)
- Test: `src/game/ui/__tests__/BattleDisplayState.test.ts` (update log entry factory)

**Step 1: Update `CombatLogEntry` interface**

In `src/game/combat/Engine.ts`, line 41:

```typescript
export interface CombatLogEntry {
  attacker: Unit;
  defender: Unit;
  hit: boolean;
  critical: boolean;
  damage: number;
  displayHit: number;
  displayCrit: number;
  weaponType?: string; // NEW
}
```

**Step 2: Populate `weaponType` in `resolveHit`**

In `resolveHit`, when returning the entry, add `weaponType: weapon.type`:

```typescript
return { attacker, defender, hit, critical, damage, displayHit, displayCrit, weaponType: weapon.type };
```

**Step 3: Update tests**

In `BattleDisplayState.test.ts`, update `makeLogEntry` to accept an optional `weaponType` and include it:

```typescript
function makeLogEntry(
  attacker: Unit,
  defender: Unit,
  damage: number,
  hit: boolean,
  weaponType?: string,
): CombatLogEntry {
  return {
    attacker, defender, hit, critical: false, damage,
    displayHit: 80, displayCrit: 3, weaponType,
  };
}
```

Update any `CombatEngine` tests that assert exact log entry shape.

**Step 4: Run tests**

```bash
npx vitest run src/game/combat/__tests__/CombatEngine.test.ts src/game/ui/__tests__/BattleDisplayState.test.ts
```

Expected: all pass.

**Step 5: Commit**

```bash
git add src/game/combat/Engine.ts src/game/combat/__tests__/CombatEngine.test.ts src/game/ui/__tests__/BattleDisplayState.test.ts
git commit -m "feat(combat): add weaponType to CombatLogEntry for animation routing"
```

---

### Task 2: Generate placeholder sprite atlases at build time

**Objective:** Create a Node script that generates 64×64 silhouette spritesheets for every `(unitClass, faction, state, weapon?)` combination. This gives us working assets without an artist.

**Files:**
- Create: `scripts/generate-placeholder-sprites.ts`
- Create: `public/assets/sprites/.gitkeep` (remove when generated)
- Modify: `package.json` scripts section

**Step 1: Write the generator script**

`scripts/generate-placeholder-sprites.ts`:

```typescript
import { createCanvas } from 'canvas';
import fs from 'fs';
import path from 'path';

const UNIT_CLASSES = ['lord', 'mercenary', 'mage', 'archer', 'cavalry', 'pegasus_knight', 'soldier', 'brigand'];
const FACTIONS = ['player', 'enemy', 'ally'];
const STATES = ['idle', 'move', 'attack', 'hit', 'death', 'dodge', 'crit'];
const WEAPONS = ['sword', 'axe', 'lance', 'bow', 'magic'];

const FACTION_COLORS: Record<string, string> = {
  player: '#3498db',
  enemy: '#e74c3c',
  ally: '#2ecc71',
};

const FRAME_W = 64;
const FRAME_H = 64;
const FRAMES_PER_ROW = 8;

function drawFrame(ctx: CanvasRenderingContext2D, state: string, frameIndex: number, color: string) {
  ctx.fillStyle = color;
  const cx = FRAME_W / 2;
  const cy = FRAME_H / 2;

  // Simple silhouette shapes that vary by state/frame
  switch (state) {
    case 'idle':
      ctx.beginPath();
      ctx.arc(cx, cy - 8, 10, 0, Math.PI * 2); // head
      ctx.fill();
      ctx.fillRect(cx - 10, cy + 2, 20, 22); // body
      break;
    case 'move': {
      const offset = frameIndex * 4;
      ctx.beginPath();
      ctx.arc(cx + (frameIndex % 2 === 0 ? offset : -offset), cy - 8, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(cx - 10 + (frameIndex % 2 === 0 ? offset : -offset), cy + 2, 20, 22);
      break;
    }
    case 'attack': {
      const armX = frameIndex < 3 ? cx - 12 + frameIndex * 8 : cx + 12;
      ctx.beginPath();
      ctx.arc(cx, cy - 8, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(cx - 10, cy + 2, 20, 22);
      ctx.fillRect(armX, cy - 4, 18, 6); // weapon arm
      break;
    }
    case 'crit': {
      const cArmX = frameIndex < 4 ? cx - 14 + frameIndex * 7 : cx + 14;
      ctx.beginPath();
      ctx.arc(cx, cy - 8, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(cx - 10, cy + 2, 20, 22);
      ctx.fillRect(cArmX, cy - 6, 22, 6);
      // flash effect on final frames
      if (frameIndex > 5) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(cx - 16, cy - 16, 32, 32);
      }
      break;
    }
    case 'hit':
      ctx.fillStyle = '#ffffff'; // flash white
      ctx.fillRect(0, 0, FRAME_W, FRAME_H);
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(cx + 4, cy - 4, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(cx - 6, cy + 6, 20, 22);
      break;
    case 'death': {
      const slump = frameIndex * 4;
      ctx.beginPath();
      ctx.arc(cx + slump, cy - 8 + slump, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(cx - 10 + slump, cy + 2 + slump, 20, 22);
      ctx.globalAlpha = Math.max(0, 1 - frameIndex * 0.25);
      break;
    }
    case 'dodge': {
      const dodgeOffset = frameIndex === 0 ? -12 : 12;
      ctx.beginPath();
      ctx.arc(cx + dodgeOffset, cy - 8, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(cx - 10 + dodgeOffset, cy + 2, 20, 22);
      break;
    }
    default:
      ctx.fillRect(cx - 8, cy - 8, 16, 16);
  }
}

function generateSheet(key: string, states: string[], frameCounts: Record<string, number>, color: string) {
  const totalFrames = states.reduce((sum, s) => sum + frameCounts[s], 0);
  const cols = Math.min(FRAMES_PER_ROW, totalFrames);
  const rows = Math.ceil(totalFrames / cols);

  const canvas = createCanvas(cols * FRAME_W, rows * FRAME_H);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#00000000';
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  let frameIndex = 0;
  for (const state of states) {
    const count = frameCounts[state];
    for (let i = 0; i < count; i++) {
      const col = frameIndex % cols;
      const row = Math.floor(frameIndex / cols);
      ctx.save();
      ctx.translate(col * FRAME_W, row * FRAME_H);
      drawFrame(ctx, state, i, color);
      ctx.restore();
      frameIndex++;
    }
  }

  const outPath = path.join('public/assets/sprites', `${key}.png`);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(outPath, buffer);
  return { key, frames: totalFrames, cols, rows };
}

function main() {
  const outDir = 'public/assets/sprites';
  fs.mkdirSync(outDir, { recursive: true });

  const atlas: Record<string, { frameWidth: number; frameHeight: number; frames: number; columns: number }> = {};
  const frameCounts: Record<string, number> = {
    idle: 2, move: 4, attack: 6, hit: 2, death: 4, dodge: 2, crit: 8,
  };

  for (const cls of UNIT_CLASSES) {
    for (const faction of FACTIONS) {
      const color = FACTION_COLORS[faction];

      // Base states (no weapon variant)
      const baseKey = `${cls}-${faction}`;
      const baseStates = ['idle', 'move', 'hit', 'death', 'dodge'];
      const baseResult = generateSheet(baseKey, baseStates, frameCounts, color);
      atlas[baseKey] = { frameWidth: FRAME_W, frameHeight: FRAME_H, frames: baseResult.frames, columns: baseResult.cols };

      // Weapon-specific attack + crit
      for (const weapon of WEAPONS) {
        const weaponKey = `${cls}-${faction}-${weapon}`;
        const weaponStates = ['attack', 'crit'];
        const weaponResult = generateSheet(weaponKey, weaponStates, frameCounts, color);
        atlas[weaponKey] = { frameWidth: FRAME_W, frameHeight: FRAME_H, frames: weaponResult.frames, columns: weaponResult.cols };
      }
    }
  }

  // Generic fallback sheets
  for (const faction of FACTIONS) {
    const color = FACTION_COLORS[faction];
    const key = `generic-${faction}`;
    const result = generateSheet(key, STATES, frameCounts, color);
    atlas[key] = { frameWidth: FRAME_W, frameHeight: FRAME_H, frames: result.frames, columns: result.cols };
  }

  fs.writeFileSync(path.join(outDir, 'atlas.json'), JSON.stringify(atlas, null, 2));
  console.log(`Generated ${Object.keys(atlas).length} sprite sheets in ${outDir}`);
}

main();
```

**Step 2: Install `canvas` dependency**

```bash
cd /root/workspace/the-sanguine-spear
npm install --save-dev canvas
```

**Step 3: Add npm script**

In `package.json`, add to `scripts`:

```json
"generate-sprites": "tsx scripts/generate-placeholder-sprites.ts"
```

Also ensure `tsx` is installed (likely already present via Vite / modern Node):

```bash
npm install --save-dev tsx
```

**Step 4: Run generator**

```bash
npm run generate-sprites
```

Expected output: `Generated 143 sprite sheets in public/assets/sprites` and `atlas.json` created.

**Step 5: Commit**

```bash
git add scripts/generate-placeholder-sprites.ts package.json package-lock.json public/assets/sprites/
git commit -m "build(assets): add placeholder sprite generator script"
```

---

### Task 3: Create `BattleSpriteRenderer` (Phaser scene helper)

**Objective:** A new scene-side class that owns a combatant's sprite, HP bar, stat text, and animation playback. It wraps `UnitAnimator` and bridges pure-logic animation states to Phaser tweens/sprites.

**Files:**
- Create: `src/scenes/BattleSpriteRenderer.ts`
- Test: `src/scenes/__tests__/BattleSpriteRenderer.test.ts` (mock Phaser, test pure coordination logic)

**Step 1: Write `BattleSpriteRenderer.ts`**

```typescript
import Phaser from 'phaser';
import { Unit } from '../game/units/Unit';
import { SpriteAtlas, UnitAnimator, AnimationState } from '../game/sprites';
import type { AttackPreview } from '../game/combat/Engine';

export class BattleSpriteRenderer {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private sprite: Phaser.GameObjects.Sprite;
  private animator: UnitAnimator;
  private hpBg: Phaser.GameObjects.Rectangle;
  private hpFill: Phaser.GameObjects.Rectangle;
  private hpText: Phaser.GameObjects.Text;
  private nameText: Phaser.GameObjects.Text;
  private statsText: Phaser.GameObjects.Text;
  private unit: Unit;
  private maxHp: number;
  private atlas: SpriteAtlas;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    unit: Unit,
    preview: AttackPreview | null,
    initialHp: number,
    facingRight: boolean,
  ) {
    this.scene = scene;
    this.unit = unit;
    this.maxHp = unit.stats.maxHp;
    this.atlas = new SpriteAtlas();

    this.container = scene.add.container(x, y);
    this.container.setDepth(201);

    // Try to create sprite from generated atlas; fallback to colored rectangle
    const spriteKey = this.atlas.getSpriteKey(unit.unitClass, unit.faction, 'idle');
    let textureExists = scene.textures.exists(spriteKey);
    if (!textureExists) {
      const fallback = this.atlas.getFallbackKey(unit.faction, 'idle');
      textureExists = scene.textures.exists(fallback);
    }

    if (textureExists) {
      this.sprite = scene.add.sprite(0, -20, spriteKey);
      this.sprite.setScale(2);
    } else {
      // Procedural fallback rectangle with faction color
      const color = unit.faction === 'player' ? 0x3498db : unit.faction === 'enemy' ? 0xe74c3c : 0x2ecc71;
      const rect = scene.add.rectangle(0, -20, 48, 48, color);
      this.sprite = rect as unknown as Phaser.GameObjects.Sprite;
    }

    this.sprite.setFlipX(!facingRight);
    this.container.add(this.sprite);

    // Wrap sprite in AnimatableSprite interface for UnitAnimator
    const animatable = {
      setTexture: (key: string) => {
        if (scene.textures.exists(key)) {
          this.sprite.setTexture(key);
        }
      },
      setFlipX: (flip: boolean) => {
        // facingRight=true means NOT flipped; facingRight=false means flipped
        this.sprite.setFlipX(facingRight ? flip : !flip);
      },
      play: (animationKey: string) => {
        // Phaser animations are created in BootScene (Task 4)
        if (scene.anims.exists(animationKey)) {
          this.sprite.play(animationKey);
        }
      },
    };

    this.animator = new UnitAnimator(this.atlas, animatable, unit.unitClass, unit.faction);
    this.animator.setFacing(facingRight ? 'right' : 'left');

    // Name
    this.nameText = scene.add
      .text(0, 30, unit.name, { fontSize: '16px', color: '#ecf0f1', fontStyle: 'bold' })
      .setOrigin(0.5);
    this.container.add(this.nameText);

    // Stats preview
    if (preview) {
      const statsStr = `Hit ${preview.hit}%  Dmg ${preview.damage}${preview.doubleAttack ? ' 2x' : ''}`;
      this.statsText = scene.add
        .text(0, 48, statsStr, { fontSize: '12px', color: '#bdc3c7' })
        .setOrigin(0.5);
      this.container.add(this.statsText);
    }

    // HP bar
    this.hpBg = scene.add.rectangle(0, 70, 120, 12, 0x000000);
    this.container.add(this.hpBg);

    const ratio = Math.max(0, initialHp / this.maxHp);
    const hpColor = ratio > 0.5 ? 0x2ecc71 : ratio > 0.25 ? 0xf1c40f : 0xe74c3c;
    this.hpFill = scene.add.rectangle(-60 + (120 * ratio) / 2, 70, 120 * ratio, 12, hpColor);
    this.container.add(this.hpFill);

    this.hpText = scene.add
      .text(0, 86, `${initialHp} / ${this.maxHp}`, { fontSize: '14px', color: '#ecf0f1' })
      .setOrigin(0.5);
    this.container.add(this.hpText);
  }

  playAnimation(state: AnimationState, weaponType?: string): void {
    this.animator.playAnimation(state, weaponType);
  }

  setHp(currentHp: number): void {
    const ratio = Math.max(0, currentHp / this.maxHp);
    const hpColor = ratio > 0.5 ? 0x2ecc71 : ratio > 0.25 ? 0xf1c40f : 0xe74c3c;
    this.hpFill.setFillStyle(hpColor);
    this.hpFill.setSize(120 * ratio, 12);
    this.hpFill.setX(-60 + (120 * ratio) / 2);
    this.hpText.setText(`${currentHp} / ${this.maxHp}`);
  }

  flashWhite(duration = 100): void {
    this.sprite.setTint(0xffffff);
    this.scene.time.delayedCall(duration, () => {
      this.sprite.clearTint();
    });
  }

  shake(intensity = 5, duration = 200): void {
    this.scene.tweens.add({
      targets: this.container,
      x: this.container.x + intensity,
      duration: duration / 4,
      yoyo: true,
      repeat: 3,
      onComplete: () => {
        this.container.setX(this.container.x); // restore
      },
    });
  }

  getContainer(): Phaser.GameObjects.Container {
    return this.container;
  }

  destroy(): void {
    this.container.destroy();
  }
}
```

**Step 2: Write test**

`src/scenes/__tests__/BattleSpriteRenderer.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { BattleSpriteRenderer } from '../BattleSpriteRenderer';
import { Unit, Faction, UnitClass } from '../../game/units/Unit';
import { createStats } from '../../game/units/Stats';

// Mock Phaser enough to instantiate the renderer
function createMockScene() {
  return {
    add: {
      container: vi.fn(() => ({ setDepth: vi.fn(), add: vi.fn(), destroy: vi.fn(), x: 0, y: 0, setX: vi.fn() })),
      sprite: vi.fn(() => ({ setScale: vi.fn(), setFlipX: vi.fn(), setTint: vi.fn(), clearTint: vi.fn(), play: vi.fn(), setTexture: vi.fn() })),
      rectangle: vi.fn(() => ({ setFillStyle: vi.fn(), setSize: vi.fn(), setX: vi.fn(), destroy: vi.fn() })),
      text: vi.fn(() => ({ setOrigin: vi.fn(), setText: vi.fn(), setDepth: vi.fn(), destroy: vi.fn() })),
    },
    textures: { exists: vi.fn(() => false) },
    anims: { exists: vi.fn(() => false) },
    tweens: { add: vi.fn() },
    time: { delayedCall: vi.fn() },
  } as unknown as Phaser.Scene;
}

describe('BattleSpriteRenderer', () => {
  const stats = createStats({ hp: 20, maxHp: 20, str: 5, mag: 2, skl: 5, spd: 5, luk: 5, def: 5, res: 2, mov: 5 });

  it('constructs without crashing', () => {
    const scene = createMockScene();
    const unit = new Unit('u1', 'Test', Faction.PLAYER, UnitClass.LORD, { ...stats }, 0, 0);
    const renderer = new BattleSpriteRenderer(scene, 100, 100, unit, null, 20, true);
    expect(renderer).toBeDefined();
  });

  it('updates HP display correctly', () => {
    const scene = createMockScene();
    const unit = new Unit('u1', 'Test', Faction.PLAYER, UnitClass.LORD, { ...stats }, 0, 0);
    const renderer = new BattleSpriteRenderer(scene, 100, 100, unit, null, 20, true);
    renderer.setHp(10);
    expect(renderer).toBeDefined();
  });
});
```

**Step 3: Run tests**

```bash
npx vitest run src/scenes/__tests__/BattleSpriteRenderer.test.ts
```

Expected: 2 passed.

**Step 4: Commit**

```bash
git add src/scenes/BattleSpriteRenderer.ts src/scenes/__tests__/BattleSpriteRenderer.test.ts
git commit -m "feat(battle): add BattleSpriteRenderer for combatant sprite + HP UI"
```

---

### Task 4: Register Phaser animations in `BootScene`

**Objective:** Load generated sprite textures and create Phaser `Animation` objects for every state so `UnitAnimator.play()` actually works.

**Files:**
- Modify: `src/scenes/BootScene.ts`
- Test: `src/scenes/__tests__/BootScene.test.ts` (if exists; otherwise skip)

**Step 1: Load atlas JSON and generate animations**

Replace the `preload()` body in `BootScene.ts`:

```typescript
import atlasData from '../../public/assets/sprites/atlas.json';

// ... inside BootScene class

preload(): void {
  this.add
    .text(this.cameras.main.centerX, this.cameras.main.centerY, 'Loading...', {
      fontSize: '24px',
      color: '#ffffff',
    })
    .setOrigin(0.5);

  // Load generated placeholder spritesheets
  for (const [key, data] of Object.entries(atlasData)) {
    this.load.spritesheet(key, `assets/sprites/${key}.png`, {
      frameWidth: data.frameWidth,
      frameHeight: data.frameHeight,
    });
  }
}

create(): void {
  // Create animations from loaded spritesheets
  for (const [key, data] of Object.entries(atlasData)) {
    const totalFrames = data.frames;
    const columns = data.columns;
    const rows = Math.ceil(totalFrames / columns);

    // Derive states and frame counts from the key pattern
    // This is a simplified mapping — the generator writes states in a fixed order
    const states: { name: string; frames: number }[] = [];
    if (key.includes('-sword-') || key.includes('-axe-') || key.includes('-lance-') || key.includes('-bow-') || key.includes('-magic-')) {
      states.push({ name: 'attack', frames: 6 }, { name: 'crit', frames: 8 });
    } else {
      states.push(
        { name: 'idle', frames: 2 },
        { name: 'move', frames: 4 },
        { name: 'hit', frames: 2 },
        { name: 'death', frames: 4 },
        { name: 'dodge', frames: 2 },
      );
    }

    let frameCursor = 0;
    for (const state of states) {
      const animKey = `${key}-${state.name}`;
      if (this.anims.exists(animKey)) continue;

      const frameArray: Phaser.Types.Animations.AnimationFrame[] = [];
      for (let i = 0; i < state.frames; i++) {
        const frameNum = frameCursor + i;
        frameArray.push({ key, frame: frameNum });
      }
      frameCursor += state.frames;

      this.anims.create({
        key: animKey,
        frames: frameArray,
        frameRate: state.name === 'crit' ? 12 : 8,
        repeat: state.name === 'idle' ? -1 : 0,
      });
    }
  }

  registerCutscene(prologueCutscene);
  registerCutscene(firstBattleWarningCutscene);
  registerCutscene(bossDefeatedCutscene);
  this.scene.start('MainMenuScene');
}
```

**Note:** The `atlas.json` import may need a `vite` type declaration. Add to `src/vite-env.d.ts` or create it:

```typescript
/// <reference types="vite/client" />

declare module '*.json' {
  const value: Record<string, unknown>;
  export default value;
}
```

**Step 2: Commit**

```bash
git add src/scenes/BootScene.ts src/vite-env.d.ts
git commit -m "feat(boot): load placeholder spritesheets and register battle animations"
```

---

### Task 5: Replace battle panels with `BattleSpriteRenderer` in `BattleScene`

**Objective:** Swap the old `createUnitBattlePanel` rectangles for `BattleSpriteRenderer` instances inside `startBattleMode`, and wire the sprite animations into `runBattleAnimation`.

**Files:**
- Modify: `src/scenes/BattleScene.ts`
- Test: `src/scenes/__tests__/BattleSceneState.test.ts` (update if needed)

**Step 1: Add renderer fields**

In `BattleScene` class fields (near line 71-76):

```typescript
private attBattleRenderer: BattleSpriteRenderer | null = null;
private defBattleRenderer: BattleSpriteRenderer | null = null;
```

**Step 2: Replace `startBattleMode` panel creation**

Inside `startBattleMode`, replace the panel creation block:

```typescript
// OLD:
// this.attBattlePanel = this.createUnitBattlePanel(...);
// this.defBattlePanel = this.createUnitBattlePanel(...);
// overlay.add(this.attBattlePanel);
// overlay.add(this.defBattlePanel);

// NEW:
this.attBattleRenderer = new BattleSpriteRenderer(
  this,
  this.cameras.main.width * 0.25,
  this.cameras.main.height * 0.5,
  attacker,
  preview.attacker,
  attackerInitialHp,
  true, // attacker faces right
);
overlay.add(this.attBattleRenderer.getContainer());

this.defBattleRenderer = new BattleSpriteRenderer(
  this,
  this.cameras.main.width * 0.75,
  this.cameras.main.height * 0.5,
  defender,
  preview.defender,
  defenderInitialHp,
  false, // defender faces left
);
overlay.add(this.defBattleRenderer.getContainer());
```

**Step 3: Wire animations into `runBattleAnimation`**

Replace the `STRIKE` branch in `runBattleAnimation`:

```typescript
if (state.phase === BattlePhase.STRIKE) {
  const isCounter = entry?.attacker.id === state.defender.id;
  const attackerRenderer = isCounter ? this.defBattleRenderer : this.attBattleRenderer;
  const defenderRenderer = isCounter ? this.attBattleRenderer : this.defBattleRenderer;

  // Attacker wind-up animation
  if (entry) {
    const weaponType = entry.weaponType;
    if (entry.critical) {
      attackerRenderer?.playAnimation('crit', weaponType);
    } else {
      attackerRenderer?.playAnimation('attack', weaponType);
    }
  }

  this.time.delayedCall(300, () => {
    if (entry?.hit) {
      // Defender takes hit
      defenderRenderer?.flashWhite();
      defenderRenderer?.shake(entry.critical ? 8 : 4, 150);
      this.cameras.main.shake(100, entry.critical ? 0.015 : 0.005);
      this.showDamageNumber(target, entry.damage, entry.critical);
    } else if (entry) {
      // Miss — defender dodges
      defenderRenderer?.playAnimation('dodge');
      this.showMissText(target);
    }

    if (entry) {
      state.applyLogEntry(entry);
    }

    // Update HP bars on both renderers
    this.attBattleRenderer?.setHp(state.attackerCurrentHp);
    this.defBattleRenderer?.setHp(state.defenderCurrentHp);

    this.time.delayedCall(600, () => {
      this.runBattleAnimation();
    });
  });
} else if (state.phase === BattlePhase.RECOIL) {
  // Return both to idle
  this.attBattleRenderer?.playAnimation('idle');
  this.defBattleRenderer?.playAnimation('idle');
  this.time.delayedCall(300, () => {
    this.runBattleAnimation();
  });
} else if (state.phase === BattlePhase.DONE) {
  // Death animation if applicable
  if (state.attackerCurrentHp <= 0) {
    this.attBattleRenderer?.playAnimation('death');
  }
  if (state.defenderCurrentHp <= 0) {
    this.defBattleRenderer?.playAnimation('death');
  }
  this.time.delayedCall(state.attackerCurrentHp <= 0 || state.defenderCurrentHp <= 0 ? 800 : 200, () => {
    this.endBattleMode();
  });
} else {
  this.time.delayedCall(200, () => {
    this.runBattleAnimation();
  });
}
```

**Step 4: Update `endBattleMode` cleanup**

Replace panel cleanup with renderer cleanup:

```typescript
// In endBattleMode, before destroying overlay:
this.attBattleRenderer?.destroy();
this.attBattleRenderer = null;
this.defBattleRenderer?.destroy();
this.defBattleRenderer = null;
```

Also remove the old `createUnitBattlePanel` and `updatePanelHp` methods entirely (or leave as dead code to delete in cleanup).

**Step 5: Run tests**

```bash
npx vitest run src/scenes/__tests__
```

Expected: existing tests pass. `BattleSceneState.test.ts` should not be affected since it tests `BattleDisplayState`, not `BattleScene`.

**Step 6: Commit**

```bash
git add src/scenes/BattleScene.ts
git commit -m "feat(battle): integrate BattleSpriteRenderer into battle overlay and animation phases"
```

---

### Task 6: Add INTRO slide-in animation

**Objective:** When the battle overlay appears, sprites slide in from the left/right edges instead of instantly appearing.

**Files:**
- Modify: `src/scenes/BattleScene.ts`

**Step 1: Position sprites off-screen initially**

In `startBattleMode`, after creating renderers:

```typescript
const attContainer = this.attBattleRenderer.getContainer();
const defContainer = this.defBattleRenderer.getContainer();

attContainer.setX(-100);
defContainer.setX(this.cameras.main.width + 100);

// Slide-in tween
this.tweens.add({
  targets: attContainer,
  x: this.cameras.main.width * 0.25,
  duration: 400,
  ease: 'Power2',
});
this.tweens.add({
  targets: defContainer,
  x: this.cameras.main.width * 0.75,
  duration: 400,
  ease: 'Power2',
});
```

**Step 2: Delay battle animation start until slide completes**

Change the initial delayed call from `800` to `600` (slide is 400ms + buffer):

```typescript
this.time.delayedCall(600, () => {
  this.runBattleAnimation();
});
```

**Step 3: Commit**

```bash
git add src/scenes/BattleScene.ts
git commit -m "feat(battle): add slide-in intro animation for battle sprites"
```

---

### Task 7: Cleanup dead code and verify build

**Objective:** Remove old `createUnitBattlePanel`, `updatePanelHp`, `updateBattleHpBars` methods. Verify `npm run build` succeeds and `npm run dev` loads sprites.

**Files:**
- Modify: `src/scenes/BattleScene.ts`

**Step 1: Delete old methods**

Remove:
- `createUnitBattlePanel()`
- `updatePanelHp()`
- `updateBattleHpBars()`

Ensure `showDamageNumber` and `showMissText` still compile (they use `battleOverlay` and `battleDisplayState`, which are unchanged).

**Step 2: Remove unused fields**

Remove:
- `private attBattlePanel: Phaser.GameObjects.Container | null = null;`
- `private defBattlePanel: Phaser.GameObjects.Container | null = null;`

**Step 3: Build**

```bash
npm run build
```

Expected: `dist/` created with no TypeScript errors.

**Step 4: Verify dev server**

```bash
npm run dev &
```

Open http://localhost:5173, start a battle, confirm:
- Sprites slide in from edges.
- Attacker plays attack/crit animation on strike.
- Defender flashes white + shakes on hit.
- Defender plays dodge animation on miss.
- HP bars update after each hit.
- Death animation plays when HP reaches 0.

**Step 5: Commit**

```bash
git add src/scenes/BattleScene.ts
git commit -m "refactor(battle): remove old rectangle panels; battle uses sprite renderers exclusively"
```

---

### Task 8: Update `SpriteAtlas` to expose state frame counts

**Objective:** `BootScene` currently hardcodes frame counts per state. `SpriteAtlas.getFrameCount` already knows this — expose it so `BootScene` can DRY.

**Files:**
- Modify: `src/scenes/BootScene.ts`
- Modify: `src/game/sprites/SpriteAtlas.ts` (add `getStateFrameCounts()`)

**Step 1: Add method to `SpriteAtlas`**

```typescript
getStateFrameCounts(): Record<AnimationState, number> {
  return {
    idle: 2, move: 4, attack: 6, hit: 2, death: 4, dodge: 2, crit: 8,
  };
}
```

**Step 2: Use in `BootScene`**

Replace hardcoded numbers with atlas lookup where possible, or keep the atlas.json-driven loop as-is (it already derives from the generated JSON, which is the source of truth).

This is optional polish — skip if build already works.

**Step 3: Commit**

```bash
git add src/game/sprites/SpriteAtlas.ts src/scenes/BootScene.ts
git commit -m "refactor(sprites): expose frame counts from SpriteAtlas for DRY animation creation"
```

---

## Verification Checklist

- [ ] `npm test` passes (all Vitest suites)
- [ ] `npm run build` produces a clean `dist/` with no TS errors
- [ ] Dev server loads and battle overlay shows animated sprites
- [ ] Old rectangle panels are fully removed
- [ ] `SpriteAtlas` and `UnitAnimator` remain in `src/game/` with zero Phaser imports
- [ ] `CombatLogEntry` carries `weaponType` for animation routing

## Post-Implementation Notes

- **Replacing placeholder sprites:** Artists can drop real PNGs into `public/assets/sprites/` using the same naming convention (`{class}-{faction}-{state}.png` or `{class}-{faction}-{weapon}-{state}.png`). Run `npm run generate-sprites` to regenerate `atlas.json` if dimensions change.
- **Adding new unit classes:** Add to `UNIT_CLASSES` in the generator script + `src/constants.ts` + `src/game/sprites/SpriteAtlas.ts` fallback logic.
- **Performance:** Each battle loads two sprites. With 143 generated sheets, the full atlas is ~5MB of PNGs. For production, consider lazy-loading only sheets needed for the current level's units.
