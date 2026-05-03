# Phase 7: Cutscene System (Fire Emblem Style)

> **For Hermes:** Use `subagent-driven-development` skill to implement this plan task-by-task.

**Goal:** A Fire Emblem-style cutscene engine with dialog boxes, character portraits, typewriter text, and expression changes — fully TDD'd in `src/game/cutscene/` with a thin Phaser rendering shell.

**Architecture:** Pure logic in `src/game/cutscene/` (zero Phaser imports) handles the cutscene state machine — frame tracking, character stage management, command interpretation. `CutsceneScene.ts` is a thin Phaser layer that reads state from `CutscenePlayer` and renders portraits, dialog boxes, and typewriter text.

**Tech Stack:** TypeScript, Vitest, Phaser 3 (rendering only)

**Prerequisite:** Phase 6 complete.

---

## Fire Emblem Cutscene UX (Reference)

```
┌──────────────────────────────────────────────┐
│                                              │
│    ┌──────┐                    ┌──────┐      │  ← character portraits
│    │      │                    │      │      │     (dim/bright based on
│    │ Lyn  │     [bg image]     │Eliwd │      │      who's speaking)
│    │      │                    │      │      │
│    └──────┘                    └──────┘      │
│                                              │
│  ┌─ Rowan ────────────────────────────────┐  │
│  │ We must strike now, while they're...    │  │  ← dialog box (bottom)
│  │                                         │  │     name label top-left
│  └────────────────────────────────────▶────┘  │  ← blinking arrow = advance
└──────────────────────────────────────────────┘
```

Key behaviors:
1. **Dialog box** anchored bottom of screen — dark background, light text, character name in colored label
2. **Portraits** on left and right sides — speaking character bright, silent character dimmed
3. **Typewriter effect** — text appears letter-by-letter, ~30ms per character
4. **Click/space to advance** — if text still typing, instantly complete it; if complete, go to next frame
5. **Character enter/exit** — portraits fade in/out or slide in/out
6. **Expressions** — characters can change expression mid-cutscene (neutral, happy, sad, angry, surprised)

---

## Architecture

```
src/game/cutscene/          # PURE LOGIC — zero Phaser imports
  CutsceneTypes.ts          # Types: CutsceneCharacter, Expression, CutsceneCommand, CutsceneScript
  CutsceneCharacters.ts     # Character registry (name, portrait key, default expression)
  CutscenePlayer.ts         # State machine: frame index, stage roster, advance(), isComplete()
  CutsceneRegistry.ts       # Registry of named cutscene scripts
  index.ts                  # Barrel export
  __tests__/
    CutscenePlayer.test.ts  # Player state machine tests
    CutsceneRegistry.test.ts# Registry tests
    CutsceneCharacters.test.ts

src/scenes/
  CutsceneScene.ts          # PHASER RENDERING — thin shell, delegates to CutscenePlayer
```

### The Golden Rule (still applies)
**No file in `src/game/cutscene/` may import from `phaser`.** Everything in `cutscene/` is pure TypeScript testable with Vitest.

---

## Task Breakdown

### Task 7.1: Cutscene Types

**Objective:** Define all cutscene data types and enums — the contract for everything that follows.

**Files:**
- Create: `src/game/cutscene/CutsceneTypes.ts`

**Step 1: Write the types (no test needed for pure type definitions)**

```typescript
// src/game/cutscene/CutsceneTypes.ts

/** Supported character expressions */
export type Expression = 'neutral' | 'happy' | 'sad' | 'angry' | 'surprised';

/** Position of a character portrait on screen */
export type PortraitPosition = 'left' | 'right';

/** A character that can appear in cutscenes */
export interface CutsceneCharacter {
  id: string;          // unique identifier (e.g., 'rowan', 'elara')
  name: string;        // display name (e.g., 'Rowan')
  portraitKey: string; // asset key for the portrait sprite
}

/** Cutscene commands — each is one "frame" or action in the sequence */
export type CutsceneCommand =
  | {
      type: 'speak';
      speakerId: string;
      text: string;
      expression?: Expression; // override expression for this line
      choices?: { label: string; jumpToLabel: string }[];
      label?: string;           // label for goto-jump targeting
    }
  | {
      type: 'enter';
      characterId: string;
      position: PortraitPosition;
      expression?: Expression;
    }
  | {
      type: 'exit';
      characterId: string;
    }
  | {
      type: 'expression';
      characterId: string;
      expression: Expression;
    }
  | {
      type: 'background';
      backgroundKey: string; // asset key for background image
    }
  | {
      type: 'wait';
      duration: number; // milliseconds
    }
  | {
      type: 'goto';
      label: string; // jump to a labeled frame
    }
  | {
      type: 'end';
    };

/** A cutscene script — ordered sequence of commands */
export interface CutsceneScript {
  id: string;
  title: string;
  frames: CutsceneCommand[];
}
```

**Step 2: Create directory and commit**

```bash
mkdir -p src/game/cutscene/__tests__
cp /dev/null src/game/cutscene/CutsceneTypes.ts
# (write the file)
git add src/game/cutscene/
git commit -m "feat(cutscene): define CutsceneTypes — Expressions, Commands, Scripts"
```

---

### Task 7.2: Cutscene Character Registry

**Objective:** A lookup table mapping character IDs to their metadata (name, portrait key, default expression). Pure data — no logic.

**Files:**
- Create: `src/game/cutscene/CutsceneCharacters.ts`
- Create: `src/game/cutscene/__tests__/CutsceneCharacters.test.ts`

