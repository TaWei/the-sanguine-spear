# Project Plan: 10 New Levels for The Sanguine Spear

## Context

The Sanguine Spear currently has 3 levels. This plan designs 10 new chapters (levels 4–13) with escalating difficulty, unique terrain themes, and varied gameplay mechanics inspired by Fire Emblem's classic design philosophy.

**Current Levels:**
- **Level 1 — The Sanguine Plains** (16×12): Tutorial-ish, simple plains map, 2 player units vs 2 enemies. Standard rout.
- **Level 2 — The Molten Pass** (16×12): Lava river bisects the map with cliff barriers, 3 players vs 3 enemies. Forces route planning around terrain.
- **Level 3 — The Sunken Temple** (100×100): Open-water archipelego, 5 players vs ~12 enemies across 7 islands with bridges. Standard rout, large scale.

**Existing level structure** — each `LevelDefinition` supports: terrain, units, triggers, objectives (rout/seize/defend/escape), villages, reinforcements, and talks.

---

## Level Progression Arc

| Phase | Levels | Tone | Introduces |
|---|---|---|---|
| Early | 4–5 | Tutorial continuation | Movement tactics, basic enemy variety |
| Mid-early | 6–7 | Complication | Reinforcements, defend/escape objectives |
| Mid | 8–9 | Complexity | Fog of war, siege terrain, mixed factions |
| Late | 10–12 | Challenge | Full enemy composition, boss mechanics |
| Endgame | 13 | Climax | Gaiden-style large map, multi-objective |

---

## Level Designs

### Level 4 — The Verdant Forest
**Theme:** Dense woodland with high movement cost  
**Map size:** 16×12  
**Summary:** Forest-heavy map where every tree matters. Forest tiles cost 2 movement (not 1), giving +1 DEF and +20 avoid. Teaches players to use terrain tactically.  
**New mechanic introduced:** Forest terrain tactics  
**Enemy composition:** 4 soldiers + 2 archers, medium positioning to force player through chokes  
**Objective:** Rout  
**Terrain layout:** Interior is mostly forest, with 2 narrow plains corridors forming a natural funnel. Mountains border the edges.  
**Player units:** Rowan, Elara, Sylvie  
**Difficulty:** Easy — gentle introduction to terrain-dependent play  
**Enemy AI:** Standard pursuit  

---

### Level 5 — The Iron Bridge
**Theme:** Three bridges over a wide river, control the crossings  
**Map size:** 16×12  
**Summary:** Water dominates the southern half; three narrow bridges are the only crossing points. Control of bridges is essential — archers and mages can dominate from the far bank.  
**New mechanic introduced:** Choke-point control, ranged tile advantage  
**Enemy composition:** 2 brigands, 2 soldiers, 2 archers — archers positioned on the far bank to use range advantage  
**Objective:** Rout  
**Terrain layout:** Bottom half is deep water; three horizontal bridges at y=4, y=7, y=10. Player starts top-left, enemies start top-right.  
**Player units:** Rowan, Elara, Sylvie, Gareth  
**Difficulty:** Easy–Medium — learn to advance under archer fire  
**Enemy AI:** Attack-in-range on archers, pursue on melee  

---

### Level 6 — The Siege of Fort Granius
**Theme:** Fortress siege with defensive terrain and walls  
**Map size:** 16×12  
**Summary:** Player must break into a fort defended by fort terrain (+3 DEF per turn) and gate blocked by enemies. Reinforcements arrive from the north on turn 4. Teaches sustain and turn-pressure timing.  
**New mechanic introduced:** Fort terrain, turn-based reinforcements, siege timing  
**Enemy composition:** 3 soldiers (gate), 2 mages (inner wall), 1 hero boss inside the fort  
**Objective:** Rout  
**Reinforcements:** 2 soldiers spawn at north entrance on turn 4 (one-shot)  
**Terrain layout:** Fort interior with inner courtyard, wall perimeter with one gate at south. Fort tiles give defender +3 DEF.  
**Player units:** Rowan, Elara, Sylvie, Gareth  
**Difficulty:** Medium — must manage turns before reinforcements appear  
**Enemy AI:** Guard behavior on gate soldiers, aggressive on mages  

