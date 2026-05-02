# Phase 0: Test Infrastructure

> **For Hermes:** Use `subagent-driven-development` skill to implement this plan task-by-task.

**Goal:** Establish Vitest as the test runner so all subsequent phases can use TDD.

**Architecture:** Vitest is Vite-native — it reads `vite.config.ts` and `tsconfig.json` automatically. No extra config needed beyond installing the package. Tests live colocated in `src/game/**/__tests__/*.test.ts`.

**Tech Stack:** Vitest, TypeScript

**Prerequisite:** None — this is the first phase.

---

### Task 0.1: Install Vitest

**Objective:** Add Vitest as a dev dependency and a `test` script.

**Files:**
- Modify: `package.json`

**Step 1: Install**

```bash
cd /root/workspace/the-sanguine-spear && npm install --save-dev vitest
```

**Step 2: Add test script**

Add to `package.json` scripts:

```json
"test": "vitest run",
"test:watch": "vitest"
```

**Step 3: Verify**

```bash
npm test
```

Expected: `No test files found` (or similar — no tests exist yet).

**Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add vitest for TDD"
```

---

### Task 0.2: Create first smoke test

**Objective:** Prove Vitest works with TypeScript by writing and running a trivial test.

**Files:**
- Create: `src/game/__tests__/smoke.test.ts`

**Step 1: Write the test**

```typescript
import { describe, it, expect } from 'vitest';

describe('smoke test', () => {
  it('proves the test runner works', () => {
    expect(1 + 1).toBe(2);
  });
});
```

**Step 2: Run — verify GREEN**

```bash
npx vitest run
```

Expected: 1 test passed.

**Step 3: Verify RED (prove the test catches failures)**

Temporarily change `toBe(2)` to `toBe(3)`, run, confirm failure, revert.

**Step 4: Commit**

```bash
git add src/game/__tests__/smoke.test.ts
git commit -m "test: add vitest smoke test"
```

---

### Task 0.3: Create the `src/game/` directory structure

**Objective:** Set up the empty directory tree for the hyper-modular game engine.

**Files:**
- Create: Placeholder `.gitkeep` files so directories are tracked

**Step 1: Create directories**

```bash
mkdir -p src/game/map/__tests__
mkdir -p src/game/units/__tests__
mkdir -p src/game/movement/__tests__
mkdir -p src/game/combat/__tests__
mkdir -p src/game/ai/__tests__
mkdir -p src/game/state/__tests__
```

**Step 2: Add .gitkeep files**

```bash
for dir in src/game/map src/game/units src/game/movement src/game/combat src/game/ai src/game/state; do
  touch "$dir/__tests__/.gitkeep"
done
```

**Step 3: Commit**

```bash
git add src/game/
git commit -m "chore: scaffold src/game/ directory structure"
```

---

## Verification Checklist

- [ ] `npm test` runs successfully (1 smoke test passes)
- [ ] `npm run test:watch` watches for file changes
- [ ] `src/game/` directory tree exists with all subdirectories
- [ ] Three commits on the branch (install, smoke test, directory scaffold)

---

## Next Phase

Proceed to [Phase 1: The Board](./01-the-board.md).
