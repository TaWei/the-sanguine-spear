import Phaser from 'phaser';
import { Tile } from '../entities/Tile';
import { Unit } from '../entities/Unit';
import { TILE_SIZE, GRID_COLS, GRID_ROWS } from '../constants';
import { TileData, UnitData, GamePhase, InputMode } from '../types';

export class BattleScene extends Phaser.Scene {
  private tiles: Tile[][] = [];
  private units: Unit[] = [];
  private selectedUnit: Unit | null = null;
  private phase: GamePhase = 'player';
  private inputMode: InputMode = 'idle';
  private moveRangeGraphics!: Phaser.GameObjects.Graphics;
  private cursorHighlight!: Phaser.GameObjects.Rectangle;
  private phaseText!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: 'BattleScene' });
  }

  create(): void {
    this.cameras.main.fadeIn(500, 0, 0, 0);

    this.moveRangeGraphics = this.add.graphics();
    this.createGrid();
    this.spawnUnits();
    this.setupInput();
    this.createUI();
  }

  private createGrid(): void {
    const offsetX = (this.cameras.main.width - GRID_COLS * TILE_SIZE) / 2;
    const offsetY = (this.cameras.main.height - GRID_ROWS * TILE_SIZE) / 2;

    for (let y = 0; y < GRID_ROWS; y++) {
      this.tiles[y] = [];
      for (let x = 0; x < GRID_COLS; x++) {
        const tileData: TileData = {
          x,
          y,
          terrain: this.pickTerrain(x, y),
          unit: null,
        };
        const tile = new Tile(this, offsetX + x * TILE_SIZE, offsetY + y * TILE_SIZE, tileData);
        this.tiles[y][x] = tile;
      }
    }
  }

  private pickTerrain(x: number, y: number) {
    // Simple procedural terrain for demo
    if (x === 0 || x === GRID_COLS - 1 || y === 0 || y === GRID_ROWS - 1) {
      return { type: 'mountain' as const, moveCost: 99, defenseBonus: 0, avoidBonus: 0 };
    }
    if ((x + y) % 7 === 0) {
      return { type: 'forest' as const, moveCost: 2, defenseBonus: 1, avoidBonus: 20 };
    }
    if ((x * y) % 11 === 0) {
      return { type: 'water' as const, moveCost: 99, defenseBonus: 0, avoidBonus: 0 };
    }
    return { type: 'plains' as const, moveCost: 1, defenseBonus: 0, avoidBonus: 0 };
  }

  private spawnUnits(): void {
    const offsetX = (this.cameras.main.width - GRID_COLS * TILE_SIZE) / 2;
    const offsetY = (this.cameras.main.height - GRID_ROWS * TILE_SIZE) / 2;

    const playerUnits: UnitData[] = [
      {
        id: 'p1', name: 'Rowan', faction: 'player', class: 'lord', level: 1, exp: 0,
        stats: { hp: 22, maxHp: 22, str: 8, mag: 2, skl: 7, spd: 8, luk: 6, def: 6, res: 2, mov: 5 },
        growths: { hp: 80, str: 55, mag: 20, skl: 50, spd: 55, luk: 45, def: 40, res: 20, mov: 0 },
        inventory: ['Iron Sword'], equipped: 'Iron Sword', gridX: 2, gridY: 5,
      },
      {
        id: 'p2', name: 'Elara', faction: 'player', class: 'mage', level: 1, exp: 0,
        stats: { hp: 16, maxHp: 16, str: 1, mag: 9, skl: 6, spd: 7, luk: 5, def: 2, res: 7, mov: 5 },
        growths: { hp: 50, str: 25, mag: 60, skl: 45, spd: 50, luk: 40, def: 15, res: 55, mov: 0 },
        inventory: ['Fire'], equipped: 'Fire', gridX: 3, gridY: 6,
      },
    ];

    const enemyUnits: UnitData[] = [
      {
        id: 'e1', name: 'Bandit', faction: 'enemy', class: 'brigand', level: 2, exp: 0,
        stats: { hp: 26, maxHp: 26, str: 9, mag: 0, skl: 4, spd: 5, luk: 3, def: 5, res: 1, mov: 5 },
        growths: {}, inventory: ['Iron Axe'], equipped: 'Iron Axe', gridX: 12, gridY: 4,
      },
      {
        id: 'e2', name: 'Soldier', faction: 'enemy', class: 'soldier', level: 1, exp: 0,
        stats: { hp: 20, maxHp: 20, str: 7, mag: 0, skl: 6, spd: 5, luk: 2, def: 7, res: 1, mov: 5 },
        growths: {}, inventory: ['Iron Lance'], equipped: 'Iron Lance', gridX: 13, gridY: 6,
      },
    ];

    [...playerUnits, ...enemyUnits].forEach(data => {
      const unit = new Unit(this, offsetX, offsetY, data);
      this.units.push(unit);
      this.tiles[data.gridY][data.gridX].setUnit(unit);
    });
  }

  private setupInput(): void {
    this.cursorHighlight = this.add.rectangle(0, 0, TILE_SIZE, TILE_SIZE, 0xffff00, 0.3);
    this.cursorHighlight.setVisible(false);

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      const tile = this.pixelToTile(pointer.x, pointer.y);
      if (tile) {
        this.cursorHighlight.setPosition(tile.x + TILE_SIZE / 2, tile.y + TILE_SIZE / 2);
        this.cursorHighlight.setVisible(true);
      } else {
        this.cursorHighlight.setVisible(false);
      }
    });

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      const tile = this.pixelToTile(pointer.x, pointer.y);
      if (!tile) return;
      const gx = tile.data.values.gridX as number;
      const gy = tile.data.values.gridY as number;
      this.handleTileClick(gx, gy, tile);
    });
  }

  private pixelToTile(px: number, py: number): Phaser.GameObjects.Rectangle | null {
    const offsetX = (this.cameras.main.width - GRID_COLS * TILE_SIZE) / 2;
    const offsetY = (this.cameras.main.height - GRID_ROWS * TILE_SIZE) / 2;
    const gx = Math.floor((px - offsetX) / TILE_SIZE);
    const gy = Math.floor((py - offsetY) / TILE_SIZE);

    if (gx < 0 || gx >= GRID_COLS || gy < 0 || gy >= GRID_ROWS) return null;
    return this.tiles[gy][gx].getGameObject();
  }

  private handleTileClick(gx: number, gy: number, tileObj: Phaser.GameObjects.Rectangle): void {
    if (this.phase !== 'player') return;

    const unit = this.tiles[gy][gx].getUnit();

    if (this.inputMode === 'idle' || this.inputMode === 'select') {
      if (unit && unit.getFaction() === 'player' && !unit.hasActed()) {
        this.selectUnit(unit);
      }
    } else if (this.inputMode === 'move' && this.selectedUnit) {
      if (!unit || unit === this.selectedUnit) {
        this.moveSelectedUnit(gx, gy);
      }
    }
  }

  private selectUnit(unit: Unit): void {
    this.selectedUnit = unit;
    this.inputMode = 'move';
    this.drawMoveRange(unit);
  }

  private drawMoveRange(unit: Unit): void {
    this.moveRangeGraphics.clear();
    const range = unit.getMoveRange();
    const offsetX = (this.cameras.main.width - GRID_COLS * TILE_SIZE) / 2;
    const offsetY = (this.cameras.main.height - GRID_ROWS * TILE_SIZE) / 2;

    range.forEach(([x, y]) => {
      this.moveRangeGraphics.fillStyle(0x3498db, 0.4);
      this.moveRangeGraphics.fillRect(offsetX + x * TILE_SIZE, offsetY + y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
    });
  }

  private moveSelectedUnit(gx: number, gy: number): void {
    if (!this.selectedUnit) return;

    const oldX = this.selectedUnit.getGridX();
    const oldY = this.selectedUnit.getGridY();
    const range = this.selectedUnit.getMoveRange();

    const canMove = range.some(([rx, ry]) => rx === gx && ry === gy);
    if (!canMove) return;

    this.tiles[oldY][oldX].setUnit(null);
    this.selectedUnit.moveTo(gx, gy);
    this.tiles[gy][gx].setUnit(this.selectedUnit);

    this.moveRangeGraphics.clear();
    this.inputMode = 'attack';
    // TODO: show attack range, confirm menu
    this.selectedUnit.setActed(true);
    this.selectedUnit = null;
    this.inputMode = 'idle';
  }

  private createUI(): void {
    this.phaseText = this.add.text(16, 16, 'Phase: Player', {
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

    endTurn.on('pointerdown', () => this.endPhase());
  }

  private endPhase(): void {
    this.units.forEach(u => u.setActed(false));
    if (this.phase === 'player') {
      this.phase = 'enemy';
      this.phaseText.setText('Phase: Enemy');
      this.runEnemyAI();
    } else {
      this.phase = 'player';
      this.phaseText.setText('Phase: Player');
    }
  }

  private runEnemyAI(): void {
    // Placeholder: simple AI
    setTimeout(() => this.endPhase(), 800);
  }
}