**Step 1: Write failing test**

```typescript
// src/game/cutscene/__tests__/CutsceneCharacters.test.ts
import { describe, it, expect } from 'vitest';
import { getCharacter, getAllCharacters, isCharacterDefined } from '../CutsceneCharacters';

describe('CutsceneCharacters', () => {
  it('returns a character by ID', () => {
    const char = getCharacter('rowan');
    expect(char).toBeDefined();
    expect(char!.id).toBe('rowan');
    expect(char!.name).toBe('Rowan');
    expect(char!.portraitKey).toBe('portrait_rowan');
  });

  it('returns undefined for unknown character', () => {
    expect(getCharacter('nonexistent')).toBeUndefined();
  });

  it('checks if a character is defined', () => {
    expect(isCharacterDefined('rowan')).toBe(true);
    expect(isCharacterDefined('nobody')).toBe(false);
  });

  it('returns all characters', () => {
    const all = getAllCharacters();
    expect(all.length).toBeGreaterThan(0);
    expect(all.some((c) => c.id === 'rowan')).toBe(true);
    expect(all.some((c) => c.id === 'elara')).toBe(true);
  });
});
```

**Step 2: Run to verify RED** — all fail (no module)

```bash
npx vitest run src/game/cutscene/__tests__/CutsceneCharacters.test.ts
```

**Step 3: Write minimal implementation**

```typescript
// src/game/cutscene/CutsceneCharacters.ts
import type { CutsceneCharacter } from './CutsceneTypes';

/** Master character registry — all characters available for cutscenes */
const CHARACTER_DB: Record<string, CutsceneCharacter> = {
  rowan: {
    id: 'rowan',
    name: 'Rowan',
    portraitKey: 'portrait_rowan',
  },
  elara: {
    id: 'elara',
    name: 'Elara',
    portraitKey: 'portrait_elara',
  },
  bandit: {
    id: 'bandit',
    name: 'Bandit',
    portraitKey: 'portrait_bandit',
  },
  soldier: {
    id: 'soldier',
    name: 'Soldier',
    portraitKey: 'portrait_soldier',
  },
};

export function getCharacter(id: string): CutsceneCharacter | undefined {
  return CHARACTER_DB[id];
}

export function isCharacterDefined(id: string): boolean {
  return id in CHARACTER_DB;
}

export function getAllCharacters(): CutsceneCharacter[] {
  return Object.values(CHARACTER_DB);
}
```

**Step 4: Run to verify GREEN**

```bash
npx vitest run src/game/cutscene/__tests__/CutsceneCharacters.test.ts
```

**Step 5: Commit**

```bash
git add src/game/cutscene/CutsceneCharacters.ts src/game/cutscene/__tests__/CutsceneCharacters.test.ts
git commit -m "feat(cutscene): add character registry — getCharacter, getAllCharacters, isCharacterDefined"
```

---

### Task 7.3: CutscenePlayer State Machine

**Objective:** The core state machine that tracks current frame, which characters are on stage, their positions/expressions, and handles command execution. This is the heart of the cutscene system.

**Files:**
- Create: `src/game/cutscene/CutscenePlayer.ts`
- Create: `src/game/cutscene/__tests__/CutscenePlayer.test.ts`

**Step 1: Write failing tests**