---

### Level 7 — The Canyon Escape
**Theme:** Escape under pressure, narrow canyon, enemy encirclement  
**Map size:** 20×12  
**Summary:** Player starts at the east end of a long canyon; the escape tile is at the west end. Enemies surround the player and close in each turn. Survive and reach the exit.  
**New mechanic introduced:** Escape objective, threat-close positioning, survival play  
**Enemy composition:** 4 brigands (front), 2 archers (high ground on canyon walls), 2 cavalry (flanking on plains outside canyon)  
**Objective:** Escape — Rowan must reach the western tile (x=1, y=6)  
**Terrain layout:** Narrow canyon corridor (4 tiles wide, 18 tiles long), mountains on both sides, plains outside for cavalry movement. Escape tile is a special throne-like marker.  
**Player units:** Rowan, Elara, Sylvie, Gareth, Lyra  
**Difficulty:** Medium — aggressive enemies require fast movement  
**Enemy AI:** Pursue on melee, attack-in-range on archers, aggressive on cavalry  

---

### Level 8 — The Fog of Ruins
**Theme:** Ancient ruins shrouded in fog of war  
**Map size:** 16×12  
**Summary:** Fog of war tiles obscure enemy positions until a player unit enters. Ruins provide cover. Enemies have ambush positions. Players must expose and eliminate threats without walking into traps.  
**New mechanic introduced:** Fog of war, ambush triggers, ruins terrain  
**Fog configuration:** 8 fog tiles in a center ruins cluster  
**Enemy composition:** 3 assassins (high skl, low HP, high crit), 2 soldiers, 1 boss "Wraith Knight" (high DEF, mounted)  
**Objective:** Rout  
**Triggers:** Each assassin has an ambush trigger that spawns them when a player enters their fog zone (one-shot per assassin)  
**Terrain layout:** Plains base with a central ruins zone (fog). Mountains border the edges.  
**Player units:** Rowan, Elara, Sylvie, Gareth  
**Difficulty:** Medium–Hard — fog uncertainty requires careful probing  
**Enemy AI:** Guard on boss, ambush on assassins  

---

### Level 9 — The Coastal Siege
**Theme:** Mixed water and land map with allied NPC allies  
**Map size:** 20×14  
**Summary:** Player and ally units fight side-by-side against a larger enemy force on a coastal map. Includes water sections (shallow fords) and cliff positions. Ally AI is passive but helps draw aggro.  
**New mechanic introduced:** Allied faction units, mixed terrain (water ford + cliffs), multi-faction combat  
**Factions:** Player (4), Ally (2), Enemy (5)  
**Objective:** Rout (both enemy AND ally units must survive for full victory — defeat if ally dies)  
**Terrain layout:** Coastal strip at top, shallow water ford at middle, open plains at bottom. Cliffs on left side give elevation advantage.  
**Player units:** Rowan, Elara, Sylvie, Gareth  
**Ally units:** 1 soldier "Sir Cadoc", 1 mage "Lenna"  
**Enemy composition:** 2 brigands, 1 archer, 1 mage, 1 hero (mounted cavalry boss "Duke Maren")  
**Difficulty:** Hard — must protect allies while clearing enemies  
**Enemy AI:** Aggressive on brigands, attack-in-range on archer, guard on boss  

---

