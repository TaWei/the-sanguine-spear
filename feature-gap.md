# Feature Gap Analysis: The Sanguine Spear vs Fire Emblem GBA

**Project:** [the-sanguine-spear](https://github.com/example/the-sanguine-spear)  
**Engine:** Phaser 3 + TypeScript  
**Analysis Date:** 2026-05-10

---

## Overview

The Sanguine Spear implements the **core tactical engine** of Fire Emblem GBA exceptionally well — combat formulas, weapon triangle, terrain system, enemy AI, and progression mechanics are all well-developed. However, several key GBA-era systems remain unimplemented. This document catalogues them by priority.

> **Status of current implementation:** The game has working turn-based combat, Dijkstra pathfinding, unit classes, growth rates, promotions, staff healing, rescue mechanics, durability tracking, shop engine, save/load, and cutscene triggers. The foundation is solid; the gaps are primarily in game-flow systems, menu interfaces, and content.

---

## 🔴 Critical Gameplay Systems

### 1. Pair Up / Combination Attack
**Status:** Not implemented  
**Impact:** High

The codebase has `RescueRules` (rescue/drop/give/take) but no pairing system. In FE GBA:

- Two adjacent units can **Pair Up**, forming a lead/guard relationship
- The **Combination Attack** mechanic: when the lead unit attacks an enemy that is also adjacent to the guard partner, the guard contributes a follow-up strike
- Guard units provide **defensive bonuses** (take some damage intended for the lead)
- No `canPair()`, `getPairBonus()`, `getCombinationAttacker()`, or pair state tracking exists anywhere in the codebase

**References:** `src/game/units/RescueRules.ts` (exists but only handles rescue, not pair), `src/game/combat/Engine.ts`

---

### 2. Recruitment — Talk Command
**Status:** Not implemented  
**Impact:** High

No system for recruiting enemy or neutral units mid-battle. FE GBA features:

- **The "Talk" command** in the action menu — when a player unit stands adjacent to an enemy with a talk-to trigger, the player can choose "Talk" instead of "Fight"
- Talking triggers a cutscene and switches the target unit's faction to `Faction.PLAYER`
- The `CutsceneTrigger` system exists (`TriggerType.TALK` is referenced in `gameplayTriggers.ts` but not wired up to the battle menu)

**Missing:**
- `TriggerType.TALK` trigger condition
- "Talk" button in `showPostMoveMenu()` action menu
- Talk-to adjacency check via `canTalkTo(unit, target)` → `engine.canTalk(unit, target)`
- Faction switch logic in `GameEngine.resolveTalk()`

**References:** `src/game/cutscene/CutsceneTrigger.ts`, `src/game/cutscene/gameplayTriggers.ts`, `src/scenes/BattleScene.ts` (action menu)

---

### 3. Map Objectives — Seize / Defend / Escape
**Status:** Partial  
**Impact:** High

`LevelObjectives` only implements **Rout Victory** (defeat all enemies). Missing:

| Objective Type | Description | Status |
|---|---|---|
| **Seize** | Step onto a throne/target tile to instantly win the chapter | ❌ Not implemented |
| **Defend** | Keep a specific unit alive for N turns | ❌ Not implemented |
| **Escape** | Move designated unit(s) to an escape tile to end the chapter early | ❌ Not implemented |
| **Rout** | Defeat all enemies | ✅ Implemented |

**References:** `src/game/objectives/LevelObjectives.ts`, `src/game/levels/LevelDefinition.ts`

---

### 4. Ally Phase AI
**Status:** Not implemented  
**Impact:** High

The turn system cycles `Player → Enemy → Ally`, but:

- `TurnManager` advances through all three phases
- **Ally units have zero AI** — they never move, attack, or act after the player ends their turn
- `Commander.planEnemyTurn()` exists but there's no `planAllyTurn()` counterpart
- The README roadmap explicitly marks this as a TODO

**References:** `src/game/state/TurnManager.ts`, `src/game/ai/Commander.ts`, `README.md` roadmap

---

### 5. Fog of War
**Status:** Not implemented  
**Impact:** High

No visibility calculation — all tiles and enemy units are always visible regardless of unit position. Missing:

- **`VisibilityMap`** — computes per-unit sight range (affected by terrain, unit type, time of day in some FE titles)
- **`FogTileState`** — tracks which tiles are `VISIBLE`, `SEEN` (was visible, now dimmed), or `UNSEEN`
- Enemy units on unseen tiles should not show their stats in the attack preview
- Enemy move/threat range should not be visible in fog
- Camera panning should not reveal tiles outside sight range
- `isTileVisible(x, y, byUnit)` → returns boolean

**References:** `src/game/map/Grid.ts`, `src/game/map/Terrain.ts`

---

## 🟡 Menu & Interaction Systems

### 6. Shop Access
**Status:** Engine exists, no access point  
**Impact:** Medium

The `ShopEngine` and `ShopMenu` UI class are fully implemented and functional. However:

- **No shop exists on any level** — there's no terrain type, trigger, or menu option that opens the shop
- FE GBA shops are accessed via:
  - **Preparation screen** between chapters (prep shop)
  - **Villages/forts** on the map (visit the building to enter the shop)
  - **Secret shops** (hidden buildings that only appear on certain turns or after certain events)
- No `TileType.VILLAGE` or `TileType.SHOP` terrain
- No shop trigger in `CutsceneTrigger.condition.type`

**References:** `src/game/shop/ShopEngine.ts`, `src/game/ui/ShopMenu.ts`, `src/game/levels/LevelData.ts`

---

### 7. Preparation Screen
**Status:** Not implemented  
**Impact:** Medium

No pre-chapter setup screen. FE GBA prep screens allow:

- View and modify unit inventories (equip/unequip weapons)
- Adjust weapon rank focus per unit
- Spend gold at a prep shop
- Review the mission objective and enemy composition
- Swap unit positions
- Access the convoy

**Implementation would require:**
- `PrepScene.ts` — a new Phaser scene with unit management UI
- Integration with `SaveManager` to maintain a "current army" state between levels
- `Unit.equip(itemIndex)` and `Unit.unequip(itemIndex)` methods
- Referral to the World Map to select next chapter

**References:** `src/game/save/SaveManager.ts`, `src/scenes/BattleScene.ts`, `src/game/items/Inventory.ts`

---

### 8. Supply / Convoy System
**Status:** Partial  
**Impact:** Medium

Items can be traded between adjacent units via `TradeEngine`, but there is **no convoy**:

- The **convoy** is a shared item pool accessible by any unit during prep or via the "Supply" command
- FE GBA: the convoy is a separate inventory that any unit can withdraw from or deposit to (with a movement penalty for horseback units accessing it)
- No `ConvoyEngine`, no `withdrawFromConvoy()`, no `depositToConvoy()`
- No "Rescue → Convoy" functionality (drop a carried unit's items into the convoy)

**References:** `src/game/trade/TradeEngine.ts`, `src/game/items/Inventory.ts`, `src/game/units/RescueRules.ts`

---

### 9. Thief / Lockpick Item
**Status:** Partial  
**Impact:** Low

`DoorChestEngine` handles door/chest opening:

- `canOpenDoor()` and `canOpenChest()` — checks if a unit is adjacent and has a thief class
- However, it **always allows thieves** — no conditional check for whether the unit has a `Lockpick` item
- `ItemTypes.ts` has no `LockpickItem` type

**In FE GBA:**
- Thieves can open doors and chests by default
- Without a lockpick, they take extra time (or a menu option "Open with Tool" consumes a lockpick)
- Certain doors/chests require a key item rather than just being a thief

**References:** `src/game/map/DoorChestEngine.ts`, `src/game/items/ItemTypes.ts`

---

### 10. Give / Take / Drop UI for Rescue
**Status:** Logic exists, UI missing  
**Impact:** Low

`GameEngine` has full `giveUnit()`, `takeUnit()`, `drop()` logic. However:

- The **action menu** (`showPostMoveMenu()`) does not include Give/Take/Drop buttons
- Rescue is accessible through the trade menu, but there's no standalone "Rescue" action menu
- In FE GBA, the rescue menu has dedicated **Rescue**, **Drop**, **Give**, **Take** commands

**Missing from `BattleScene.ts`:** A dedicated rescue submenu or buttons in the post-move menu.

**References:** `src/game/GameEngine.ts` (`giveUnit`, `takeUnit`, `drop`), `src/game/units/RescueRules.ts`

---

## 🟡 Combat Features

### 11. Weapon Forging (Armory)
**Status:** Not implemented  
**Impact:** Medium

No weapon durability upgrade system. FE GBA has an armory where you:

- Spend gold to add +1 to might, hit, or durability of a weapon
- Each forge has a cost formula (e.g., `20g * current_mt` for a might upgrade)
- Weapons can be forged multiple times, improving them further

**Missing:**
- `ForgeEngine` class
- Forge UI in `PrepScene` or as a standalone shop
- Forge costs in `ItemPrices.ts`

**References:** `src/game/items/ItemPrices.ts`, `src/game/shop/ShopEngine.ts`

---

### 12. Secret Shop
**Status:** Not implemented  
**Impact:** Low

A hidden shop variant with different or discounted weapons, accessible via special map tiles or events. No:

- `TileType.SECRET_SHOP` terrain
- `ShopEngine.secretShop` variant
- Turn-based secret shop trigger

---

### 13. Ballista / Longbow / Special Weapon Modes
**Status:** Not implemented  
**Impact:** Medium

- **Ballistae** — stationary siege units on certain maps, operated by any unit, with 3-range effective attacks against all units. No `BallistaUnit`, no `BallistaEngine`.
- **Longbow** — a 3-range effective bow. Not in `Weapons.ts`.
- **Effective damage multiplier** — the codebase applies `effectiveAgainst` for damage bonus, but doesn't implement the full effective damage formula (x3 for flying vs bows in some FE titles).
- **Critical over 100%** — Brave weapons + crit rate can exceed 100%. The current combat engine doesn't handle this explicitly.

**References:** `src/game/combat/Effectiveness.ts`, `src/game/combat/Weapons.ts`, `src/game/combat/Engine.ts`

---

### 14. Counterattack Restriction
**Status:** Should verify  
**Impact:** Medium

In FE GBA, physical weapons (swords, axes, lances, bows) **cannot counterattack when attacked at range > 1**. Magic weapons can counter at any range they can attack.

The current combat engine should be checked in `src/game/combat/Engine.ts` to ensure:
- `canCounterattack(weapon, attackDistance)` enforces 1-range for non-magic weapons
- Bows always cannot counter (even at melee range, bows cannot counter in most FE GBA)

**References:** `src/game/combat/Engine.ts`

---

## 🟡 Support System

### 15. Support Rank System
**Status:** Not implemented  
**Impact:** High

No support system. FE GBA features:

- **Support ranks:** C, B, A (and sometimes S) between paired units
- **Support points** accumulate when units attack adjacent to each other, use staves near each other, or finish turns adjacent
- **Support bonuses** apply during combat: hit/avoid bonuses based on rank and weapon triangle
- No `SupportData`, no `SupportRank` tracking between unit pairs, no `grantSupportPoints()`

**Missing:**
- `SupportRank` enum
- `SupportData` map: `Map<unitPairId, { rank: SupportRank, points: number }>`
- `getSupportBonus(attacker, defender)` — returns hit/avoid modifiers
- Support point accumulation during combat (`applyCombatExp` or a separate `applySupportPoints`)
- Support level-up cutscene triggers

**References:** `src/game/combat/Formulas.ts` (no support modifier), `src/game/combat/Engine.ts` (no support in hit calculation)

---

### 16. Support Conversations
**Status:** Not implemented  
**Impact:** Low

No support conversation triggers or display. Support conversations unlock at support rank thresholds and provide story/dialogue.

**References:** `src/game/cutscene/CutsceneTrigger.ts`, `src/game/cutscene/CutsceneRegistry.ts`

---

## 🟡 Map Features

### 17. Turn-Based Reinforcements
**Status:** Not implemented  
**Impact:** Medium

All units are placed statically in `LevelDefinition.units`. Missing:

- **`ReinforcementGroup`** — defines a group of units that spawn on specific turn numbers
- **`ReinforcementTrigger`** — `{ turnNumber: number, groupId: string }`
- Reinforcement spawn logic in `GameEngine.loadLevel()` and `endTurn()`
- Turn counter check during phase transitions
- Reinforcements that appear during enemy phase should immediately act

**Example from FE GBA:** "On turn 4, 3 Brigands appear from the north edge. On turn 6, a Wyvern Knight appears from the east."

**References:** `src/game/levels/LevelDefinition.ts`, `src/game/GameEngine.ts`, `src/game/state/TurnManager.ts`

---

### 18. Village / Fort Tile Interaction
**Status:** Not implemented  
**Impact:** Medium

No village or fort terrain. FE GBA:

- **Village tiles** — when a player unit visits a village (steps on it), they receive gold, items, or a story event. Villages can only be visited once.
- **Fort tiles** — restore HP to full and provide defensive terrain bonuses
- No `TileType.VILLAGE` or `TileType.FORT` in `TerrainType`
- No `VillageEngine` or village visit trigger

**Missing:**
- `TerrainType.VILLAGE`, `TerrainType.FORT`
- `VillageVisitTrigger` in `CutsceneTrigger.condition`
- Village reward definitions in `LevelDefinition`

**References:** `src/game/map/Terrain.ts`, `src/game/levels/LevelDefinition.ts`

---

### 19. Door Break vs Open Distinction
**Status:** Partial  
**Impact:** Low

Currently all doors are "opened" via `openDoor()`. In FE GBA:

- **Regular doors** — can be opened by any unit adjacent to them
- **Locked doors** — require a key item or a thief
- **Breakable walls** — can be destroyed by attacking them (axe, hammer), not opened
- No distinction in `DoorChestEngine` between door types
- No `doorType` property on terrain

**References:** `src/game/map/DoorChestEngine.ts`, `src/game/map/Terrain.ts`

---

### 20. Throne / Gate Terrain
**Status:** Not implemented  
**Impact:** Medium

- **`Throne`** — the seize point for Seize-type objectives. No `TerrainType.THRONE`.
- **`Gate`** — opens automatically when the boss is defeated. No gate state management.
- No tile type for escape points.

**References:** `src/game/map/Terrain.ts`, `src/game/objectives/LevelObjectives.ts`

---

## 🟠 Progression & Story

### 21. World Map / Chapter Selection
**Status:** Not implemented  
**Impact:** High

- Only `getNextLevelId()` for linear progression
- No world map scene
- No chapter unlock tracking
- No "next unread chapter" detection

**Missing:**
- `WorldMapScene.ts` — Phaser scene with map nodes
- `ChapterStatus` enum: `LOCKED | AVAILABLE | CLEARED`
- `getAvailableChapters()` — filters based on cleared prerequisites
- `currentChapterProgress` in `SaveData`

**References:** `src/game/levels/LevelData.ts` (`getNextLevelId`), `src/scenes/MainMenuScene.ts`

---

### 22. Base Camp / Base Conversations
**Status:** Not implemented  
**Impact:** Low

No base camp between chapters. FE GBA:

- **Base camp** scene between chapters for character interactions
- **Base conversations** — story events triggered between chapters
- **Support conversations** available at base
- **Armory / shop access** at base
- No `BaseScene.ts` or base event queue

**References:** `src/game/cutscene/CutsceneQueue.ts` (could be repurposed)

---

### 23. Weapon Rank WExp Accumulation
**Status:** Partial (tracked but never awarded)  
**Impact:** Medium

`WeaponRank.ts` exists and tracks weapon experience per type. However:

- **WExp is never awarded during combat** — units don't accumulate toward higher weapon ranks
- FE GBA awards small WExp per attack landed (e.g., +1 WExp for hitting, +2 for killing)
- Higher rank gives bonus hit/crit when using that weapon type
- No `grantWeaponExp(attacker, weaponType, exp)` call in combat resolution
- No rank-up bonuses applied to hit/crit in `Formulas.ts`

**References:** `src/game/combat/WeaponRank.ts`, `src/game/combat/Formulas.ts`, `src/game/combat/Engine.ts`

---

### 24. Skip Enemy Phase (Special Objectives)
**Status:** Not implemented  
**Impact:** Low

No mechanism for battles where the enemy turn doesn't start (e.g., seize victory before the enemy phase, or defensive missions). Should be:

- `LevelDefinition.flags.skipEnemyPhase: boolean`
- Checked in `endTurn()` before calling `executeEnemyActions()`

**References:** `src/game/state/TurnManager.ts`, `src/game/levels/LevelDefinition.ts`

---

## 🟠 UI / Polish

### 25. Animated Sprite Sheets
**Status:** Not implemented  
**Impact:** Very High

- Units are colored rectangles with name labels
- No actual character portraits or sprites
- No attack/movement/death animations
- No terrain sprites (tiles are solid color fills)

**Would require:**
- Sprite atlas with unit sprites per class, per direction, per animation state
- `UnitSprite` class replacing the current `add.rectangle` containers in `syncUnitSprites()`
- Animation state machine: `IDLE → MOVING → ATTACKING → RE_COIL → DEAD`
- Terrain sprite renderer (not just solid-color rectangles)
- Attack animation sequences (swing, projectile, magic cast)

**References:** `src/scenes/BattleScene.ts` (`syncUnitSprites`), `src/game/map/Terrain.ts`

---

### 26. Audio System
**Status:** Not implemented  
**Impact:** High

Zero audio implementation. FE GBA has:

- **Combat SFX:** weapon swing, hit impact, critical hit, miss
- **Music:** battle theme, map theme, victory fanfare, defeat music
- **UI SFX:** menu open/close, confirm, cancel, cursor move
- **Ambient:** wind, water, fire for terrain tiles

**Would require:**
- Audio asset files (SFX + music)
- `AudioManager` or `SoundEngine` class
- Phaser sound integration in `BattleScene`
- Sound hooks in `runBattleAnimation()`, `showVictoryScreen()`, `showDefeatScreen()`

**References:** `src/scenes/BattleScene.ts` (battle animation, victory/defeat screens)

---

### 27. Supports Display in Battle UI
**Status:** Not implemented  
**Impact:** Low

Even if the support system were implemented, the battle UI doesn't display:

- Support rank indicators on unit sprites
- Support bonus percentages in attack preview
- Support chain information in the status window

**References:** `src/game/ui/StatusWindow.ts`, `src/game/ui/EnemyPreview.ts`, `src/scenes/BattleScene.ts`

---

## Summary

### By Priority

| # | Missing Feature | Priority | Effort |
|---|---|---|---|
| 1 | Fog of War | 🔴 High | High |
| 2 | Pair Up + Combination Attacks | 🔴 High | High |
| 3 | Ally Phase AI | 🔴 High | Medium |
| 4 | Map Objectives (Seize/Defend/Escape) | 🔴 High | Medium |
| 5 | Support System | 🟠 High | High |
| 6 | World Map / Chapter Selection | 🟠 High | High |
| 7 | Preparation Screen | 🟡 Medium | High |
| 8 | Shop Access (village/prep integration) | 🟡 Medium | Medium |
| 9 | Turn-Based Reinforcements | 🟡 Medium | Medium |
| 10 | Village / Fort Tile Interaction | 🟡 Medium | Medium |
| 11 | Weapon Rank WExp Accumulation | 🟡 Medium | Medium |
| 12 | Recruitment (Talk command) | 🟡 Medium | Medium |
| 13 | Weapon Forging (Armory) | 🟡 Medium | Medium |
| 14 | Animated Sprite Sheets | 🟠 Very High | Very High |
| 15 | Audio System | 🟠 High | High |
| 16 | Supply / Convoy System | 🟡 Medium | Medium |
| 17 | Give/Take/Drop Rescue UI | 🟡 Low | Low |
| 18 | Thief Lockpick Item | 🟡 Low | Low |
| 19 | Ballistae / Longbow | 🟡 Medium | Medium |
| 20 | Base Camp / Base Conversations | 🟠 Low | Medium |
| 21 | Secret Shop | 🟡 Low | Medium |
| 22 | Throne / Gate Terrain | 🟡 Medium | Medium |
| 23 | Door Break vs Open Distinction | 🟡 Low | Low |
| 24 | Skip Enemy Phase Flag | 🟡 Low | Low |
| 25 | Supports in Battle UI | 🟡 Low | Low |

### Strengths of Current Implementation

The codebase has a **remarkably solid foundation**:

- ✅ Combat engine with 2RN true hit, weapon triangle, effectiveness, crit
- ✅ Dijkstra pathfinding with terrain cost weights
- ✅ Enemy AI with behavior/personality scoring
- ✅ Turn manager with 3-phase cycle
- ✅ Growth rates, level-up engine, promotion system
- ✅ Staff healing with multiple staff types (Heal, Physic, Mend, etc.)
- ✅ Rescue/drop/give/take mechanics
- ✅ Save/load with full state serialization
- ✅ Cutscene trigger system for story events
- ✅ Trade engine for item swapping
- ✅ Shop engine with buy/sell
- ✅ Durability tracking with weapon break
- ✅ Terrain hazard system (lava damage)
- ✅ Door and chest interaction (thief opening)
- ✅ Steal mechanic for thieves

### Recommended Implementation Order

1. **Map Objectives** — Seize/Defend are foundational for actual chapter goals
2. **Fog of War** — Core to the tactical feel of Fire Emblem
3. **Ally Phase AI** — Makes ally units functional
4. **Talk/Recruitment** — Enables story depth
5. **Preparation Screen + Shop Integration** — Makes the economy meaningful
6. **Turn-Based Reinforcements** — Critical for later-chapter difficulty scaling
7. **Village Tiles** — Adds exploration flavor
8. **Support System** — Adds unit relationship depth
9. **Weapon Rank WExp** — Makes weapon choices matter over time
10. **World Map** — Makes chapters feel connected
11. **Animated Sprites** — Visual polish (can be done in parallel with other items)
12. **Audio** — Final polish pass