```typescript
// src/game/cutscene/__tests__/CutscenePlayer.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { CutscenePlayer, createCutscenePlayer } from '../CutscenePlayer';
import type { CutsceneCommand } from '../CutsceneTypes';

function makeScript(frames: CutsceneCommand[]) {
  return { id: 'test', title: 'Test', frames };
}

function speakFrame(speakerId: string, text: string) {
  return { type: 'speak' as const, speakerId, text };
}

function enterFrame(characterId: string, position: 'left' | 'right') {
  return { type: 'enter' as const, characterId, position };
}

function endFrame() {
  return { type: 'end' as const };
}

describe('CutscenePlayer', () => {
  let player: CutscenePlayer;

  describe('basic lifecycle', () => {
    beforeEach(() => {
      const script = makeScript([
        speakFrame('rowan', 'Hello, Elara.'),
        speakFrame('elara', 'Rowan! You made it.'),
        endFrame(),
      ]);
      player = createCutscenePlayer(script);
    });

    it('starts at frame 0 with isComplete=false', () => {
      expect(player.isComplete()).toBe(false);
      expect(player.getCurrentFrame()).toEqual(speakFrame('rowan', 'Hello, Elara.'));
    });

    it('advances through frames', () => {
      player.advance();
      expect(player.getCurrentFrame()).toEqual(speakFrame('elara', 'Rowan! You made it.'));

      player.advance();
      expect(player.isComplete()).toBe(true);
    });

    it('returns null for current frame when complete', () => {
      player.advance();
      player.advance();
      expect(player.getCurrentFrame()).toBeNull();
    });

    it('advance is a no-op when already complete', () => {
      player.advance();
      player.advance();
      player.advance(); // extra advance past end
      expect(player.isComplete()).toBe(true);
    });

    it('returns frame index', () => {
      expect(player.getFrameIndex()).toBe(0);
      player.advance();
      expect(player.getFrameIndex()).toBe(1);
    });

    it('returns total frame count', () => {
      expect(player.getFrameCount()).toBe(3);
    });
  });

  describe('stage management — enter/exit', () => {
    beforeEach(() => {
      const script = makeScript([
        enterFrame('rowan', 'left'),
        enterFrame('elara', 'right'),
        speakFrame('rowan', 'On my mark.'),
        { type: 'exit', characterId: 'elara' },
        endFrame(),
      ]);
      player = createCutscenePlayer(script);
    });

    it('tracks characters on stage after enter commands', () => {
      // The player needs to process the command as it advances.
      // After first advance (entering rowan), rowan should be on stage.
      player.advance(); // enter rowan
      const stage = player.getStage();
      expect(stage.get('rowan')).toEqual({ position: 'left', expression: 'neutral' });
    });

    it('removes character from stage on exit', () => {
      player.advance(); // enter rowan
      player.advance(); // enter elara
      player.advance(); // speak
      player.advance(); // exit elara
      const stage = player.getStage();
      expect(stage.has('elara')).toBe(false);
      expect(stage.has('rowan')).toBe(true);
    });
  });

  describe('expressions', () => {
    it('sets expression from enter command', () => {
      const script = makeScript([
        { type: 'enter', characterId: 'rowan', position: 'left', expression: 'happy' },
        endFrame(),
      ]);
      const p = createCutscenePlayer(script);
      p.advance();
      expect(p.getStage().get('rowan')!.expression).toBe('happy');
    });

    it('changes expression mid-cutscene', () => {
      const script = makeScript([
        enterFrame('rowan', 'left'),
        { type: 'expression', characterId: 'rowan', expression: 'angry' },
        endFrame(),
      ]);
      const p = createCutscenePlayer(script);
      p.advance(); // enter
      p.advance(); // expression change
      expect(p.getStage().get('rowan')!.expression).toBe('angry');
    });
  });

  describe('speak command', () => {
    it('exposes speaker ID from current speak frame', () => {
      const script = makeScript([
        speakFrame('rowan', 'Attack!'),
        endFrame(),
      ]);
      const p = createCutscenePlayer(script);
      expect(p.getCurrentSpeakerId()).toBe('rowan');
    });

    it('returns null for speaker when current frame is not speak', () => {
      const script = makeScript([
        { type: 'background', backgroundKey: 'castle' },
        endFrame(),
      ]);
      const p = createCutscenePlayer(script);
      expect(p.getCurrentSpeakerId()).toBeNull();
    });
  });

  describe('goto command', () => {
    it('jumps to a labeled frame', () => {
      const script = makeScript([
        speakFrame('rowan', 'line 1'),
        { type: 'goto', label: 'later' },
        speakFrame('rowan', 'this should be skipped'),
        { type: 'speak', speakerId: 'rowan', text: 'you found me', label: 'later' },
        endFrame(),
      ]);
      const p = createCutscenePlayer(script);
      p.advance(); // speak line 1
      p.advance(); // goto later — should jump
      const frame = p.getCurrentFrame();
      expect(frame).toMatchObject({ type: 'speak', text: 'you found me' });
    });
  });

  describe('background tracking', () => {
    it('tracks current background', () => {
      const script = makeScript([
        { type: 'background', backgroundKey: 'castle' },
        speakFrame('rowan', 'nice castle'),
        { type: 'background', backgroundKey: 'field' },
        endFrame(),
      ]);
      const p = createCutscenePlayer(script);
      expect(p.getCurrentBackground()).toBeNull();
      p.advance(); // background set
      expect(p.getCurrentBackground()).toBe('castle');
      p.advance(); // speak
      p.advance(); // background change
      expect(p.getCurrentBackground()).toBe('field');
    });
  });

  describe('wait command', () => {
    it('exposes wait duration', () => {
      const script = makeScript([
        { type: 'wait', duration: 1500 },
        speakFrame('rowan', 'after pause'),
        endFrame(),
      ]);
      const p = createCutscenePlayer(script);
      // wait doesn't auto-advance — the scene handles the timer
      // just verify the frame type is accessible
      const frame = p.getCurrentFrame();
      expect(frame).toMatchObject({ type: 'wait', duration: 1500 });
    });
  });
});
```

**Step 2: Run to verify RED** — all fail

```bash
npx vitest run src/game/cutscene/__tests__/CutscenePlayer.test.ts
```

**Step 3: Write minimal implementation**

