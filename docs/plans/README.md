# The Sanguine Spear — Master Implementation Plan

> **For Hermes:** Use `subagent-driven-development` skill to implement each phase task-by-task. Each phase plan is a self-contained document in this directory.

**Goal:** A Fire Emblem-inspired tactical RPG with hyper-modular architecture and strict TDD.

**Architecture:** Pure game logic lives in `src/game/` — zero Phaser imports, fully unit-testable with Vitest. The Phaser layer in `src/scenes/` and `src/entities/` is a thin rendering shell that delegates all decisions to the game engine.

**Tech Stack:** TypeScript, Phaser 3, Vite, Vitest

---

## Architecture: The Separation

```
src/
  game/                  # PURE LOGIC — zero Phaser imports, 100% testable
    map/
      Grid.ts            # 2D grid: terrain lookup, unit placement, bounds
      Terrain.ts         # Terrain types, move costs, defense/avoid bonuses
    units/
      UnitState.ts       # Unit state machine (Idle → Moving → Menu → Exhausted)
      Stats.ts           # Stats engine: damage, hit rate, crit, 2RN true hit
      Growth.ts          # Level-up logic, growth rates, stat caps
    movement/
      Pathfinder.ts      # Dijkstra's algorithm for movement cost calculation
      MoveRange.ts       # Reachable tile calculation with terrain costs
    combat/
      Engine.ts          # Combat resolution: damage calc, counterattacks
      WeaponTriangle.ts  # Weapon triangle modifiers (Sword > Axe > Lance > Sword)
      Formulas.ts        # Hit rate, crit rate, double attack checks
    ai/
      Targeting.ts       # Target scoring: damage dealt, kill potential, safety
      Commander.ts       # Enemy phase orchestrator — orders units by priority
    state/
      TurnManager.ts     # Phase FSM: PlayerPhase ↔ EnemyPhase ↔ AllyPhase
      ActionQueue.ts     # Ordered action resolution during phases
  constants.ts           # Enums, config, grid sizing
  types.ts               # Interfaces — shared by game/ and scenes/
  scenes/                # PHASER — rendering only, delegates to game/
  entities/              # PHASER — visual sprites, no game logic
```

### The Golden Rule
**No file in `src/game/` may import from `phaser`. None.** Any violation is a design failure. If game logic needs a concept from Phaser (e.g., coordinates), we define our own type or use plain numbers.

### Test Infrastructure
- **Runner:** Vitest (Vite-native, fast, watches)
- **Location:** `src/game/**/__tests__/*.test.ts` (colocated with source)
- **Coverage:** Every function in `src/game/` must have a test written first (TDD)

---

## Phase Plans

| Phase | Document | Status | What It Builds |
|-------|----------|--------|----------------|
| 0 | [00-test-infrastructure.md](./00-test-infrastructure.md) | ⬜ | Vitest setup, CI test command |
| 1 | [01-the-board.md](./01-the-board.md) | ⬜ | Grid data structure, terrain system, cursor |
| 2 | [02-units-and-movement.md](./02-units-and-movement.md) | ⬜ | Unit spawning, Dijkstra pathfinding, move range |
| 3 | [03-game-loop.md](./03-game-loop.md) | ⬜ | Turn manager FSM, unit states, action menu |
| 4 | [04-combat-and-stats.md](./04-combat-and-stats.md) | ⬜ | Stats, combat formulas, weapon triangle, 2RN |
| 5 | [05-enemy-ai.md](./05-enemy-ai.md) | ⬜ | Aggro range, decision matrix, automated enemy phase |
| 6 | [06-polish-and-deployment.md](./06-polish-and-deployment.md) | ⬜ | Animations, juice, hosting |
| 7 | [07-cutscene-system.md](./07-cutscene-system.md) | ✅ | Fire Emblem dialog boxes, portraits, typewriter |
| 8 | [08-character-progression.md](./08-character-progression.md) | ⬜ | Leveling, EXP, growth rates, stat caps |
| 9 | [09-player-battle-mode.md](./09-player-battle-mode.md) | ⬜ | Fight menu, target selection, combat animation |
| 10 | [10-level-objectives.md](./10-level-objectives.md) | ✅ | Victory/defeat conditions, level completion |
| 11 | [11-promotion-system.md](./11-promotion-system.md) | ⬜ | Fire Emblem-style class promotion |

---

## Prerequisites

Before any phase work begins, complete Phase 0 (test infrastructure).

## Execution Order

Phases are sequential — each builds on the previous. Within each phase, tasks are numbered and must be completed in order (TDD: write test, watch it fail, implement, watch it pass, commit).

## Core Principles

1. **TDD always** — no production code without a failing test first
2. **Hyper-modular** — pure game logic never touches Phaser
3. **Bite-sized tasks** — each task is 2–5 minutes of focused work
4. **Frequent commits** — commit after every task passes
5. **YAGNI** — implement only what the current phase needs, nothing more
