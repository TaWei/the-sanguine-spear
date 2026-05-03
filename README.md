# The Sanguine Spear

A Fire Emblem–inspired tactical RPG built with **Phaser 3**, **TypeScript**, and **Vite**.

[Play locally →](http://localhost:5173) `npm run dev`

---

## Features

- **Grid-based tactical movement** — Dijkstra pathfinding with terrain cost weights
- **Turn-based phases** — Player → Enemy → Ally cycle with phase-specific AI
- **Fire Emblem GBA-style combat** — hit/avoid/crit formulas, 2RN true hit, weapon triangle
- **Weapon triangle** — Sword > Axe > Lance > Sword (advantage/disadvantage modifiers)
- **Terrain system** — movement costs, defense/avoid bonuses
- **Enemy AI** — target scoring, approach logic, sequential action execution
- **Unit classes** — Lord, Mercenary, Mage, Archer, Cavalry, Pegasus Knight, Soldier, Brigand
- **Visual effects** — screen shake, hit flash, death fade, movement tweens

---

## Tech Stack

| Tool | Version | Purpose |
|------|---------|---------|
| Phaser | 3.80 | Rendering, input, scenes |
| TypeScript | 5.4 | All source code |
| Vite | 5.2 | Dev server, bundler |
| Vitest | 4.1 | Unit test runner |
| ESLint | 10 | Linting (strict type-checked) |
| Prettier | 3 | Code formatting |

---

## Quick Start

```bash
cd ~/workspace/the-sanguine-spear
npm install
npm run dev        # http://localhost:5173
```

---

## Development

```bash
npm run dev              # Start dev server
npm run lint             # ESLint check (zero warnings)
npm run lint:fix         # Auto-fix ESLint issues
npm run format           # Prettier format
npm run format:check     # Prettier check
npm test                 # Run all tests (vitest)
npx vitest run <path>    # Single test file
npx vitest               # Watch mode
npx tsc --noEmit         # Type check
npm run build            # Production build → dist/
npm run preview          # Preview production build
```

---

## Architecture

```
src/
  game/                  ← PURE LOGIC. Zero Phaser imports. 100% testable.
    GameEngine.ts        # Facade composing all subsystems
    map/                 # Terrain, Grid, Cursor
    units/               # Unit, Stats, Growth
    movement/            # Dijkstra move range
    combat/              # Weapons, Formulas, CombatEngine, AttackRange
    state/               # UnitState FSM, TurnManager, ActionQueue
    ai/                  # Targeting, Commander
    index.ts             # Barrel exports
  scenes/                ← PHASER RENDERING. Thin shell.
    BattleScene.ts       # Renders grid, units, UI. Delegates to GameEngine.
    BootScene.ts
    MainMenuScene.ts
  entities/              # DEPRECATED. Unused prototype wrappers.
```

**Golden rule:** `src/game/` is pure logic. No Phaser imports allowed. `src/scenes/` handles all rendering.

---

## Implemented Systems

| System | Status |
|--------|--------|
| Grid, Terrain, Cursor | ✅ |
| Unit stats, classes, factions | ✅ |
| Movement (Dijkstra range) | ✅ |
| Turn phases (Player/Enemy/Ally) | ✅ |
| Weapon database + triangle | ✅ |
| Combat formulas (hit/avoid/crit/damage) | ✅ |
| 2RN true hit | ✅ |
| Combat engine with counterattacks | ✅ |
| Enemy AI targeting + movement | ✅ |
| Visual effects (shake, flash, fade) | ✅ |
| Unit tests (163 passing) | ✅ |
| ESLint + Prettier | ✅ |

---

## Roadmap

- [ ] Save/load system
- [ ] Action menu (attack / wait / items)
- [ ] Inventory and equippable weapons
- [ ] Ally phase AI
- [ ] Map objectives (seize, defend, rout)
- [ ] Animated spritesheets
- [ ] Audio (SFX, music)
- [ ] Story chapters and dialogue

---

## License

MIT