```typescript
// src/game/cutscene/CutscenePlayer.ts
import type { CutsceneScript, CutsceneCommand, PortraitPosition, Expression } from './CutsceneTypes';

export interface StageEntry {
  position: PortraitPosition;
  expression: Expression;
}

export interface CutscenePlayer {
  advance(): void;
  getCurrentFrame(): CutsceneCommand | null;
  getFrameIndex(): number;
  getFrameCount(): number;
  isComplete(): boolean;
  getStage(): ReadonlyMap<string, StageEntry>;
  getCurrentSpeakerId(): string | null;
  getCurrentBackground(): string | null;
}

export function createCutscenePlayer(script: CutsceneScript): CutscenePlayer {
  let frameIndex = 0;
  const stage = new Map<string, StageEntry>();
  let currentBackground: string | null = null;

  function applyCommand(cmd: CutsceneCommand): void {
    switch (cmd.type) {
      case 'enter':
        stage.set(cmd.characterId, {
          position: cmd.position,
          expression: cmd.expression ?? 'neutral',
        });
        break;
      case 'exit':
        stage.delete(cmd.characterId);
        break;
      case 'expression': {
        const entry = stage.get(cmd.characterId);
        if (entry) {
          entry.expression = cmd.expression;
        }
        break;
      }
      case 'background':
        currentBackground = cmd.backgroundKey;
        break;
      case 'goto': {
        // Find the labeled frame and jump to it
        const targetIndex = script.frames.findIndex((f) => f.label === cmd.label);
        if (targetIndex !== -1) {
          frameIndex = targetIndex;
        }
        break;
      }
      case 'end':
        // Nothing extra to apply; isComplete checks for this
        break;
      case 'speak':
      case 'wait':
        // No side effects on state; handled by rendering layer
        break;
    }
  }

  function getCurrentFrame(): CutsceneCommand | null {
    if (frameIndex >= script.frames.length) return null;
    return script.frames[frameIndex];
  }

  function advance(): void {
    const current = getCurrentFrame();
    if (current === null) return; // already complete

    // Check for goto — if current frame is goto, we already handled it
    // when it was reached. We need to handle goto on the advance FROM it.
    // Actually: apply command on advance means we process the current
    // frame's side effects, then move to next.
    // But for goto, the frame itself IS the jump — apply it NOW.

    applyCommand(current);

    // If the command was goto, frameIndex was already modified by applyCommand.
    // Otherwise, advance by one (unless it's end).
    if (current.type === 'end') {
      frameIndex = script.frames.length; // mark complete
      return;
    }

    if (current.type !== 'goto') {
      frameIndex++;
    }

    // After advancing, if we're past the end, mark complete
    if (frameIndex >= script.frames.length) {
      // nothing more — isComplete handles this
    }
  }

  return {
    advance,
    getCurrentFrame,
    getFrameIndex: () => frameIndex,
    getFrameCount: () => script.frames.length,
    isComplete: () => frameIndex >= script.frames.length,
    getStage: () => stage,
    getCurrentSpeakerId: () => {
      const frame = getCurrentFrame();
      return frame?.type === 'speak' ? frame.speakerId : null;
    },
    getCurrentBackground: () => currentBackground,
  };
}
```

**Step 4: Run to verify GREEN**

```bash
npx vitest run src/game/cutscene/__tests__/CutscenePlayer.test.ts
```

**Step 5: Commit**

```bash
git add src/game/cutscene/CutscenePlayer.ts src/game/cutscene/__tests__/CutscenePlayer.test.ts
git commit -m "feat(cutscene): add CutscenePlayer state machine — frame tracking, stage, expressions, goto"
```

---

### Task 7.4: Cutscene Registry

**Objective:** A registry mapping cutscene IDs to scripts — allows the game to trigger named cutscenes at specific moments (e.g., `playCutscene('prologue_intro')`).

**Files:**
- Create: `src/game/cutscene/CutsceneRegistry.ts`
- Create: `src/game/cutscene/__tests__/CutsceneRegistry.test.ts`

**Step 1: Write failing test**

```typescript
// src/game/cutscene/__tests__/CutsceneRegistry.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import {
  registerCutscene,
  getCutscene,
  hasCutscene,
  listCutscenes,
  clearCutscenes,
} from '../CutsceneRegistry';
import type { CutsceneScript } from '../CutsceneTypes';

function makeScript(id: string): CutsceneScript {
  return {
    id,
    title: `Cutscene: ${id}`,
    frames: [
      { type: 'speak', speakerId: 'rowan', text: 'Hello.' },
      { type: 'end' },
    ],
  };
}

describe('CutsceneRegistry', () => {
  beforeEach(() => {
    clearCutscenes();
  });

  it('registers and retrieves a cutscene by ID', () => {
    const script = makeScript('prologue');
    registerCutscene(script);
    expect(getCutscene('prologue')).toBe(script);
  });

  it('returns undefined for unregistered cutscene', () => {
    expect(getCutscene('nonexistent')).toBeUndefined();
  });

  it('checks if a cutscene exists', () => {
    expect(hasCutscene('prologue')).toBe(false);
    registerCutscene(makeScript('prologue'));
    expect(hasCutscene('prologue')).toBe(true);
  });

  it('lists all registered cutscene IDs', () => {
    registerCutscene(makeScript('a'));
    registerCutscene(makeScript('b'));
    const ids = listCutscenes();
    expect(ids).toContain('a');
    expect(ids).toContain('b');
    expect(ids).toHaveLength(2);
  });

  it('overwrites an existing cutscene', () => {
    const v1 = makeScript('prologue');
    const v2 = { ...makeScript('prologue'), title: 'Prologue v2' };
    registerCutscene(v1);
    registerCutscene(v2);
    expect(getCutscene('prologue')!.title).toBe('Prologue v2');
  });
});
```

**Step 2: Run to verify RED**

```bash
npx vitest run src/game/cutscene/__tests__/CutsceneRegistry.test.ts
```

**Step 3: Write minimal implementation**

```typescript
// src/game/cutscene/CutsceneRegistry.ts
import type { CutsceneScript } from './CutsceneTypes';

const registry = new Map<string, CutsceneScript>();

export function registerCutscene(script: CutsceneScript): void {
  registry.set(script.id, script);
}

export function getCutscene(id: string): CutsceneScript | undefined {
  return registry.get(id);
}

export function hasCutscene(id: string): boolean {
  return registry.has(id);
}

export function listCutscenes(): string[] {
  return Array.from(registry.keys());
}

export function clearCutscenes(): void {
  registry.clear();
}
```

**Step 4: Run to verify GREEN**

```bash
npx vitest run src/game/cutscene/__tests__/CutsceneRegistry.test.ts
```

**Step 5: Commit**

```bash
git add src/game/cutscene/CutsceneRegistry.ts src/game/cutscene/__tests__/CutsceneRegistry.test.ts
git commit -m "feat(cutscene): add CutsceneRegistry — register, get, has, list, clear"
```

---

### Task 7.5: Example Cutscene Script + Barrel Export

