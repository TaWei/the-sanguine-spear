# The Sanguine Spear

A Fire Emblem-inspired tactical RPG built with [Phaser 3](https://phaser.io/) and TypeScript.

## Features

- Grid-based tactical movement
- Turn-based combat phases (Player / Enemy / Ally)
- Unit classes with distinct stats and growth rates
- Terrain system affecting movement, defense, and avoid
- Phaser 3 + Vite + TypeScript stack

## Getting Started

```bash
# Install dependencies
npm install

# Start the dev server
npm run dev

# Build for production
npm run build
```

## Project Structure

```
src/
  main.ts                 # Game bootstrap
  constants.ts            # Game constants (grid size, factions, classes, terrain)
  types.ts                # TypeScript interfaces for units, tiles, stats
  scenes/
    BootScene.ts          # Asset preloading
    MainMenuScene.ts      # Title screen
    BattleScene.ts        # Main tactical battle map
  entities/
    Tile.ts               # Grid tile with terrain data
    Unit.ts               # Combat unit with stats, movement, and rendering
public/
  assets/                 # Spritesheets, tilemaps, audio (add here)
```

## Roadmap

- [ ] Weapon triangle (Sword > Axe > Lance > Sword)
- [ ] Combat calculations (hit rate, crit, damage)
- [ ] Inventory and equippable items
- [ ] AI pathfinding and behavior trees
- [ ] Map objectives (rout enemy, seize, defend)
- [ ] Animated spritesheets
- [ ] Sound design and music
- [ ] Story chapters and dialogue system