### Level 10 — The Thornwood Ambush
**Theme:** Forest ambush map where enemies have superior numbers  
**Map size:** 16×12  
**Summary:** Heavy enemy presence in a forest map. Enemies are positioned in overlapping attack ranges. Uses more advanced AI (aggressive + attack-in-range coordination). Player must eliminate key threats in the right order.  
**New mechanic introduced:** Advanced enemy coordination, forest cover exploitation, threat prioritization  
**Enemy composition:** 5 soldiers, 3 archers, 2 mages — positioned to create overlapping attack zones from forest  
**Objective:** Rout  
**Terrain layout:** Dense forest interior with some clearings. Mountains at edges. Forest tiles (+1 DEF, +20 avoid) favor defenders.  
**Player units:** Rowan, Elara, Sylvie, Gareth, Lyra  
**Difficulty:** Hard — requires sequential threat elimination  
**Enemy AI:** Mixed aggressive/attack-in-range coordination  
**Special:** Each enemy unit has an individual AI personality (aggressive/cautious/wandering) creating emergent group behavior  

---

### Level 11 — The Hall of the Mountain King
**Theme:** Mountain pass with fortress interior, defensive siege  
**Map size:** 16×14  
**Summary:** Player must assault a mountain fortress from two directions. Gates on both east and west walls. Fort interior has throne tiles (+2 DEF, +2 RES). Enemies hold the interior with fortified positions.  
**New mechanic introduced:** Throne terrain, multi-entrance assault, fortress interior design  
**Enemy composition:** 4 soldiers (gates), 2 archers (inner wall), 2 mages (throne room), 1 boss "General Boros"  
**Objective:** Rout  
**Throne room:** Central chamber has throne terrain (6 tiles) giving defending units +2 DEF and +2 RES. Boss holds the throne.  
**Terrain layout:** Mountain exterior, two gate entrances east and west, interior corridors leading to central throne chamber.  
**Player units:** Rowan, Elara, Sylvie, Gareth, Lyra  
**Difficulty:** Hard — multi-front assault required  
**Enemy AI:** Guard on gate soldiers, attack-in-range on archers, guard on boss  

---

### Level 12 — The Battle of Karra's Gate
**Theme:** Large-scale open plains battle, cavalry warfare  
**Map size:** 24×16  
**Summary:** Wide open terrain favors cavalry movement. Enemy has a cavalry-dominant composition (3 cavalry units + support). Player must use terrain (forest patches) to avoid being run down. Multiple forest islands provide mobile cover.  
**New mechanic introduced:** Cavalry movement dominance, mobile warfare, large-scale formation  
**Enemy composition:** 3 cavalry (high mov=8), 2 archers, 2 mages, 1 hero boss "Captain Voss"  
**Objective:** Rout  
**Terrain layout:** Mostly plains (fast cavalry movement), scattered forest islands (3 main clusters) for cover. Mountains border top and bottom rows.  
**Player units:** Rowan, Elara, Sylvie, Gareth, Lyra, +1 newly promoted soldier (from level 11 promotion)  
**Difficulty:** Hard — cavalry speed advantage is significant, terrain management is key  
**Enemy AI:** Aggressive on cavalry (pursue), attack-in-range on archers  
**Special:** Cavalry AI uses aggressive personality to maximize movement advantage  

---

