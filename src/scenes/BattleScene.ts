import Phaser from 'phaser';
import { TILE_SIZE, GRID_COLS, GRID_ROWS } from '../constants';
import { GameEngine } from '../game/GameEngine';
import { Unit, Faction, UnitClass } from '../game/units/Unit';
import { createStats } from '../game/units/Stats';
import { TerrainType } from '../game/map/Terrain';
import { WEAPON_DB } from '../game/combat/Weapons';
import { CombatEngine } from '../game/combat/Engine';

const TERRAIN_COLORS: Record<string, number> = {
  plains: 0x8fbc8f,
  forest: 0x228b22,
  mountain: 0x808080,
  water: 0x4682b4,
  wall: 0x2f4f4f,
};

const FACTION_COLORS: Record<string, number> = {
  player: 0x3498db,
  enemy: 0xe74c3c,
  ally: 0x2ecc71,
};

function getWeaponForUnit(unit: Unit) {
  if (unit.unitClass === UnitClass.MAGE) return WEAPON_DB['Fire'];
  if (unit.unitClass === UnitClass.BRIGAND) return WEAPON_DB['Iron Axe'];
  if (unit.unitClass === UnitClass.SOLDIER) return WEAPON_DB['Iron Lance'];
  return WEAPON_DB['Iron Sword'];
}

export class BattleScene extends Phaser.Scene {
  private engine!: GameEngine;
  private tileRects: Phaser.GameObjects.Rectangle[][] = [];
  private unitSprites: Map<string, Phaser.GameObjects.Container> = new Map();
  private moveGraphics!: Phaser.GameObjects.Graphics;
  private selectedUnit: Unit | null = null;
  private offsetX: number = 0;
  private offsetY: number = 0;

  constructor() {
    super({ key: 'BattleScene' });
  }

  create(): void {
    this.cameras.main.fadeIn(500, 0, 0, 0);

    this.offsetX = (this.cameras.main.width - GRID_COLS * TILE_SIZE) / 2;
    this.offsetY = (this.cameras.main.height - GRID_ROWS * TILE_SIZE) / 2;

    this.engine = new GameEngine(GRID_COLS, GRID_ROWS);
    this.moveGraphics = this.add.graphics();
    this.moveGraphics.setDepth(1);

    this.createGridVisuals();
    this.populateMap();
    this.spawnUnits();
    this.setupInput();
    this.createUI();
  }

  private createGridVisuals(): void {
    for (let y = 0; y < GRID_ROWS; y++) {
      this.tileRects[y] = [];
      for (let x = 0; x < GRID_COLS; x++) {
        const px = this.offsetX + x * TILE_SIZE;
        const py = this.offsetY + y * TILE_SIZE;
        const rect = this.add.rectangle(
          px + TILE_SIZE / 2,
          py + TILE_SIZE / 2,
          TILE_SIZE - 2,
          TILE_SIZE - 2,
          TERRAIN_COLORS.plains,
        );
        rect.setStrokeStyle(1, 0x1a1a2e);
        rect.setInteractive({ useHandCursor: true });
        this.tileRects[y][x] = rect;
      }
    }
  }

  private populateMap(): void {
    for (let y = 0; y < GRID_ROWS; y++) {
      for (let x = 0; x < GRID_COLS; x++) {
        if (x === 0 || x === GRID_COLS - 1 || y === 0 || y === GRID_ROWS - 1) {
          this.engine.setTerrain(x, y, TerrainType.MOUNTAIN);
        } else if ((x + y) % 7 === 0) {
          this.engine.setTerrain(x, y, TerrainType.FOREST);
        } else if ((x * y) % 11 === 0) {
          this.engine.setTerrain(x, y, TerrainType.WATER);
        }
      }
    }
    this.syncTileColors();
  }

  private syncTileColors(): void {
    for (let y = 0; y < GRID_ROWS; y++) {
      for (let x = 0; x < GRID_COLS; x++) {
        const terrain = this.engine.grid.getTerrain(x, y);
        const color = TERRAIN_COLORS[terrain] ?? TERRAIN_COLORS.plains;
        const rect = this.tileRects[y][x];
        if (rect) rect.setFillStyle(color);
      }
    }
  }