**Objective:** Create a sample cutscene script using the system and wire up the barrel export. This proves the whole pure-logic stack works end-to-end.

**Files:**
- Create: `src/game/cutscene/examples.ts`
- Create: `src/game/cutscene/index.ts`

**Step 1: Write integration test**

```typescript
// src/game/cutscene/__tests__/CutscenePlayer.test.ts — add this describe block
describe('integration: full cutscene playthrough', () => {
  it('plays through a multi-character cutscene correctly', () => {
    const script: CutsceneScript = {
      id: 'prologue_intro',
      title: 'Prologue: The Sanguine Spear',
      frames: [
        { type: 'background', backgroundKey: 'throne_room' },
        { type: 'enter', characterId: 'rowan', position: 'left', expression: 'neutral' },
        { type: 'speak', speakerId: 'rowan', text: 'The bandits have taken the eastern fort.' },
        { type: 'enter', characterId: 'elara', position: 'right', expression: 'surprised' },
        { type: 'speak', speakerId: 'elara', text: 'What? When did this happen?' },
        { type: 'expression', characterId: 'rowan', expression: 'angry' },
        { type: 'speak', speakerId: 'rowan', text: 'Last night. We march at dawn.' },
        { type: 'end' },
      ],
    };

    const player = createCutscenePlayer(script);

    // Frame 0: background
    expect(player.getCurrentFrame()).toMatchObject({ type: 'background' });
    player.advance();

    // Frame 1: enter rowan
    expect(player.getCurrentFrame()).toMatchObject({ type: 'enter', characterId: 'rowan' });
    player.advance();

    // Frame 2: rowan speaks
    expect(player.getCurrentSpeakerId()).toBe('rowan');
    expect(player.getCurrentFrame()).toMatchObject({ type: 'speak', text: 'The bandits have taken the eastern fort.' });
    expect(player.getStage().get('rowan')!.expression).toBe('neutral');
    player.advance();

    // Frame 3: enter elara
    expect(player.getCurrentFrame()).toMatchObject({ type: 'enter', characterId: 'elara' });
    player.advance();

    // Frame 4: elara speaks
    expect(player.getCurrentSpeakerId()).toBe('elara');
    expect(player.getStage().get('elara')!.expression).toBe('surprised');
    player.advance();

    // Frame 5: rowan expression change
    expect(player.getCurrentFrame()).toMatchObject({ type: 'expression', characterId: 'rowan', expression: 'angry' });
    player.advance();

    // Frame 6: rowan speaks again (angry now)
    expect(player.getCurrentSpeakerId()).toBe('rowan');
    expect(player.getStage().get('rowan')!.expression).toBe('angry');
    player.advance();

    // Frame 7: end
    expect(player.isComplete()).toBe(true);
    expect(player.getCurrentBackground()).toBe('throne_room');
    expect(player.getStage().size).toBe(2); // both still on stage at end
  });
});
```

**Step 2: Run to verify GREEN (existing tests still pass, new integration test passes)**

```bash
npx vitest run src/game/cutscene/
```

**Step 3: Create barrel export and example script**

```typescript
// src/game/cutscene/index.ts
export type {
  Expression,
  PortraitPosition,
  CutsceneCharacter,
  CutsceneCommand,
  CutsceneScript,
} from './CutsceneTypes';

export { CutscenePlayer, createCutscenePlayer } from './CutscenePlayer';
export type { StageEntry } from './CutscenePlayer';

export {
  registerCutscene,
  getCutscene,
  hasCutscene,
  listCutscenes,
  clearCutscenes,
} from './CutsceneRegistry';

export { getCharacter, isCharacterDefined, getAllCharacters } from './CutsceneCharacters';

// Example cutscenes
export { prologueCutscene } from './examples';
```

```typescript
// src/game/cutscene/examples.ts
import type { CutsceneScript } from './CutsceneTypes';

export const prologueCutscene: CutsceneScript = {
  id: 'prologue_intro',
  title: 'Prologue: The Sanguine Spear',
  frames: [
    { type: 'background', backgroundKey: 'throne_room' },
    { type: 'enter', characterId: 'rowan', position: 'left', expression: 'neutral' },
    { type: 'speak', speakerId: 'rowan', text: 'The bandits have taken the eastern fort.' },
    { type: 'enter', characterId: 'elara', position: 'right', expression: 'surprised' },
    { type: 'speak', speakerId: 'elara', text: 'What? When did this happen?' },
    { type: 'expression', characterId: 'rowan', expression: 'angry' },
    { type: 'speak', speakerId: 'rowan', text: 'Last night. They struck while the garrison slept.' },
    { type: 'expression', characterId: 'elara', expression: 'sad' },
    { type: 'speak', speakerId: 'elara', text: 'How many casualties?' },
    {
      type: 'speak',
      speakerId: 'rowan',
      text: "We don't know yet. But we must act quickly — before they fortify their position.",
    },
    { type: 'expression', characterId: 'elara', expression: 'neutral' },
    { type: 'speak', speakerId: 'elara', text: 'Agreed. I will ready my tome. We march at dawn.' },
    { type: 'end' },
  ],
};
```

**Step 4: Run full suite**

```bash
npx vitest run src/game/cutscene/
```

**Step 5: Commit**

```bash
git add src/game/cutscene/index.ts src/game/cutscene/examples.ts
git add src/game/cutscene/__tests__/CutscenePlayer.test.ts
git commit -m "feat(cutscene): add barrel export, example prologue cutscene, integration test"
```

---

### Task 7.6: CutsceneScene — Phaser Rendering Shell