### Level 13 — The Crimson Throne (Finale)
**Theme:** Gaiden-style large map, multi-stage objective, dual-seize  
**Map size:** 100×60 (large open world with distinct zones)  
**Summary:** A massive map with three distinct zones — the **Western Plains** (open grassland), the **Ashen Corridor** (lava/cliff mixed terrain), and the **Crimson Throne Chamber** (inner sanctum). Two player lords (Rowan and a newly promoted ally) must each seize separate throne tiles to win. This forces a two-front strategy.  
**New mechanic introduced:** Multi-objective (two seize tiles), Gaiden-style large map with zones, dual-lord coordination  
**Objective:** Two-seize — both Rowan and a promoted Lord unit must each reach their own throne tile  
**Seize tiles:** Rowan throne at (5, 30), ally Lord throne at (75, 30)  
**Terrain zones:**  
- Western Plains (cols 0–35): Mostly plains with scattered forest, river crossing at col=35  
- Ashen Corridor (cols 36–65): Lava river (cols 38–42), cliff barriers, narrow crossing points  
- Crimson Throne Chamber (cols 66–95): Wall-bounded throne room, fortress interior  
**Enemy composition:** 12 enemies distributed across zones — light force in Western Plains, heavy in Ashen Corridor, boss + elite guard in Throne Chamber  
**Reinforcements:** Two waves: 3 cavalry at western border (turn 6), 2 mages at throne chamber (turn 10, one-shot)  
**Player units:** Rowan, Elara, Sylvie, Gareth, Lyra, 2 ally units ("Sir Cadoc" promoted to Hero, "Lenna" promoted to Sage)  
**Difficulty:** Very Hard — multi-zone navigation, resource allocation between two fronts, final boss  
**Enemy AI:** Guard on throne chamber, aggressive on plains, ambush on corridor  
**Special:** End-game narration via cutscene triggers on zone entry  

---

## Implementation Order

1. **Level 4** — easiest, extends forest terrain mechanics, minimal new features
2. **Level 5** — bridge choke mechanics, ranged advantage teaching
3. **Level 6** — introduces reinforcements, fort terrain
4. **Level 7** — escape objective, survival pressure
5. **Level 8** — fog of war + ambush triggers
6. **Level 9** — allied faction, mixed terrain, ally-protection
7. **Level 10** — advanced AI coordination, threat prioritization
8. **Level 11** — throne terrain, multi-entrance siege
9. **Level 12** — large open plains, cavalry warfare
10. **Level 13** — Gaiden-style large map, dual-seize finale

## Dependencies

- **Fog of war** — needed for Level 8. Already partially implemented (`FogTileRenderer` present in BattleScene). Verify fog-check logic in GameEngine.
- **Reinforcements** — needed for Level 6. Verify `reinforcements` field wiring in `GameEngine.loadLevel()`.
- **Throne terrain** — needed for Level 11. Add terrain type `throne` in `TERRAIN_DEFS` with DEF+2 RES+2 bonuses.
- **Multi-objective seize** — needed for Level 13. Currently `SeizeObjective` checks one tile. May need to extend to multi-seize or instantiate two objectives.
- **Ally faction AI** — needed for Level 9. Ally units should be passive (execute minimal AI, don't attack player).

## Testing Notes

Each level should have:
- A smoke test in `LevelData.test.ts` verifying the level loads without errors
- Unit count parity checks (enemy count vs player count for difficulty calibration)
- Objective wiring verification (seize tile coordinates, defend unit IDs, etc.)
- Pathfinding validation — ensure no terrain configuration creates unreachable objectives

## Difficulty Scaling Summary

| Level | Player Units | Enemy Units | Enemy Types | Map Size | Special |
|---|---|---|---|---|---|
| 4 | 3 | 6 | soldier, archer | 16×12 | Forest |
| 5 | 4 | 6 | brigand, soldier, archer | 16×12 | Bridges |
| 6 | 4 | 7 | soldier, mage, hero | 16×12 | Fort, reinforcements |
| 7 | 5 | 8 | brigand, archer, cavalry | 20×12 | Escape, choke |
| 8 | 4 | 7 | assassin, soldier, hero | 16×12 | Fog, ambush |
| 9 | 4+2 ally | 5 | brigand, archer, mage, hero | 20×14 | Ally faction |
| 10 | 5 | 10 | soldier, archer, mage | 16×12 | AI coordination |
| 11 | 5 | 7 | soldier, archer, mage, boss | 16×14 | Throne, siege |
| 12 | 6 | 8 | cavalry, archer, mage, hero | 24×16 | Cavalry, large |
| 13 | 6+2 ally | 12+reinforcements | mixed, boss | 100×60 | Dual-seize, Gaiden |