  private spawnUnits(): void {
    const pStats1 = createStats({ hp: 22, maxHp: 22, str: 8, mag: 2, skl: 7, spd: 8, luk: 6, def: 6, res: 2, mov: 5 });
    const pStats2 = createStats({ hp: 16, maxHp: 16, str: 1, mag: 9, skl: 6, spd: 7, luk: 5, def: 2, res: 7, mov: 5 });
    const eStats1 = createStats({ hp: 26, maxHp: 26, str: 9, mag: 0, skl: 4, spd: 5, luk: 3, def: 5, res: 1, mov: 5 });
    const eStats2 = createStats({ hp: 20, maxHp: 20, str: 7, mag: 0, skl: 6, spd: 5, luk: 2, def: 7, res: 1, mov: 5 });

    this.engine.addUnit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, pStats1, 2, 5);
    this.engine.addUnit('p2', 'Elara', Faction.PLAYER, UnitClass.MAGE, pStats2, 3, 6);
    this.engine.addUnit('e1', 'Bandit', Faction.ENEMY, UnitClass.BRIGAND, eStats1, 12, 4);
    this.engine.addUnit('e2', 'Soldier', Faction.ENEMY, UnitClass.SOLDIER, eStats2, 13, 6);

    this.syncUnitSprites();
  }

  private syncUnitSprites(): void {
    for (const sprite of this.unitSprites.values()) sprite.destroy();
    this.unitSprites.clear();

    for (const unit of this.engine.getAllUnits()) {
      if (!unit.isAlive) continue;
      const color = FACTION_COLORS[unit.faction] ?? 0xffffff;
      const px = this.offsetX + unit.gridX * TILE_SIZE + TILE_SIZE / 2;
      const py = this.offsetY + unit.gridY * TILE_SIZE + TILE_SIZE / 2;

      const body = this.add.rectangle(0, 0, TILE_SIZE - 8, TILE_SIZE - 8, color);
      body.setAlpha(unit.hasActed ? 0.5 : 1);
      const label = this.add.text(0, TILE_SIZE / 2 + 2, unit.name.slice(0, 3), {
        fontSize: '10px',
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 3,
      }).setOrigin(0.5);

      const container = this.add.container(px, py, [body, label]);

      // HP bar
      const hpRatio = unit.stats.hp / unit.stats.maxHp;
      const hpBg = this.add.rectangle(0, -TILE_SIZE / 2 + 4, TILE_SIZE - 4, 4, 0x000000);
      const hpBar = this.add.rectangle(
        -(TILE_SIZE - 4) / 2 + ((TILE_SIZE - 4) * hpRatio) / 2,
        -TILE_SIZE / 2 + 4,
        (TILE_SIZE - 4) * hpRatio,
        4,
        hpRatio > 0.5 ? 0x2ecc71 : hpRatio > 0.25 ? 0xf1c40f : 0xe74c3c,
      );
      container.add([hpBg, hpBar]);

      this.unitSprites.set(unit.id, container);
    }
  }

  private setupInput(): void {
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      const gx = Math.floor((pointer.x - this.offsetX) / TILE_SIZE);
      const gy = Math.floor((pointer.y - this.offsetY) / TILE_SIZE);
      if (!this.engine.grid.isInBounds(gx, gy)) return;
      this.handleTileClick(gx, gy);
    });
  }

  private handleTileClick(gx: number, gy: number): void {
    if (!this.engine.turnManager.isPlayerPhase()) return;

    const clickedUnit = this.engine.getUnit(gx, gy);

    if (this.selectedUnit) {
      const range = this.engine.getMoveRange(this.selectedUnit);
      const key = `${gx},${gy}`;
      if (range.has(key) && !clickedUnit) {
        this.tweens.add({
          targets: this.unitSprites.get(this.selectedUnit.id),
          x: this.offsetX + gx * TILE_SIZE + TILE_SIZE / 2,
          y: this.offsetY + gy * TILE_SIZE + TILE_SIZE / 2,
          duration: 300,
          onComplete: () => {
            this.engine.moveUnit(this.selectedUnit!, gx, gy);
            this.selectedUnit!.hasActed = true;
            this.selectedUnit = null;
            this.moveGraphics.clear();
            this.syncUnitSprites();
          },
        });
        return;
      }
    }

    if (clickedUnit && clickedUnit.isPlayer && !clickedUnit.hasActed) {
      this.selectedUnit = clickedUnit;
      this.showMoveRange(clickedUnit);
    }
  }

  private showMoveRange(unit: Unit): void {
    this.moveGraphics.clear();
    const range = this.engine.getMoveRange(unit);
    range.forEach((_cost, key) => {
      const [x, y] = key.split(',').map(Number);
      this.moveGraphics.fillStyle(0x3498db, 0.4);
      this.moveGraphics.fillRect(
        this.offsetX + x * TILE_SIZE,
        this.offsetY + y * TILE_SIZE,
        TILE_SIZE,
        TILE_SIZE,
      );
    });
  }

  private createUI(): void {
    const phaseText = this.add.text(16, 16, 'Phase: Player', {
      fontSize: '20px',
      color: '#ecf0f1',
      backgroundColor: '#2c3e50',
      padding: { x: 10, y: 6 },
    }).setScrollFactor(0);

    const endTurn = this.add.text(16, 60, '[ End Turn ]', {
      fontSize: '16px',
      color: '#ecf0f1',
      backgroundColor: '#c0392b',
      padding: { x: 10, y: 6 },
    }).setInteractive({ useHandCursor: true });

    endTurn.on('pointerdown', () => {
      this.selectedUnit = null;
      this.moveGraphics.clear();
      this.engine.endTurn();
      this.syncUnitSprites();
      phaseText.setText(
        `Phase: ${this.engine.turnManager.isPlayerPhase() ? 'Player' : 'Enemy'}`,
      );

      if (this.engine.turnManager.isEnemyPhase()) {
        this.executeEnemyActions(() => {
          this.engine.endTurn(); // Enemy → Ally
          this.engine.endTurn(); // Ally → Player
          this.syncUnitSprites();
          phaseText.setText(
            `Phase: ${this.engine.turnManager.isPlayerPhase() ? 'Player' : 'Enemy'}`,
          );
        });
      }
    });
  }

  private executeEnemyActions(onComplete: () => void): void {
    const actions = this.engine.getPendingActions();
    if (actions.length === 0) {
      onComplete();
      return;
    }

    const processNext = (index: number) => {
      if (index >= actions.length) {
        onComplete();
        return;
      }

      const action = actions[index];
      if (action.type === 'move' && action.x !== undefined && action.y !== undefined) {
        const sprite = this.unitSprites.get(action.actor.id);
        if (sprite) {
          const targetX = this.offsetX + action.x * TILE_SIZE + TILE_SIZE / 2;
          const targetY = this.offsetY + action.y * TILE_SIZE + TILE_SIZE / 2;
          this.tweens.add({
            targets: sprite,
            x: targetX,
            y: targetY,
            duration: 300,
            onComplete: () => {
              this.engine.moveUnit(action.actor, action.x!, action.y!);
              processNext(index + 1);
            },
          });
        } else {
          processNext(index + 1);
        }
      } else if (action.type === 'attack' && action.targetX !== undefined && action.targetY !== undefined) {
        const target = this.engine.getUnit(action.targetX, action.targetY);
        if (target && target.isAlive) {
          const targetSprite = this.unitSprites.get(target.id);
          if (targetSprite) {
            const weapon = getWeaponForUnit(action.actor);
            const defWeapon = getWeaponForUnit(target);
            const combat = new CombatEngine(this.engine.grid);
            const rng = () => Math.floor(Math.random() * 100);
            const result = combat.resolveCombat(action.actor, target, weapon, defWeapon, rng);

            const lastEntry = result.log[result.log.length - 1];
            const isCritical = result.log.some((e) => e.critical);
            const defenderDied = result.defenderDied;

            if (isCritical) {
              this.cameras.main.shake(200, 0.01);
              this.cameras.main.flash(200, 255, 255, 255);
            } else if (lastEntry?.hit) {
              this.cameras.main.shake(100, 0.005);
            }

            if (defenderDied && targetSprite) {
              this.tweens.add({
                targets: targetSprite,
                alpha: 0,
                duration: 500,
                onComplete: () => {
                  this.syncUnitSprites();
                  processNext(index + 1);
                },
              });
            } else {
              // Flash target red on hit
              if (lastEntry?.hit) {
                this.tweens.add({
                  targets: targetSprite,
                  alpha: 0.3,
                  duration: 100,
                  yoyo: true,
                  hold: 100,
                  onComplete: () => {
                    this.syncUnitSprites();
                    processNext(index + 1);
                  },
                });
              } else {
                this.time.delayedCall(200, () => {
                  this.syncUnitSprites();
                  processNext(index + 1);
                });
              }
            }
          } else {
            processNext(index + 1);
          }
        } else {
          processNext(index + 1);
        }
      } else {
        processNext(index + 1);
      }
    };

    processNext(0);
  }
}