**Objective:** A Phaser scene that renders the cutscene: dialog box with text typewriter, character portraits (dim/bright based on speaker), background image. Pure rendering — all state comes from `CutscenePlayer`.

**Files:**
- Create: `src/scenes/CutsceneScene.ts`
- Modify: `src/main.ts` (register the scene)

**Design:**

The scene has these visual layers:

```
Layer 4: Dialog box (bottom 25% of screen)
  - Dark background rectangle
  - Name label (top-left of dialog box, colored background)
  - Text area (BitMapText or Text with typewriter)
  - Blinking advance indicator (small triangle, bottom-right)

Layer 3: Overlay (dim silent portraits)

Layer 2: Portraits (left and right)
  - Speaking character: full brightness, slight scale-up
  - Silent character: dimmed (alpha 0.5), normal scale

Layer 1: Background image (full screen)
```

**Typewriter logic:**
- Start rendering text character-by-character at ~30ms/char
- Click/space during typing → instantly show all text
- Click/space when text complete → advance to next frame
- Wait frames → auto-advance after duration (or skip on click)

**Implementation:**

```typescript
// src/scenes/CutsceneScene.ts
import Phaser from 'phaser';
import {
  CutscenePlayer,
  createCutscenePlayer,
  getCutscene,
  getCharacter,
} from '../game/cutscene';
import type { CutsceneScript, CutsceneCommand, StageEntry, Expression } from '../game/cutscene';

const GAME_WIDTH = 1024;
const GAME_HEIGHT = 768;

// Layout constants
const DIALOG_BOX_HEIGHT = 180;
const DIALOG_BOX_Y = GAME_HEIGHT - DIALOG_BOX_HEIGHT;
const DIALOG_PADDING = 20;
const NAME_LABEL_HEIGHT = 30;
const TYPEWRITER_SPEED = 25; // ms per character
const PORTRAIT_WIDTH = 160;
const PORTRAIT_Y = GAME_HEIGHT - DIALOG_BOX_HEIGHT - 20; // above dialog box
const PORTRAIT_LEFT_X = 80;
const PORTRAIT_RIGHT_X = GAME_WIDTH - 80;

// Colors (Fire Emblem GBA-inspired)
const DIALOG_BG_COLOR = 0x1a1a2e;
const DIALOG_BORDER_COLOR = 0x4a4a6e;
const NAME_BG_COLOR = 0x2c3e50;
const TEXT_COLOR = '#ecf0f1';
const DIM_ALPHA = 0.4;

// Expression-based tint/offset for future use
const EXPRESSION_TINTS: Record<string, number> = {
  neutral: 0xffffff,
  happy: 0xffffcc,
  sad: 0xaaaacc,
  angry: 0xffaaaa,
  surprised: 0xffffff,
};

export class CutsceneScene extends Phaser.Scene {
  private player!: CutscenePlayer;
  private cutsceneId!: string;
  private onComplete!: () => void;

  // Visual elements
  private background!: Phaser.GameObjects.Rectangle;
  private dialogBox!: Phaser.GameObjects.Rectangle;
  private nameLabel!: Phaser.GameObjects.Container;
  private nameText!: Phaser.GameObjects.Text;
  private dialogText!: Phaser.GameObjects.Text;
  private advanceIndicator!: Phaser.GameObjects.Text;
  private portraits = new Map<string, Phaser.GameObjects.Container>();

  // Typewriter state
  private fullText = '';
  private displayedLength = 0;
  private typewriterTimer: Phaser.Time.TimerEvent | null = null;
  private isTyping = false;
  private waitingForInput = false;
  private waitTimer: Phaser.Time.TimerEvent | null = null;

  constructor() {
    super({ key: 'CutsceneScene' });
  }

  init(data: { cutsceneId: string; onComplete?: () => void }): void {
    this.cutsceneId = data.cutsceneId;
    this.onComplete = data.onComplete ?? (() => {});
  }

  create(): void {
    this.cameras.main.fadeIn(300, 0, 0, 0);

    const script = getCutscene(this.cutsceneId);
    if (!script) {
      console.error(`Cutscene not found: ${this.cutsceneId}`);
      this.finishCutscene();
      return;
    }

    this.player = createCutscenePlayer(script);

    this.createBackground();
    this.createDialogBox();
    this.setupInput();
    this.processCurrentFrame();
  }

  private createBackground(): void {
    // Placeholder background (black/dark) — will be replaced with bg image
    this.background = this.add.rectangle(
      GAME_WIDTH / 2, GAME_HEIGHT / 2,
      GAME_WIDTH, GAME_HEIGHT,
      0x0a0a1a,
    ).setDepth(0);
  }

  private createDialogBox(): void {
    // Dialog box background
    this.dialogBox = this.add.rectangle(
      GAME_WIDTH / 2,
      DIALOG_BOX_Y + DIALOG_BOX_HEIGHT / 2,
      GAME_WIDTH - 40,
      DIALOG_BOX_HEIGHT,
      DIALOG_BG_COLOR,
    ).setDepth(10).setStrokeStyle(2, DIALOG_BORDER_COLOR);

    // Name label container (positioned at top-left of dialog box)
    const nameBg = this.add.rectangle(0, 0, 120, NAME_LABEL_HEIGHT, NAME_BG_COLOR)
      .setStrokeStyle(1, DIALOG_BORDER_COLOR);
    this.nameText = this.add.text(6, 4, '', {
      fontSize: '16px',
      color: '#ecf0f1',
      fontStyle: 'bold',
    });
    this.nameLabel = this.add.container(
      DIALOG_PADDING,
      DIALOG_BOX_Y - NAME_LABEL_HEIGHT / 2,
      [nameBg, this.nameText],
    ).setDepth(11).setVisible(false);

    // Dialog text
    this.dialogText = this.add.text(
      DIALOG_PADDING + 10,
      DIALOG_BOX_Y + DIALOG_PADDING,
      '',
      {
        fontSize: '18px',
        color: TEXT_COLOR,
        wordWrap: { width: GAME_WIDTH - 60 },
        lineSpacing: 6,
      },
    ).setDepth(11);

    // Advance indicator (blinking triangle) — bottom right of dialog box
    this.advanceIndicator = this.add.text(
      GAME_WIDTH - 60,
      DIALOG_BOX_Y + DIALOG_BOX_HEIGHT - 30,
      '▶',
      { fontSize: '16px', color: '#f1c40f' },
    ).setDepth(11).setVisible(false);

    // Blink the advance indicator
    this.tweens.add({
      targets: this.advanceIndicator,
      alpha: 0.3,
      duration: 500,
      yoyo: true,
      repeat: -1,
    });
  }

  private setupInput(): void {
    this.input.keyboard!.on('keydown-SPACE', () => this.handleAdvance());
    this.input.keyboard!.on('keydown-ENTER', () => this.handleAdvance());
    this.input.on('pointerdown', () => this.handleAdvance());
  }

  private handleAdvance(): void {
    if (this.player.isComplete()) {
      this.finishCutscene();
      return;
    }

    const frame = this.player.getCurrentFrame();
    if (!frame) return;

    // If wait frame: skip waiting
    if (frame.type === 'wait' && this.waitTimer) {
      this.waitTimer.destroy();
      this.waitTimer = null;
      this.player.advance();
      this.processCurrentFrame();
      return;
    }

    // If currently typing: complete the text instantly
    if (this.isTyping) {
      this.completeText();
      return;
    }

    // If waiting for input: advance
    if (this.waitingForInput) {
      this.player.advance();
      this.processCurrentFrame();
    }
  }

  private processCurrentFrame(): void {
    const frame = this.player.getCurrentFrame();
    if (!frame || frame.type === 'end') {
      this.finishCutscene();
      return;
    }

    this.waitingForInput = false;
    this.advanceIndicator.setVisible(false);

    switch (frame.type) {
      case 'speak':
        this.handleSpeak(frame);
        break;
      case 'enter':
        this.handleEnter(frame);
        this.player.advance();
        this.processCurrentFrame();
        break;
      case 'exit':
        this.handleExit(frame);
        this.player.advance();
        this.processCurrentFrame();
        break;
      case 'expression':
        this.handleExpression(frame);
        this.player.advance();
        this.processCurrentFrame();
        break;
      case 'background':
        this.handleBackground(frame);
        this.player.advance();
        this.processCurrentFrame();
        break;
      case 'wait':
        this.handleWait(frame);
        break;
      case 'goto':
        // goto is handled automatically by CutscenePlayer
        this.player.advance();
        this.processCurrentFrame();
        break;
    }
  }

  private handleSpeak(frame: { speakerId: string; text: string }): void {
    const char = getCharacter(frame.speakerId);
    const name = char?.name ?? frame.speakerId;

    // Show name label
    this.nameText.setText(name);
    this.nameLabel.setVisible(true);

    // Update portrait brightness
    this.updatePortraitBrightness(frame.speakerId);

    // Start typewriter
    this.fullText = frame.text;
    this.displayedLength = 0;
    this.isTyping = true;
    this.startTypewriter();
  }

  private startTypewriter(): void {
    if (this.typewriterTimer) this.typewriterTimer.destroy();

    this.typewriterTimer = this.time.addEvent({
      delay: TYPEWRITER_SPEED,
      callback: () => {
        this.displayedLength++;
        this.dialogText.setText(this.fullText.slice(0, this.displayedLength));
        if (this.displayedLength >= this.fullText.length) {
          this.completeText();
        }
      },
      repeat: this.fullText.length - 1,
    });
  }

  private completeText(): void {
    if (this.typewriterTimer) {
      this.typewriterTimer.destroy();
      this.typewriterTimer = null;
    }
    this.displayedLength = this.fullText.length;
    this.dialogText.setText(this.fullText);
    this.isTyping = false;
    this.waitingForInput = true;
    this.advanceIndicator.setVisible(true);
  }

  private handleEnter(frame: { characterId: string; position: string; expression?: string }): void {
    const char = getCharacter(frame.characterId);
    if (!char) return;

    const xPos = frame.position === 'left' ? PORTRAIT_LEFT_X : PORTRAIT_RIGHT_X;

    // Placeholder portrait (colored rectangle with name) — replace with sprite when assets exist
    const portraitWidth = 140;
    const portraitHeight = 160;
    const bg = this.add.rectangle(0, 0, portraitWidth, portraitHeight, 0x34495e)
      .setStrokeStyle(2, 0x5a6a7e);

    const label = this.add.text(0, portraitHeight / 2 + 16, char.name.slice(0, 6), {
      fontSize: '14px',
      color: '#ecf0f1',
      stroke: '#000000',
      strokeThickness: 2,
      fontStyle: 'bold',
    }).setOrigin(0.5);

    const container = this.add.container(xPos, PORTRAIT_Y, [bg, label])
      .setDepth(5)
      .setAlpha(0);

    this.portraits.set(frame.characterId, container);

    // Fade in
    this.tweens.add({
      targets: container,
      alpha: 1,
      duration: 300,
      ease: 'Power2',
    });
  }

  private handleExit(frame: { characterId: string }): void {
    const container = this.portraits.get(frame.characterId);
    if (container) {
      this.tweens.add({
        targets: container,
        alpha: 0,
        duration: 300,
        onComplete: () => {
          container.destroy();
          this.portraits.delete(frame.characterId);
        },
      });
    }
  }

  private handleExpression(frame: { characterId: string; expression: string }): void {
    const container = this.portraits.get(frame.characterId);
    if (container) {
      // Brief flash to indicate expression change
      this.tweens.add({
        targets: container,
        scaleX: 1.05,
        scaleY: 1.05,
        duration: 100,
        yoyo: true,
      });
    }
  }

  private handleBackground(frame: { backgroundKey: string }): void {
    // Placeholder: change background color based on key
    const bgColors: Record<string, number> = {
      throne_room: 0x2c1810,
      castle: 0x1a2a1a,
      field: 0x2a3a1a,
      forest: 0x0a1a0a,
      default: 0x0a0a1a,
    };
    this.background.setFillStyle(bgColors[frame.backgroundKey] ?? bgColors.default);
  }

  private handleWait(frame: { duration: number }): void {
    this.waitTimer = this.time.delayedCall(frame.duration, () => {
      this.waitTimer = null;
      this.player.advance();
      this.processCurrentFrame();
    });
    // Click/space will skip via handleAdvance
  }

  private updatePortraitBrightness(speakerId: string): void {
    for (const [id, container] of this.portraits) {
      if (id === speakerId) {
        container.setAlpha(1);
        // Slight scale-up for speaker
        this.tweens.add({
          targets: container,
          scaleX: 1.05,
          scaleY: 1.05,
          duration: 150,
        });
      } else {
        container.setAlpha(DIM_ALPHA);
        container.setScale(1);
      }
    }
  }

  private finishCutscene(): void {
    this.cameras.main.fadeOut(300, 0, 0, 0, (_camera: unknown, progress: number) => {
      if (progress === 1) {
        this.onComplete();
      }
    });
  }
}
```

**Step 1: Register scene in main.ts**

Modify `src/main.ts` to add `CutsceneScene` to the scene list:

```typescript
// src/main.ts — add to the scene array
import { CutsceneScene } from './scenes/CutsceneScene';

// In the Phaser.Game config:
scene: [BootScene, MainMenuScene, BattleScene, CutsceneScene],
```

**Step 2: Wire example usage in BattleScene (optional — for testing)**

Add a line in `BattleScene.create()` to test triggering a cutscene:

```typescript
// In BattleScene.create(), after spawnUnits():
this.time.delayedCall(500, () => {
  this.scene.launch('CutsceneScene', {
    cutsceneId: 'prologue_intro',
    onComplete: () => {
      this.scene.stop('CutsceneScene');
      this.scene.resume('BattleScene');
    },
  });
  this.scene.pause();
});
```

But first, the prologue cutscene must be registered:

```typescript
// src/scenes/BootScene.ts — add registration
import { registerCutscene, prologueCutscene } from '../game/cutscene';

// In create():
registerCutscene(prologueCutscene);
```

**Step 3: Manual visual verification**

```bash
npm run dev
# Open http://localhost:5173
# Verify: cutscene plays with dialog box, typewriter, character names
# Click/space to advance through frames
```

**Step 4: Commit**

```bash
git add src/scenes/CutsceneScene.ts src/main.ts src/scenes/BootScene.ts src/scenes/BattleScene.ts
git commit -m "feat(cutscene): add CutsceneScene — Phaser rendering shell for Fire Emblem-style cutscenes"
```

---

### Task 7.7: Update Master Plan

**Objective:** Register Phase 7 in the master plan README.

**Files:**
- Modify: `docs/plans/README.md`

**Change:** Add Phase 7 row to the phase table:

```markdown
| 7 | [07-cutscene-system](./07-cutscene-system.md) | ⬜ | Fire Emblem dialog boxes, portraits, typewriter |
```

**Commit:**

```bash
git add docs/plans/README.md docs/plans/07-cutscene-system.md
git commit -m "docs: add Phase 7 cutscene system plan"
```

---

## Summary

| Task | What | Files | TDD? |
|------|------|-------|------|
| 7.1 | CutsceneTypes | 1 new | Types only — no test needed |
| 7.2 | CutsceneCharacters registry | 2 new | ✅ RED→GREEN |
| 7.3 | CutscenePlayer state machine | 2 new | ✅ RED→GREEN |
| 7.4 | CutsceneRegistry | 2 new | ✅ RED→GREEN |
| 7.5 | Example script + barrel export + integration test | 3 new | ✅ Extended test |
| 7.6 | CutsceneScene (Phaser rendering) | 1 new, 3 modify | Manual visual verify |
| 7.7 | Update master plan README | 1 modify | N/A |

**Total: 10 new files, 4 modified files, ~350 lines of pure game logic, ~250 lines of Phaser rendering**

---

## Future Enhancements (not in this phase)

- **Portrait sprite assets** — replace placeholder rectangles with actual character art
- **Background images** — replace solid colors with background art
- **Sound effects** — typewriter tick, character voice blips
- **Music control** — play/stop BGM during cutscenes
- **Choice dialogs** — player picks from options (branching narrative)
- **Cutscene editor** — visual tool to author cutscenes
- **Trigger system** — auto-trigger cutscenes on story events (map start, turn X, unit death, etc.)
