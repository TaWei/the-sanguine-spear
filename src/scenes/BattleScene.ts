import Phaser from 'phaser';
import { TILE_SIZE } from '../constants';
import { GameEngine } from '../game/GameEngine';
import { SaveManager } from '../game/save';
import { Unit, Faction } from '../game/units/Unit';
import { BattleMenu, MenuState, MenuAction } from '../game/ui/BattleMenu';
import { BattleDisplayState, BattlePhase } from '../game/ui/BattleDisplayState';
import { UNIT_STATE } from '../game/state/UnitState';
import { EnemyPreview } from '../game/ui/EnemyPreview';
import { getLevel, getNextLevelId } from '../game/levels/LevelData';
import { ExpPopup } from '../game/ui/ExpPopup';
import { StatusWindow } from '../game/ui/StatusWindow';
import { ItemMenu } from '../game/ui/ItemMenu';
import { TradeMenu } from '../game/ui/TradeMenu';
import { TurnBannerTiming } from '../game/ui/TurnBannerTiming';
import { snapGridLine } from '../game/ui/GridLineSnapper';
import { LevelUpDisplay, LEVEL_UP_PHASE } from '../game/ui/LevelUpDisplay';
import { PromotionDisplay, PROMOTION_PHASE } from '../game/ui/PromotionDisplay';
import { getPromotedClass } from '../game/promotion/PromotionData';
import type { Item, WeaponItem } from '../game/items/ItemTypes';
import type { CombatResult } from '../game/combat/Engine';
import { getWeaponTriangleMod } from '../game/combat/Weapons';

import { hasCutscene } from '../game/cutscene';
import { DragDetector } from '../game/ui/DragDetector';
import { TriggerContext } from '../game/cutscene/CutsceneTrigger';
import { FogTileRenderer } from '../game/fog/FogTileRenderer';

const TERRAIN_COLORS: Record<string, number> = {
  plains: 0x8fbc8f,
  forest: 0x228b22,
  mountain: 0x808080,
  water: 0x4682b4,
  wall: 0x2f4f4f,
  lava: 0xff4500,
  cliff: 0xa0522d,
  shallow_water: 0x5dade2,
  deep_water: 0x1b4f72,
  bridge: 0x8b4513,
  reef: 0x2ecc71,
  throne: 0xf1c40f,
  escape: 0x1abc9c,
  fort: 0x95a5a6,
  village: 0xe67e22,
  gate: 0x8e44ad,
  door: 0x8b4513,
  chest: 0xf39c12,
};

const FACTION_COLORS: Record<string, number> = {
  player: 0x3498db,
  enemy: 0xe74c3c,
  ally: 0x2ecc71,
};

export class BattleScene extends Phaser.Scene {
  private engine!: GameEngine;
  private tileRects: Phaser.GameObjects.Rectangle[][] = [];
  private tileSpriteMap = new Map<string, Phaser.GameObjects.Rectangle>();
  private readonly TILE_CULL_MARGIN = 2;
  private unitSprites = new Map<string, Phaser.GameObjects.Container>();
  private moveGraphics!: Phaser.GameObjects.Graphics;
  private gridLinesGraphics!: Phaser.GameObjects.Graphics;
  private selectedUnit: Unit | null = null;
  private offsetX = 0;
  private offsetY = 0;
  private battleMenu!: BattleMenu;
  private enemyPreview: EnemyPreview;
  private menuTexts: Phaser.GameObjects.Text[] = [];
  private enemyPreviewTexts: Phaser.GameObjects.GameObject[] = [];
  private battleOverlay: Phaser.GameObjects.Container | null = null;
  private attBattlePanel: Phaser.GameObjects.Container | null = null;
  private defBattlePanel: Phaser.GameObjects.Container | null = null;
  private battleDisplayState: BattleDisplayState | null = null;
  private inBattleMode = false;
  private pendingBattleCallback: (() => void) | null = null;
  private phaseText!: Phaser.GameObjects.Text;
  private inputEnabled = true;
  private bannerShownForTurn = 0;
  private preMovePosition: { x: number; y: number } | null = null;
  private pathGraphics!: Phaser.GameObjects.Graphics;
  private isAnimatingMovement = false;
  private currentLevelId = 'level-1';
  private combatResult: CombatResult | null = null;
  private expPopupContainer: Phaser.GameObjects.Container | null = null;
  private levelUpSequence: {
    display: LevelUpDisplay;
    container: Phaser.GameObjects.Container;
    timer: Phaser.Time.TimerEvent;
  } | null = null;
  private promotionSequence: {
    display: PromotionDisplay;
    container: Phaser.GameObjects.Container;
    timer: Phaser.Time.TimerEvent;
  } | null = null;
  private statusWindow: StatusWindow = new StatusWindow();
  private statusOverlay: Phaser.GameObjects.Container | null = null;
  private itemMenu: ItemMenu = new ItemMenu();
  private itemOverlay: Phaser.GameObjects.Container | null = null;
  private weaponOverlay: Phaser.GameObjects.Container | null = null;
  private saveBtn: Phaser.GameObjects.Text | null = null;
  private saveMenuContainer: Phaser.GameObjects.Container | null = null;
  private tradeMenu: TradeMenu = new TradeMenu();
  private tradeOverlay: Phaser.GameObjects.Container | null = null;
  private goldText: Phaser.GameObjects.Text | null = null;
  private preCutsceneInputEnabled = true;
  private dragDetector = new DragDetector(5);
  private fogRenderer: FogTileRenderer | null = null;
  private endTurnBtn: Phaser.GameObjects.Text | null = null;
  private menuBtn: Phaser.GameObjects.Text | null = null;
  private menuConfirmationOverlay: Phaser.GameObjects.Container | null = null;
  private combatPreviewOverlay: Phaser.GameObjects.Container | null = null;
  private combatPreviewConfirmMode: boolean = false;
  private pendingCombatTarget: Unit | null = null;

  constructor() {
    super({ key: 'BattleScene' });
    this.enemyPreview = new EnemyPreview();
  }

  create(data?: { levelId?: string; saveSlot?: string }): void {
    // Reset animation/state flags on scene creation / restart
    this.bannerShownForTurn = 0;
    this.isAnimatingMovement = false;
    this.inBattleMode = false;
    this.inputEnabled = true;

    this.cameras.main.fadeIn(500, 0, 0, 0);

    const levelId = data?.levelId ?? 'level-1';
    this.currentLevelId = levelId;
    const level = getLevel(levelId);
    if (!level) {
      throw new Error(`Unknown level: ${levelId}`);
    }

    this.engine = new GameEngine(level.cols, level.rows);
    if (data?.saveSlot) {
      const mgr = new SaveManager();
      const saveData = mgr.load(data.saveSlot);
      if (!saveData) {
        throw new Error(`Save slot not found: ${data.saveSlot}`);
      }
      this.engine.restore(saveData, level);
      this.updatePhaseText();
    } else {
      this.engine.loadLevel(level);
    }

    this.fogRenderer = new FogTileRenderer(this.engine.fog);

    const gridPixelW = level.cols * TILE_SIZE;
    const gridPixelH = level.rows * TILE_SIZE;
    const cameraW = this.cameras.main.width;
    const cameraH = this.cameras.main.height;

    if (gridPixelW <= cameraW && gridPixelH <= cameraH) {
      // Small map: center on screen (existing behavior)
      this.offsetX = (cameraW - gridPixelW) / 2;
      this.offsetY = (cameraH - gridPixelH) / 2;
    } else {
      // Large map: world-space coordinates, camera scrolls
      this.offsetX = 0;
      this.offsetY = 0;
      this.cameras.main.setBounds(0, 0, gridPixelW, gridPixelH);
    }

    this.moveGraphics = this.add.graphics();
    this.moveGraphics.setDepth(1);
    this.pathGraphics = this.add.graphics();
    this.pathGraphics.setDepth(2);
    this.gridLinesGraphics = this.add.graphics();
    this.gridLinesGraphics.setDepth(5);

    this.createGridVisuals();
    this.syncTileColors();
    this.syncUnitSprites();

    this.playCutsceneIfTriggered({ eventType: 'on_level_start' }, () => {
      this.setupInput();
      this.createUI();
      this.battleMenu = new BattleMenu();
      this.showChapterStartAnimation(() => {
        this.beginPlayerPhase();
      });
    });
  }

  private drawGridLines(): void {
    const g = this.gridLinesGraphics;
    g.clear();
    const cols = this.engine.grid.cols;
    const rows = this.engine.grid.rows;
    const pixelW = cols * TILE_SIZE;
    const pixelH = rows * TILE_SIZE;
    const lineColor = 0x1a1a2e;
    const scrollX = this.cameras.main.scrollX;
    const scrollY = this.cameras.main.scrollY;

    g.lineStyle(1, lineColor, 1);

    // Vertical lines — snap to pixel grid for uniform thickness
    for (let x = 0; x <= cols; x++) {
      const worldX = this.offsetX + x * TILE_SIZE;
      const px = snapGridLine(worldX, scrollX);
      const startY = snapGridLine(this.offsetY, scrollY);
      const endY = snapGridLine(this.offsetY + pixelH, scrollY);
      g.lineBetween(px, startY, px, endY);
    }

    // Horizontal lines — snap to pixel grid for uniform thickness
    for (let y = 0; y <= rows; y++) {
      const worldY = this.offsetY + y * TILE_SIZE;
      const py = snapGridLine(worldY, scrollY);
      const startX = snapGridLine(this.offsetX, scrollX);
      const endX = snapGridLine(this.offsetX + pixelW, scrollX);
      g.lineBetween(startX, py, endX, py);
    }
  }

  private createGridVisuals(): void {
    // Draw uniform grid lines first (so they're behind everything)
    this.drawGridLines();

    // Large map: use viewport-culled tile rendering
    if (this.offsetX === 0 && this.offsetY === 0) {
      this.updateVisibleTiles();
      return;
    }

    // Small map: create all tiles at once (existing behavior)
    for (let y = 0; y < this.engine.grid.rows; y++) {
      this.tileRects[y] = [];
      for (let x = 0; x < this.engine.grid.cols; x++) {
        const px = this.offsetX + x * TILE_SIZE;
        const py = this.offsetY + y * TILE_SIZE;
        const rect = this.add.rectangle(
          px + TILE_SIZE / 2,
          py + TILE_SIZE / 2,
          TILE_SIZE,
          TILE_SIZE,
          TERRAIN_COLORS.plains,
        );
        rect.setInteractive({ useHandCursor: true });
        this.tileRects[y][x] = rect;
      }
    }
  }

  private syncTileColors(): void {
    // Large map: iterate visible tiles only
    if (this.offsetX === 0 && this.offsetY === 0) {
      for (const [key, rect] of this.tileSpriteMap) {
        const [x, y] = key.split(',').map(Number);
        const terrain = this.engine.grid.getTerrain(x, y);
        const color = TERRAIN_COLORS[terrain] ?? TERRAIN_COLORS.plains;
        rect.setFillStyle(color);
        if (this.fogRenderer) {
          rect.setAlpha(this.fogRenderer.getTileAlpha(x, y));
        }
      }
      return;
    }

    // Small map: iterate all tiles (existing behavior)
    for (let y = 0; y < this.engine.grid.rows; y++) {
      for (let x = 0; x < this.engine.grid.cols; x++) {
        const terrain = this.engine.grid.getTerrain(x, y);
        const color = TERRAIN_COLORS[terrain] ?? TERRAIN_COLORS.plains;
        const rect = this.tileRects[y][x];
        rect.setFillStyle(color);
        if (this.fogRenderer) {
          rect.setAlpha(this.fogRenderer.getTileAlpha(x, y));
        }
      }
    }
  }

  private updateVisibleTiles(): void {
    // Only operates on large maps (offsetX=0, offsetY=0)
    if (this.offsetX !== 0 || this.offsetY !== 0) return;

    const cam = this.cameras.main;
    const margin = this.TILE_CULL_MARGIN;
    const tilePx = TILE_SIZE;

    const startCol = Math.max(0, Math.floor(cam.scrollX / tilePx) - margin);
    const endCol = Math.min(
      this.engine.grid.cols - 1,
      Math.ceil((cam.scrollX + cam.width) / tilePx) + margin,
    );
    const startRow = Math.max(0, Math.floor(cam.scrollY / tilePx) - margin);
    const endRow = Math.min(
      this.engine.grid.rows - 1,
      Math.ceil((cam.scrollY + cam.height) / tilePx) + margin,
    );

    const visible = new Set<string>();
    for (let y = startRow; y <= endRow; y++) {
      for (let x = startCol; x <= endCol; x++) {
        const key = `${x},${y}`;
        visible.add(key);
        if (!this.tileSpriteMap.has(key)) {
          const px = x * tilePx;
          const py = y * tilePx;
          const rect = this.add.rectangle(
            px + tilePx / 2,
            py + tilePx / 2,
            tilePx,
            tilePx,
            TERRAIN_COLORS.plains,
          );
          rect.setInteractive({ useHandCursor: true });
          rect.setDepth(0);
          const terrain = this.engine.grid.getTerrain(x, y);
          rect.setFillStyle(TERRAIN_COLORS[terrain] ?? TERRAIN_COLORS.plains);
          if (this.fogRenderer) {
            rect.setAlpha(this.fogRenderer.getTileAlpha(x, y));
          }
          this.tileSpriteMap.set(key, rect);
        } else if (this.fogRenderer) {
          const rect = this.tileSpriteMap.get(key)!;
          rect.setAlpha(this.fogRenderer.getTileAlpha(x, y));
        }
      }
    }

    // Remove tiles that scrolled out of view
    for (const [key, rect] of this.tileSpriteMap) {
      if (!visible.has(key)) {
        rect.destroy();
        this.tileSpriteMap.delete(key);
      }
    }
  }

  /** Pan camera to the destination tile. When force=true, always center immediately (enemy turns). */
  private panCameraToUnit(dest: { x: number; y: number }, force = false): void {
    if (this.offsetX !== 0 || this.offsetY !== 0) return; // small map, no scrolling
    const cam = this.cameras.main;
    const tileCenterX = dest.x * TILE_SIZE + TILE_SIZE / 2;
    const tileCenterY = dest.y * TILE_SIZE + TILE_SIZE / 2;

    if (!force) {
      // Check if the tile center is already within the visible viewport
      const margin = TILE_SIZE * 2; // 2-tile margin before we bother panning
      const visibleLeft = cam.scrollX - margin;
      const visibleRight = cam.scrollX + cam.width + margin;
      const visibleTop = cam.scrollY - margin;
      const visibleBottom = cam.scrollY + cam.height + margin;

      if (
        tileCenterX >= visibleLeft &&
        tileCenterX <= visibleRight &&
        tileCenterY >= visibleTop &&
        tileCenterY <= visibleBottom
      ) {
        return; // already visible — don't move the camera
      }
    }

    const targetWorldX = tileCenterX - cam.width / 2;
    const targetWorldY = tileCenterY - cam.height / 2;

    if (force) {
      // Instant scroll + immediate tile update (enemy turns)
      cam.setScroll(targetWorldX, targetWorldY);
      this.updateVisibleTiles();
    } else {
      cam.pan(targetWorldX, targetWorldY, 300, 'Power2');
      this.time.delayedCall(350, () => this.updateVisibleTiles());
    }
  }

  private syncUnitSprites(): void {
    for (const sprite of this.unitSprites.values()) {
      sprite.destroy();
    }
    this.unitSprites.clear();

    for (const unit of this.engine.getAllUnits()) {
      if (!unit.isAlive) {
        continue;
      }
      // Skip enemies on unseen tiles
      if (unit.faction === 'enemy' && !this.engine.isUnitVisibleToPlayer(unit)) {
        continue;
      }
      const color = FACTION_COLORS[unit.faction] ?? 0xffffff;
      const px = this.offsetX + unit.gridX * TILE_SIZE + TILE_SIZE / 2;
      const py = this.offsetY + unit.gridY * TILE_SIZE + TILE_SIZE / 2;

      const body = this.add.rectangle(0, 0, TILE_SIZE - 8, TILE_SIZE - 8, color);
      body.setAlpha(unit.hasActed ? 0.5 : 1);
      const label = this.add
        .text(0, TILE_SIZE / 2 + 2, unit.name.slice(0, 3), {
          fontSize: '10px',
          color: '#ffffff',
          stroke: '#000000',
          strokeThickness: 3,
        })
        .setOrigin(0.5);

      const container = this.add.container(px, py, [body, label]);
      container.setDepth(10);

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
      this.dragDetector.pointerDown(pointer.x, pointer.y);

      const gx = this.screenToGridX(pointer.x);
      const gy = this.screenToGridY(pointer.y);
      if (!this.engine.grid.isInBounds(gx, gy)) {
        if (this.battleMenu.isVisible && !this.isPointerOverMenuText(pointer.x, pointer.y)) {
          this.handleOutsideMenuClick();
        }
        return;
      }
      // Tile click handled on pointerup (after distinguishing click vs drag)
    });

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      this.dragDetector.pointerMove(pointer.x, pointer.y);

      if (this.dragDetector.isDragging) {
        // Don't scroll camera during battle mode or enemy phase
        if (this.inBattleMode || !this.inputEnabled) return;
        const delta = this.dragDetector.computeScrollDelta(pointer.x, pointer.y);
        this.cameras.main.scrollX += delta.dx;
        this.cameras.main.scrollY += delta.dy;
        this.updateVisibleTiles();
        this.drawGridLines();
        return;
      }

      if (
        !this.inputEnabled ||
        !this.engine.turnManager.isPlayerPhase() ||
        this.inBattleMode ||
        this.isAnimatingMovement
      ) {
        return;
      }
      const gx = this.screenToGridX(pointer.x);
      const gy = this.screenToGridY(pointer.y);
      if (!this.engine.grid.isInBounds(gx, gy)) {
        this.pathGraphics.clear();
        return;
      }
      this.handleTileHover(gx, gy);
    });

    this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      this.dragDetector.pointerUp();

      // If it was a click (not a drag), process the tile click
      if (!this.dragDetector.wasDrag) {
        const gx = this.screenToGridX(pointer.x);
        const gy = this.screenToGridY(pointer.y);
        if (this.engine.grid.isInBounds(gx, gy)) {
          this.handleTileClick(gx, gy, pointer.x, pointer.y);
        }
      }
    });
  }

  /** Convert screen x to grid column, accounting for camera scroll+offset. */
  private screenToGridX(screenX: number): number {
    return Math.floor((screenX + this.cameras.main.scrollX - this.offsetX) / TILE_SIZE);
  }

  /** Convert screen y to grid row, accounting for camera scroll+offset. */
  private screenToGridY(screenY: number): number {
    return Math.floor((screenY + this.cameras.main.scrollY - this.offsetY) / TILE_SIZE);
  }

  private handleTileClick(gx: number, gy: number, pointerX: number, pointerY: number): void {
    if (
      !this.inputEnabled ||
      !this.engine.turnManager.isPlayerPhase() ||
      this.inBattleMode ||
      this.isAnimatingMovement
    ) {
      return;
    }

    const clickedUnit = this.engine.getUnit(gx, gy);

    // If menu is open, handle menu/target selection or outside clicks
    if (this.battleMenu.isVisible) {
      if (
        this.battleMenu.state === MenuState.CHOOSE_TARGET ||
        this.battleMenu.state === MenuState.CHOOSE_HEAL_TARGET
      ) {
        this.handleMenuInput(gx, gy, clickedUnit);
      } else if (this.battleMenu.state === MenuState.CHOOSE_ACTION) {
        if (!this.isPointerOverMenuText(pointerX, pointerY)) {
          this.undoMove();
        }
      }
      return;
    }

    // Move selected unit
    if (this.selectedUnit) {
      const range = this.engine.getMoveRange(this.selectedUnit);
      const key = `${String(gx)},${String(gy)}`;
      if (range.has(key) && !clickedUnit) {
        const unitToMove = this.selectedUnit;
        this.preMovePosition = { x: unitToMove.gridX, y: unitToMove.gridY };
        const path = this.engine.findPath(unitToMove, gx, gy);
        if (!path) {
          return;
        }
        this.pathGraphics.clear();
        this.animatePathMovement(unitToMove, path, () => {
          this.engine.moveUnit(unitToMove, gx, gy);
          this.engine.updateFogOfWar();
          this.syncTileColors();
          this.syncUnitSprites();
          unitToMove.state.transition(UNIT_STATE.MOVING);
          // Check move-based objectives (seize/escape)
          const moveObj = this.engine.checkMoveObjective(unitToMove);
          if (moveObj.victory) {
            this.showVictoryScreen();
            return;
          }
          if (moveObj.defeat) {
            this.showDefeatScreen();
            return;
          }
          unitToMove.state.transition(UNIT_STATE.MENU);
          this.showPostMoveMenu(unitToMove);
        });
        return;
      }
    }

    // Auto-attack: selected unit + clicked enemy within movement+attack range
    if (this.selectedUnit && clickedUnit?.faction === Faction.ENEMY) {
      const attackSquare = this.engine.findBestAttackSquare(this.selectedUnit, clickedUnit);
      if (attackSquare) {
        const unitToMove = this.selectedUnit;
        this.clearEnemyPreview();
        if (attackSquare.x === unitToMove.gridX && attackSquare.y === unitToMove.gridY) {
          // Already in range — enter target selection without moving
          unitToMove.state.transition(UNIT_STATE.MOVING);
          unitToMove.state.transition(UNIT_STATE.MENU);
          this.preMovePosition = null;
          this.enterAutoAttackMode(unitToMove, clickedUnit);
        } else {
          this.preMovePosition = { x: unitToMove.gridX, y: unitToMove.gridY };
          const path = this.engine.findPath(unitToMove, attackSquare.x, attackSquare.y);
          if (!path) {
            return;
          }
          this.pathGraphics.clear();
          this.animatePathMovement(unitToMove, path, () => {
            this.engine.moveUnit(unitToMove, attackSquare.x, attackSquare.y);
            this.engine.updateFogOfWar();
            this.syncTileColors();
            this.syncUnitSprites();
            unitToMove.state.transition(UNIT_STATE.MOVING);
            const moveObj = this.engine.checkMoveObjective(unitToMove);
            if (moveObj.victory) {
              this.showVictoryScreen();
              return;
            }
            if (moveObj.defeat) {
              this.showDefeatScreen();
              return;
            }
            unitToMove.state.transition(UNIT_STATE.MENU);
            this.enterAutoAttackMode(unitToMove, clickedUnit);
          });
        }
        return;
      }
      // Fall through to enemy preview if unreachable
    }

    // If clicking on already-selected unit, open menu without moving
    if (clickedUnit && clickedUnit === this.selectedUnit && !clickedUnit.hasActed) {
      this.moveGraphics.clear();
      clickedUnit.state.transition(UNIT_STATE.MOVING);
      clickedUnit.state.transition(UNIT_STATE.MENU);
      this.preMovePosition = null;
      this.showPostMoveMenu(clickedUnit);
      return;
    }

    // Select a fresh player unit
    if (clickedUnit && clickedUnit.isPlayer && !clickedUnit.hasActed) {
      this.selectedUnit = clickedUnit;
      this.showMoveRange(clickedUnit);
      return;
    }

    // Show enemy preview when clicking an enemy tile
    if (clickedUnit?.faction === Faction.ENEMY) {
      this.showEnemyPreview(clickedUnit);
      return;
    }

    // Clicking elsewhere clears any active enemy preview
    if (this.enemyPreview.isActive) {
      this.clearEnemyPreview();
    }
    this.updateSaveBtnVisibility();
  }

  private handleTileHover(gx: number, gy: number): void {
    // Combat preview during target selection
    if (this.battleMenu.state === MenuState.CHOOSE_TARGET && this.battleMenu.unit) {
      if (this.combatPreviewConfirmMode) return;
      const hoveredUnit = this.engine.getUnit(gx, gy);
      const validTarget = this.battleMenu.adjacentEnemies.find((e) => e.id === hoveredUnit?.id);
      if (validTarget) {
        this.showCombatPreview(this.battleMenu.unit, validTarget);
      } else {
        this.hideCombatPreview();
      }
      return;
    }

    if (!this.selectedUnit || this.battleMenu.isVisible) {
      this.pathGraphics.clear();
      return;
    }

    // Show path to best attack square when hovering over a reachable enemy
    const hoveredUnit = this.engine.getUnit(gx, gy);
    if (hoveredUnit && hoveredUnit.faction === Faction.ENEMY) {
      const attackSquare = this.engine.findBestAttackSquare(this.selectedUnit, hoveredUnit);
      if (attackSquare && !(attackSquare.x === this.selectedUnit.gridX && attackSquare.y === this.selectedUnit.gridY)) {
        const path = this.engine.findPath(this.selectedUnit, attackSquare.x, attackSquare.y);
        if (path) {
          this.drawPathPreview(path);
          return;
        }
      }
      this.pathGraphics.clear();
      return;
    }

    const range = this.engine.getMoveRange(this.selectedUnit);
    const key = `${String(gx)},${String(gy)}`;
    if (!range.has(key) || this.engine.getUnit(gx, gy)) {
      this.pathGraphics.clear();
      return;
    }
    const path = this.engine.findPath(this.selectedUnit, gx, gy);
    if (path) {
      this.drawPathPreview(path);
    } else {
      this.pathGraphics.clear();
    }
  }

  private drawPathPreview(path: import('../game/map/Grid').GridNeighbor[]): void {
    this.pathGraphics.clear();
    if (path.length === 0 || !this.selectedUnit) {
      return;
    }

    this.pathGraphics.lineStyle(3, 0xffffff, 0.8);
    const startX = this.offsetX + this.selectedUnit.gridX * TILE_SIZE + TILE_SIZE / 2;
    const startY = this.offsetY + this.selectedUnit.gridY * TILE_SIZE + TILE_SIZE / 2;
    this.pathGraphics.beginPath();
    this.pathGraphics.moveTo(startX, startY);

    for (const step of path) {
      const px = this.offsetX + step.x * TILE_SIZE + TILE_SIZE / 2;
      const py = this.offsetY + step.y * TILE_SIZE + TILE_SIZE / 2;
      this.pathGraphics.lineTo(px, py);
    }
    this.pathGraphics.strokePath();

    // Draw arrowhead at destination
    const dest = path[path.length - 1];
    const dx = this.offsetX + dest.x * TILE_SIZE + TILE_SIZE / 2;
    const dy = this.offsetY + dest.y * TILE_SIZE + TILE_SIZE / 2;
    this.pathGraphics.fillStyle(0xffffff, 0.9);
    this.pathGraphics.fillCircle(dx, dy, 4);
  }

  private animatePathMovement(
    unit: Unit,
    path: import('../game/map/Grid').GridNeighbor[],
    onComplete: () => void,
  ): void {
    const sprite = this.unitSprites.get(unit.id);
    if (!sprite) {
      this.isAnimatingMovement = false;
      onComplete();
      return;
    }

    this.isAnimatingMovement = true;

    // Pan camera to keep unit visible during movement
    this.panCameraToUnit(path[path.length - 1]);

    let stepIndex = 0;
    const processStep = () => {
      if (stepIndex >= path.length) {
        this.isAnimatingMovement = false;
        onComplete();
        this.updateSaveBtnVisibility();
        return;
      }
      const step = path[stepIndex];
      const targetX = this.offsetX + step.x * TILE_SIZE + TILE_SIZE / 2;
      const targetY = this.offsetY + step.y * TILE_SIZE + TILE_SIZE / 2;
      this.tweens.add({
        targets: sprite,
        x: targetX,
        y: targetY,
        duration: 150,
        ease: 'Linear',
        onComplete: () => {
          stepIndex++;
          processStep();
        },
      });
    };
    processStep();
  }

  private showMoveRange(unit: Unit): void {
    this.moveGraphics.clear();
    this.pathGraphics.clear();
    const range = this.engine.getMoveRange(unit);
    const threatened = this.engine.getThreatenedTiles(unit);

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

    threatened.forEach((key) => {
      if (range.has(key)) {
        return;
      }
      const [x, y] = key.split(',').map(Number);
      this.moveGraphics.fillStyle(0xe74c3c, 0.35);
      this.moveGraphics.fillRect(
        this.offsetX + x * TILE_SIZE,
        this.offsetY + y * TILE_SIZE,
        TILE_SIZE,
        TILE_SIZE,
      );
    });
  }

  private showEnemyPreview(unit: Unit): void {
    if (!this.engine.isUnitVisibleToPlayer(unit)) {
      return;
    }

    this.moveGraphics.clear();
    this.clearEnemyPreviewTexts();
    this.selectedUnit = null;

    // Compute threat against currently selected player unit if any
    const playerUnits = this.engine
      .getUnitsByFaction(Faction.PLAYER)
      .filter((u) => u.isAlive && !u.hasActed);
    let threat = null;
    if (playerUnits.length > 0) {
      const target = playerUnits[0];
      const preview = this.engine.getCombatPreview(unit, target);
      threat = {
        hit: preview.attacker.hit,
        crit: preview.attacker.crit,
        damage: preview.attacker.damage,
        doubleAttack: preview.attacker.doubleAttack,
      };
    }
    this.enemyPreview.show(unit, threat ?? undefined);

    const range = this.engine.getMoveRange(unit);
    const threatened = this.engine.getThreatenedTiles(unit);

    range.forEach((_cost, key) => {
      const [x, y] = key.split(',').map(Number);
      this.moveGraphics.fillStyle(0xf39c12, 0.4);
      this.moveGraphics.fillRect(
        this.offsetX + x * TILE_SIZE,
        this.offsetY + y * TILE_SIZE,
        TILE_SIZE,
        TILE_SIZE,
      );
    });

    threatened.forEach((key) => {
      if (range.has(key)) {
        return;
      }
      const [x, y] = key.split(',').map(Number);
      this.moveGraphics.fillStyle(0xe74c3c, 0.35);
      this.moveGraphics.fillRect(
        this.offsetX + x * TILE_SIZE,
        this.offsetY + y * TILE_SIZE,
        TILE_SIZE,
        TILE_SIZE,
      );
    });

    // Render threat stats tooltip near the enemy
    if (threat) {
      const px = this.offsetX + unit.gridX * TILE_SIZE + TILE_SIZE / 2;
      const py = this.offsetY + unit.gridY * TILE_SIZE - TILE_SIZE;
      const lines = [
        `${unit.name} | ${unit.unitClass}`,
        `Hit ${threat.hit.toString()}%  Crit ${threat.crit.toString()}%  Dmg ${threat.damage.toString()}${threat.doubleAttack ? ' (2x)' : ''}`,
      ];
      const bg = this.add.rectangle(px, py - 10, 220, 44, 0x000000, 0.8);
      bg.setOrigin(0.5);
      this.enemyPreviewTexts.push(bg);

      const text = this.add
        .text(px, py - 10, lines.join('\n'), {
          fontSize: '12px',
          color: '#ecf0f1',
          align: 'center',
        })
        .setOrigin(0.5);
      this.enemyPreviewTexts.push(text);
    }
  }

  private clearEnemyPreviewTexts(): void {
    for (const text of this.enemyPreviewTexts) {
      text.destroy();
    }
    this.enemyPreviewTexts = [];
  }

  private clearEnemyPreview(): void {
    this.enemyPreview.clear();
    this.moveGraphics.clear();
    this.pathGraphics.clear();
    this.clearEnemyPreviewTexts();
  }

  private createUI(): void {
    this.phaseText = this.add
      .text(16, 16, 'Phase: Player', {
        fontSize: '20px',
        color: '#ecf0f1',
        backgroundColor: '#2c3e50',
        padding: { x: 10, y: 6 },
      })
      .setScrollFactor(0)
      .setDepth(100);

    this.endTurnBtn = this.add
      .text(16, 60, '[ End Turn ]', {
        fontSize: '16px',
        color: '#ecf0f1',
        backgroundColor: '#c0392b',
        padding: { x: 10, y: 6 },
      })
      .setScrollFactor(0)
      .setInteractive({ useHandCursor: true })
      .setDepth(100);

    this.endTurnBtn.on('pointerdown', () => {
      if (!this.inputEnabled) return;
      if (!this.engine.turnManager.isPlayerPhase()) return;
      this.triggerEndTurn();
    });

    this.menuBtn = this.add
      .text(16, 96, '[ Menu ]', {
        fontSize: '16px',
        color: '#ecf0f1',
        backgroundColor: '#2c3e50',
        padding: { x: 10, y: 6 },
      })
      .setScrollFactor(0)
      .setInteractive({ useHandCursor: true })
      .setDepth(100);

    this.menuBtn.on('pointerover', () => this.menuBtn!.setStyle({ color: '#f1c40f' }));
    this.menuBtn.on('pointerout', () => this.menuBtn!.setStyle({ color: '#ecf0f1' }));
    this.menuBtn.on('pointerdown', () => {
      if (!this.inputEnabled) return;
      this.showMenuConfirmation();
    });

    this.saveBtn = this.add
      .text(this.cameras.main.width - 20, 20, '[ Save ]', {
        fontSize: '18px',
        color: '#ecf0f1',
        backgroundColor: '#2c3e50',
        padding: { x: 12, y: 6 },
      })
      .setOrigin(1, 0)
      .setInteractive({ useHandCursor: true })
      .setScrollFactor(0)
      .setDepth(10);

    this.saveBtn.on('pointerover', () => this.saveBtn!.setStyle({ color: '#f1c40f' }));
    this.saveBtn.on('pointerout', () => this.saveBtn!.setStyle({ color: '#ecf0f1' }));
    this.saveBtn.on(
      'pointerdown',
      (_p: Phaser.Input.Pointer, _lx: number, _ly: number, event: Phaser.Types.Input.EventData) => {
        event.stopPropagation();
        this.openSaveMenu();
      },
    );

    this.goldText = this.add
      .text(this.cameras.main.width - 16, 56, `G: ${this.engine.gold.amount}`, {
        fontSize: '14px',
        color: '#f1c40f',
        fontStyle: 'bold',
      })
      .setOrigin(1, 0)
      .setScrollFactor(0);
  }

  private updatePhaseText(): void {
    this.phaseText.setText(
      `Phase: ${this.engine.turnManager.isPlayerPhase() ? 'Player' : 'Enemy'}`,
    );
  }

  private updateGoldDisplay(): void {
    if (this.goldText) {
      this.goldText.setText(`G: ${this.engine.gold.amount}`);
    }
  }

  private updateSaveBtnVisibility(): void {
    const canInteract =
      this.engine.turnManager.isPlayerPhase() &&
      !this.inBattleMode &&
      !this.battleMenu.isVisible &&
      !this.isAnimatingMovement &&
      !this.levelUpSequence &&
      !this.promotionSequence &&
      !this.statusOverlay &&
      !this.itemOverlay &&
      !this.tradeOverlay;
    if (this.saveBtn) {
      this.saveBtn.setVisible(canInteract);
    }
    if (this.endTurnBtn) {
      this.endTurnBtn.setVisible(canInteract);
    }
    const menuVisible =
      this.engine.turnManager.isPlayerPhase() &&
      !this.inBattleMode &&
      !this.isAnimatingMovement &&
      !this.levelUpSequence &&
      !this.promotionSequence &&
      !this.statusOverlay &&
      !this.itemOverlay &&
      !this.tradeOverlay &&
      !this.menuConfirmationOverlay;
    if (this.menuBtn) {
      this.menuBtn.setVisible(menuVisible);
    }
  }

  private triggerEndTurn(): void {
    if (this.inBattleMode || this.isAnimatingMovement) {
      return;
    }
    if (!this.engine.turnManager.isPlayerPhase()) {
      return;
    }

    this.selectedUnit = null;
    this.moveGraphics.clear();
    this.pathGraphics.clear();
    this.enemyPreview.clear();
    this.battleMenu.reset();
    this.clearMenuTexts();
    this.tradeOverlay?.destroy();
    this.tradeOverlay = null;
    this.tradeMenu.close();
    const report = this.engine.endTurn();
    this.showHazardDamage(report);
    this.engine.removeDeadUnits();
    this.syncUnitSprites();
    this.updatePhaseText();

    this.playCutsceneIfTriggered({ eventType: 'on_turn_end', faction: 'player' }, () => {
      if (this.engine.turnManager.isEnemyPhase()) {
        this.inputEnabled = false;
        this.executeEnemyActions(() => {
          const objectives = this.engine.checkObjectives();
          if (objectives.victory) {
            this.showVictoryScreen();
            return;
          }
          if (objectives.defeat) {
            this.showDefeatScreen();
            return;
          }

          const report1 = this.engine.endTurn(); // Enemy → Ally
          this.showHazardDamage(report1);
          this.engine.removeDeadUnits();
          this.syncUnitSprites();
          this.updatePhaseText();
          this.playCutsceneIfTriggered({ eventType: 'on_turn_end', faction: 'enemy' }, () => {
            // Execute ally actions
            this.executeAllyActions(() => {
              const objectives2 = this.engine.checkObjectives();
              if (objectives2.victory) {
                this.showVictoryScreen();
                return;
              }
              if (objectives2.defeat) {
                this.showDefeatScreen();
                return;
              }
              const report2 = this.engine.endTurn(); // Ally → Player
              this.showHazardDamage(report2);
              this.engine.removeDeadUnits();
              this.syncUnitSprites();
              this.updatePhaseText();
              this.playCutsceneIfTriggered({ eventType: 'on_turn_end', faction: 'ally' }, () => {
                this.beginPlayerPhase();
              });
            });
          });
        });
      } else if (this.engine.turnManager.isPlayerPhase()) {
        this.beginPlayerPhase();
      }
      this.updateSaveBtnVisibility();
    });
  }

  private showHazardDamage(
    report: import('../game/hazards/TerrainHazardEngine').HazardReport,
  ): void {
    for (const entry of report.damagedUnits) {
      const px = this.offsetX + entry.unit.gridX * TILE_SIZE + TILE_SIZE / 2;
      const py = this.offsetY + entry.unit.gridY * TILE_SIZE + TILE_SIZE / 2;
      const text = this.add
        .text(px, py - 10, `-${entry.damage.toString()}`, {
          fontSize: '14px',
          color: '#ff4500',
          stroke: '#000000',
          strokeThickness: 3,
        })
        .setOrigin(0.5);

      this.tweens.add({
        targets: text,
        y: py - 40,
        alpha: 0,
        duration: 1200,
        ease: 'Power2',
        onComplete: () => {
          text.destroy();
        },
      });
    }
  }

  private checkAutoEndTurn(): void {
    if (this.engine.allPlayerUnitsExhausted()) {
      this.time.delayedCall(400, () => {
        if (!this.engine.turnManager.isPlayerPhase()) {
          return;
        }
        this.triggerEndTurn();
      });
    }
  }

  private executeEnemyActions(onComplete: () => void): void {
    this.playCutsceneIfTriggered({ eventType: 'on_turn_start', faction: 'enemy' }, () => {
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
          const moveX = action.x;
          const moveY = action.y;
          if (sprite) {
            this.isAnimatingMovement = true;
            // Pan camera to follow enemy movement
            this.panCameraToUnit({ x: moveX, y: moveY }, true);
            const onMoveComplete = () => {
              this.isAnimatingMovement = false;
              this.engine.moveUnit(action.actor, moveX, moveY);
              this.engine.updateFogOfWar();
              this.syncTileColors();
              this.syncUnitSprites();
              processNext(index + 1);
            };
            if (action.path && action.path.length > 0) {
              let stepIndex = 0;
              const processStep = () => {
                if (stepIndex >= action.path!.length) {
                  onMoveComplete();
                  return;
                }
                const step = action.path![stepIndex];
                const targetX = this.offsetX + step.x * TILE_SIZE + TILE_SIZE / 2;
                const targetY = this.offsetY + step.y * TILE_SIZE + TILE_SIZE / 2;
                this.tweens.add({
                  targets: sprite,
                  x: targetX,
                  y: targetY,
                  duration: 150,
                  ease: 'Linear',
                  onComplete: () => {
                    stepIndex++;
                    processStep();
                  },
                });
              };
              processStep();
            } else {
              const targetX = this.offsetX + moveX * TILE_SIZE + TILE_SIZE / 2;
              const targetY = this.offsetY + moveY * TILE_SIZE + TILE_SIZE / 2;
              this.tweens.add({
                targets: sprite,
                x: targetX,
                y: targetY,
                duration: 300,
                onComplete: onMoveComplete,
              });
            }
          } else {
            processNext(index + 1);
          }
        } else if (
          action.type === 'attack' &&
          action.targetX !== undefined &&
          action.targetY !== undefined
        ) {
          const target = this.engine.getUnit(action.targetX, action.targetY);
          if (target?.isAlive) {
            this.playCutsceneIfTriggered(
              { eventType: 'on_attack', attackerId: action.actor.id, defenderId: target.id },
              () => {
                this.startBattleMode(action.actor, target, () => {
                  processNext(index + 1);
                });
              },
            );
          } else {
            processNext(index + 1);
          }
        } else {
          processNext(index + 1);
        }
      };

      processNext(0);
    });
  }

  private executeAllyActions(onComplete: () => void): void {
    this.playCutsceneIfTriggered({ eventType: 'on_turn_start', faction: 'ally' }, () => {
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
          const moveX = action.x;
          const moveY = action.y;
          if (sprite) {
            this.isAnimatingMovement = true;
            this.panCameraToUnit({ x: moveX, y: moveY }, true);
            const onMoveComplete = () => {
              this.isAnimatingMovement = false;
              this.engine.moveUnit(action.actor, moveX, moveY);
              this.engine.updateFogOfWar();
              this.syncTileColors();
              this.syncUnitSprites();
              processNext(index + 1);
            };
            if (action.path && action.path.length > 0) {
              let stepIndex = 0;
              const processStep = () => {
                if (stepIndex >= action.path!.length) {
                  onMoveComplete();
                  return;
                }
                const step = action.path![stepIndex];
                const targetX = this.offsetX + step.x * TILE_SIZE + TILE_SIZE / 2;
                const targetY = this.offsetY + step.y * TILE_SIZE + TILE_SIZE / 2;
                this.tweens.add({
                  targets: sprite,
                  x: targetX,
                  y: targetY,
                  duration: 150,
                  ease: 'Linear',
                  onComplete: () => {
                    stepIndex++;
                    processStep();
                  },
                });
              };
              processStep();
            } else {
              const targetX = this.offsetX + moveX * TILE_SIZE + TILE_SIZE / 2;
              const targetY = this.offsetY + moveY * TILE_SIZE + TILE_SIZE / 2;
              this.tweens.add({
                targets: sprite,
                x: targetX,
                y: targetY,
                duration: 300,
                onComplete: onMoveComplete,
              });
            }
          } else {
            processNext(index + 1);
          }
        } else if (
          action.type === 'attack' &&
          action.targetX !== undefined &&
          action.targetY !== undefined
        ) {
          const target = this.engine.getUnit(action.targetX, action.targetY);
          if (target?.isAlive) {
            this.playCutsceneIfTriggered(
              { eventType: 'on_attack', attackerId: action.actor.id, defenderId: target.id },
              () => {
                this.startBattleMode(action.actor, target, () => {
                  processNext(index + 1);
                });
              },
            );
          } else {
            processNext(index + 1);
          }
        } else {
          processNext(index + 1);
        }
      };

      processNext(0);
    });
  }

  private showPostMoveMenu(unit: Unit): void {
    this.moveGraphics.clear();
    this.pathGraphics.clear();
    this.selectedUnit = null;

    const enemies = this.engine.getAdjacentEnemies(unit);
    const allies = this.engine.getAdjacentAllies(unit);

    const px = this.offsetX + unit.gridX * TILE_SIZE + TILE_SIZE / 2;
    const py = this.offsetY + unit.gridY * TILE_SIZE - TILE_SIZE;

    const staff = this.engine.getStaffForUnit(unit);
    const healTargets = staff ? this.engine.getHealTargets(unit) : [];
    const hasStaff = staff !== null && healTargets.length > 0;

    this.battleMenu.show(unit, enemies, healTargets, allies);

    const fightText = this.add
      .text(px, py, '[ Fight ]', {
        fontSize: '21px',
        color: '#ffffff',
        backgroundColor: enemies.length > 0 ? '#c0392b' : '#7f8c8d',
        padding: { x: 12, y: 6 },
      })
      .setOrigin(0.5)
      .setDepth(100)
      .setInteractive({ useHandCursor: enemies.length > 0 });

    if (enemies.length > 0) {
      fightText.on(
        'pointerdown',
        (
          _pointer: Phaser.Input.Pointer,
          _localX: number,
          _localY: number,
          event: Phaser.Types.Input.EventData,
        ) => {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-call
          event.stopPropagation();
          this.battleMenu.selectAction(MenuAction.FIGHT);
          this.clearMenuTexts();
          if (this.battleMenu.state === MenuState.CHOOSE_WEAPON) {
            this.showWeaponSelection(unit);
          } else {
            this.highlightEnemyTargets(enemies);
          }
        },
      );
    }

    const baseY = hasStaff ? 36 : 0;

    let staffText: Phaser.GameObjects.Text | null = null;
    if (hasStaff) {
      staffText = this.add
        .text(px, py + 36, '[ Staff ]', {
          fontSize: '21px',
          color: '#ffffff',
          backgroundColor: '#27ae60',
          padding: { x: 12, y: 6 },
        })
        .setOrigin(0.5)
        .setDepth(100)
        .setInteractive({ useHandCursor: true });
      staffText.on(
        'pointerdown',
        (
          _pointer: Phaser.Input.Pointer,
          _localX: number,
          _localY: number,
          event: Phaser.Types.Input.EventData,
        ) => {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-call
          event.stopPropagation();
          this.battleMenu.selectAction(MenuAction.STAFF);
          this.clearMenuTexts();
          this.highlightHealTargets(healTargets);
        },
      );
    }

    const statusText = this.add
      .text(px, py + 36 + baseY, '[ Status ]', {
        fontSize: '21px',
        color: '#ffffff',
        backgroundColor: '#27ae60',
        padding: { x: 12, y: 6 },
      })
      .setOrigin(0.5)
      .setDepth(100)
      .setInteractive({ useHandCursor: true });

    statusText.on(
      'pointerdown',
      (
        _pointer: Phaser.Input.Pointer,
        _localX: number,
        _localY: number,
        event: Phaser.Types.Input.EventData,
      ) => {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call
        event.stopPropagation();
        this.battleMenu.selectAction(MenuAction.STATUS);
        this.clearMenuTexts();
        this.showStatusWindow(unit);
      },
    );

    const itemsText = this.add
      .text(px, py + 72 + baseY, '[ Items ]', {
        fontSize: '21px',
        color: '#ffffff',
        backgroundColor: '#8e44ad',
        padding: { x: 12, y: 6 },
      })
      .setOrigin(0.5)
      .setDepth(100)
      .setInteractive({ useHandCursor: true });

    itemsText.on(
      'pointerdown',
      (
        _pointer: Phaser.Input.Pointer,
        _localX: number,
        _localY: number,
        event: Phaser.Types.Input.EventData,
      ) => {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call
        event.stopPropagation();
        this.battleMenu.selectAction(MenuAction.ITEMS);
        this.clearMenuTexts();
        this.showItemMenu(unit);
      },
    );

    const tradeText = this.add
      .text(px, py + 108 + baseY, '[ Trade ]', {
        fontSize: '21px',
        color: '#ffffff',
        backgroundColor: allies.length > 0 ? '#f39c12' : '#7f8c8d',
        padding: { x: 12, y: 6 },
      })
      .setOrigin(0.5)
      .setDepth(100)
      .setInteractive({ useHandCursor: allies.length > 0 });

    if (allies.length > 0) {
      tradeText.on(
        'pointerdown',
        (
          _pointer: Phaser.Input.Pointer,
          _localX: number,
          _localY: number,
          event: Phaser.Types.Input.EventData,
        ) => {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-call
          event.stopPropagation();
          this.battleMenu.selectAction(MenuAction.TRADE);
          this.clearMenuTexts();
          this.showTradeTargetSelection(unit, allies);
        },
      );
    }

    const endText = this.add
      .text(px, py + 108 + baseY + (allies.length > 0 ? 36 : 0), '[ End Turn ]', {
        fontSize: '21px',
        color: '#ffffff',
        backgroundColor: '#2c3e50',
        padding: { x: 12, y: 6 },
      })
      .setOrigin(0.5)
      .setDepth(100)
      .setInteractive({ useHandCursor: true });

    endText.on(
      'pointerdown',
      (
        _pointer: Phaser.Input.Pointer,
        _localX: number,
        _localY: number,
        event: Phaser.Types.Input.EventData,
      ) => {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call
        event.stopPropagation();
        this.battleMenu.reset();
        unit.state.transition(UNIT_STATE.EXHAUSTED);
        this.clearMenuTexts();
        this.syncUnitSprites();
        this.checkAutoEndTurn();
      },
    );

    const texts: Phaser.GameObjects.Text[] = [fightText, endText, statusText, itemsText];
    if (staffText) {
      texts.splice(1, 0, staffText);
    }
    if (allies.length > 0) {
      texts.splice(texts.indexOf(endText), 0, tradeText);
    } else {
      tradeText.destroy();
    }
    this.menuTexts.push(...texts);
    this.updateSaveBtnVisibility();
  }

  private enterAutoAttackMode(unit: Unit, _targetEnemy: Unit): void {
    this.moveGraphics.clear();
    this.pathGraphics.clear();
    this.selectedUnit = null;

    const enemies = this.engine.getAdjacentEnemies(unit);
    const allies = this.engine.getAdjacentAllies(unit);
    const staff = this.engine.getStaffForUnit(unit);
    const healTargets = staff ? this.engine.getHealTargets(unit) : [];

    this.battleMenu.show(unit, enemies, healTargets, allies);
    this.battleMenu.selectAction(MenuAction.FIGHT);

    if (this.battleMenu.state === MenuState.CHOOSE_WEAPON) {
      this.showWeaponSelection(unit);
    } else {
      this.highlightEnemyTargets(enemies);
    }

    this.updateSaveBtnVisibility();
  }

  private showTradeTargetSelection(unit: Unit, allies: Unit[]): void {
    this.inputEnabled = false;
    const overlay = this.add.container(0, 0);
    this.tradeOverlay = overlay;
    const bg = this.add.rectangle(
      this.cameras.main.width / 2,
      this.cameras.main.height / 2,
      this.cameras.main.width,
      this.cameras.main.height,
      0x000000,
      0.7,
    );
    overlay.add(bg);

    const titleText = this.add
      .text(this.cameras.main.width / 2, this.cameras.main.height * 0.2, 'Trade with', {
        fontSize: '24px',
        color: '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    overlay.add(titleText);

    for (let i = 0; i < allies.length; i++) {
      const ally = allies[i];
      const y = this.cameras.main.height * 0.35 + i * 48;
      const allyText = this.add
        .text(this.cameras.main.width / 2, y, ally.name, {
          fontSize: '18px',
          color: '#ffffff',
          backgroundColor: '#f39c12',
          padding: { x: 12, y: 6 },
        })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true });
      allyText.on('pointerdown', () => {
        this.battleMenu.selectTradeTarget(ally);
        this.tradeOverlay?.destroy();
        this.tradeOverlay = null;
        this.showTradeMenu(unit, ally);
      });
      overlay.add(allyText);
    }

    const cancelText = this.add
      .text(this.cameras.main.width / 2, this.cameras.main.height * 0.8, '[ Cancel ]', {
        fontSize: '16px',
        color: '#ffffff',
        backgroundColor: '#e74c3c',
        padding: { x: 12, y: 6 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    cancelText.on('pointerdown', () => {
      this.battleMenu.cancelTradeSelection();
      this.tradeOverlay?.destroy();
      this.tradeOverlay = null;
      this.inputEnabled = true;
      this.showPostMoveMenu(unit);
    });
    overlay.add(cancelText);
  }

  private showTradeMenu(leftUnit: Unit, rightUnit: Unit): void {
    this.tradeMenu.open(leftUnit, rightUnit);
    this.inputEnabled = false;
    const overlay = this.add.container(0, 0);
    this.tradeOverlay = overlay;
    const bg = this.add.rectangle(
      this.cameras.main.width / 2,
      this.cameras.main.height / 2,
      this.cameras.main.width,
      this.cameras.main.height,
      0x000000,
      0.7,
    );
    overlay.add(bg);

    const leftPanelX = this.cameras.main.width * 0.25;
    const rightPanelX = this.cameras.main.width * 0.75;
    const panelY = this.cameras.main.height * 0.5;

    const leftTitle = this.add
      .text(leftPanelX, panelY - 140, leftUnit.name, {
        fontSize: '18px',
        color: '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    overlay.add(leftTitle);

    const rightTitle = this.add
      .text(rightPanelX, panelY - 140, rightUnit.name, {
        fontSize: '18px',
        color: '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    overlay.add(rightTitle);

    const executeTradeOp = (leftIdx: number, rightIdx: number): boolean => {
      const result = this.engine.executeTrade(leftUnit, leftIdx, rightUnit, rightIdx);
      if (result.success) {
        this.tradeMenu.clearSelections();
        this.updateGoldDisplay();
        return true;
      }
      return false;
    };

    const handleTradeDone = (): void => {
      this.tradeMenu.close();
      this.tradeOverlay?.destroy();
      this.tradeOverlay = null;
      this.inputEnabled = true;
      this.updateGoldDisplay();
      // Trade counts as an action — exhaust the unit
      this.battleMenu.reset();
      leftUnit.state.transition(UNIT_STATE.EXHAUSTED);
      this.clearMenuTexts();
      this.syncUnitSprites();
      this.checkAutoEndTurn();
    };

    const cancelTrade = (): void => {
      this.tradeMenu.close();
      this.tradeOverlay?.destroy();
      this.tradeOverlay = null;
      this.inputEnabled = true;
      this.showPostMoveMenu(leftUnit);
    };

    const refreshTradeOverlay = (): void => {
      // Remove existing item texts and buttons from overlay (keep bg, titles)
      const toRemove = overlay.list.filter(
        (obj) => obj !== bg && obj !== leftTitle && obj !== rightTitle,
      );
      for (const obj of toRemove) {
        obj.destroy();
      }

      const leftSelected = this.tradeMenu.selectedLeftIndex;
      const rightSelected = this.tradeMenu.selectedRightIndex;
      const hasLeftSelection = leftSelected >= 0;
      const hasRightSelection = rightSelected >= 0;

      // Left panel items
      for (let i = 0; i < leftUnit.inventory.items.length; i++) {
        const item = leftUnit.inventory.items[i];
        const y = panelY - 100 + i * 36;
        const isSelected = leftSelected === i;
        const itemText = this.add
          .text(leftPanelX, y, item.name, {
            fontSize: '14px',
            color: isSelected ? '#f1c40f' : '#ffffff',
            backgroundColor: isSelected ? '#f39c12' : '#2c3e50',
            padding: { x: 8, y: 4 },
          })
          .setOrigin(0.5)
          .setInteractive({ useHandCursor: true });
        itemText.on('pointerdown', () => {
          // If right item selected, swap the two selected items
          if (hasRightSelection) {
            const ri = rightSelected;
            this.tradeMenu.clearSelections();
            executeTradeOp(i, ri);
            refreshTradeOverlay();
          } else {
            this.tradeMenu.selectLeftItem(i);
            refreshTradeOverlay();
          }
        });
        overlay.add(itemText);
      }

      // Right panel items
      for (let i = 0; i < rightUnit.inventory.items.length; i++) {
        const item = rightUnit.inventory.items[i];
        const y = panelY - 100 + i * 36;
        const isSelected = rightSelected === i;
        const itemText = this.add
          .text(rightPanelX, y, item.name, {
            fontSize: '14px',
            color: isSelected ? '#f1c40f' : '#ffffff',
            backgroundColor: isSelected ? '#f39c12' : '#2c3e50',
            padding: { x: 8, y: 4 },
          })
          .setOrigin(0.5)
          .setInteractive({ useHandCursor: true });
        itemText.on('pointerdown', () => {
          // If left item selected, swap the two selected items
          if (hasLeftSelection) {
            const li = leftSelected;
            this.tradeMenu.clearSelections();
            executeTradeOp(li, i);
            refreshTradeOverlay();
          } else {
            this.tradeMenu.selectRightItem(i);
            refreshTradeOverlay();
          }
        });
        overlay.add(itemText);
      }

      // Directional action buttons
      if (hasLeftSelection && hasRightSelection) {
        // Both selected → show Swap button
        const swapBtn = this.add
          .text(this.cameras.main.width / 2, panelY + 70, '[ \u21C4 Swap ]', {
            fontSize: '14px',
            color: '#ffffff',
            backgroundColor: '#3498db',
            padding: { x: 10, y: 5 },
          })
          .setOrigin(0.5)
          .setInteractive({ useHandCursor: true });
        swapBtn.on('pointerdown', () => {
          const li = leftSelected;
          const ri = rightSelected;
          this.tradeMenu.clearSelections();
          executeTradeOp(li, ri);
          refreshTradeOverlay();
        });
        overlay.add(swapBtn);
      } else if (hasLeftSelection) {
        // Left selected → show Give → button
        const giveRightBtn = this.add
          .text(rightPanelX, panelY + 70, '[ \u2190 Give ]', {
            fontSize: '14px',
            color: '#ffffff',
            backgroundColor: '#27ae60',
            padding: { x: 10, y: 5 },
          })
          .setOrigin(0.5)
          .setInteractive({ useHandCursor: true });
        giveRightBtn.on('pointerdown', () => {
          const li = leftSelected;
          this.tradeMenu.clearSelections();
          executeTradeOp(li, -1);
          refreshTradeOverlay();
        });
        overlay.add(giveRightBtn);
      } else if (hasRightSelection) {
        // Right selected → show ← Give button
        const giveLeftBtn = this.add
          .text(rightPanelX, panelY + 70, '[ \u2190 Give ]', {
            fontSize: '14px',
            color: '#ffffff',
            backgroundColor: '#27ae60',
            padding: { x: 10, y: 5 },
          })
          .setOrigin(0.5)
          .setInteractive({ useHandCursor: true });
        giveLeftBtn.on('pointerdown', () => {
          const ri = rightSelected;
          this.tradeMenu.clearSelections();
          executeTradeOp(-1, ri);
          refreshTradeOverlay();
        });
        overlay.add(giveLeftBtn);
      }

      // Done button
      const doneText = this.add
        .text(this.cameras.main.width / 2 - 80, this.cameras.main.height * 0.85, '[ Done ]', {
          fontSize: '16px',
          color: '#ffffff',
          backgroundColor: '#27ae60',
          padding: { x: 12, y: 6 },
        })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true });
      doneText.on('pointerdown', () => handleTradeDone());
      overlay.add(doneText);

      // Cancel button
      const cancelText = this.add
        .text(this.cameras.main.width / 2 + 80, this.cameras.main.height * 0.85, '[ Cancel ]', {
          fontSize: '16px',
          color: '#ffffff',
          backgroundColor: '#e74c3c',
          padding: { x: 12, y: 6 },
        })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true });
      cancelText.on('pointerdown', () => cancelTrade());
      overlay.add(cancelText);
    };

    refreshTradeOverlay();
  }

  private showWeaponSelection(unit: Unit): void {
    this.inputEnabled = false;
    const overlay = this.add.container(0, 0);
    const bg = this.add.rectangle(
      this.cameras.main.width / 2,
      this.cameras.main.height / 2,
      this.cameras.main.width,
      this.cameras.main.height,
      0x000000,
      0.7,
    );
    overlay.add(bg);

    const cx = this.cameras.main.width / 2;
    const cy = this.cameras.main.height / 2;

    const panel = this.add.rectangle(cx, cy, 360, 300, 0x2c3e50, 0.95);
    panel.setStrokeStyle(2, 0xc0392b);
    overlay.add(panel);

    const title = this.add
      .text(cx, cy - 120, 'Choose Weapon', {
        fontSize: '18px',
        color: '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    overlay.add(title);

    const weapons = unit.inventory.items.filter((i): i is WeaponItem => i.kind === 'weapon');
    if (weapons.length === 0) {
      const noneText = this.add
        .text(cx, cy, 'No weapons', {
          fontSize: '14px',
          color: '#bdc3c7',
        })
        .setOrigin(0.5);
      overlay.add(noneText);
    } else {
      for (let i = 0; i < weapons.length; i++) {
        const weapon = weapons[i];
        const globalIndex = unit.inventory.items.indexOf(weapon);
        const y = cy - 70 + i * 36;
        const weaponText = this.add
          .text(
            cx,
            y,
            `${weapon.name}  MT:${weapon.mt} HIT:${weapon.hit} CRT:${weapon.crit} RNG:${weapon.minRange}-${weapon.maxRange}`,
            {
              fontSize: '13px',
              color: '#ffffff',
              backgroundColor: '#34495e',
              padding: { x: 8, y: 4 },
            },
          )
          .setOrigin(0.5)
          .setInteractive({ useHandCursor: true });

        weaponText.on(
          'pointerdown',
          (
            _pointer: Phaser.Input.Pointer,
            _localX: number,
            _localY: number,
            event: Phaser.Types.Input.EventData,
          ) => {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-call
            event.stopPropagation();
            this.battleMenu.selectWeapon(globalIndex);
            this.hideWeaponSelection();
            this.highlightEnemyTargets(this.engine.getAdjacentEnemies(unit));
          },
        );

        overlay.add(weaponText);
      }
    }

    const cancelBtn = this.add
      .text(cx, cy + 110, '[ Cancel ]', {
        fontSize: '14px',
        color: '#ffffff',
        backgroundColor: '#c0392b',
        padding: { x: 8, y: 4 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    cancelBtn.on(
      'pointerdown',
      (
        _pointer: Phaser.Input.Pointer,
        _localX: number,
        _localY: number,
        event: Phaser.Types.Input.EventData,
      ) => {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call
        event.stopPropagation();
        this.battleMenu.cancelWeaponSelection();
        this.hideWeaponSelection();
        const enemies = this.engine.getAdjacentEnemies(unit);
        this.battleMenu.show(unit, enemies);
        this.showPostMoveMenu(unit);
      },
    );

    overlay.add(cancelBtn);
    this.weaponOverlay = overlay;
  }

  private hideWeaponSelection(): void {
    this.weaponOverlay?.destroy();
    this.weaponOverlay = null;
    this.inputEnabled = true;
  }

  private showStatusWindow(unit: Unit): void {
    this.statusWindow.open(unit);
    this.inputEnabled = false;

    const overlay = this.add.container(0, 0);
    const bg = this.add.rectangle(
      this.cameras.main.width / 2,
      this.cameras.main.height / 2,
      this.cameras.main.width,
      this.cameras.main.height,
      0x000000,
      0.7,
    );
    overlay.add(bg);

    const stats = this.statusWindow.displayStats;
    if (stats) {
      const cx = this.cameras.main.width / 2;
      const cy = this.cameras.main.height / 2;

      const panel = this.add.rectangle(cx, cy, 260, 320, 0x2c3e50, 0.95);
      panel.setStrokeStyle(2, 0x3498db);
      overlay.add(panel);

      const lines = [
        `${stats.name}`,
        `Class: ${stats.unitClass}`,
        `Level: ${stats.level}`,
        ``,
        `HP:  ${stats.hp} / ${stats.maxHp}`,
        `Str: ${stats.str}`,
        `Mag: ${stats.mag}`,
        `Skl: ${stats.skl}`,
        `Spd: ${stats.spd}`,
        `Luk: ${stats.luk}`,
        `Def: ${stats.def}`,
        `Res: ${stats.res}`,
        `Mov: ${stats.mov}`,
      ];

      const text = this.add
        .text(cx, cy - 20, lines.join('\n'), {
          fontSize: '14px',
          color: '#ecf0f1',
          align: 'center',
          lineSpacing: 4,
        })
        .setOrigin(0.5);

      overlay.add(text);
    }

    const closeBtn = this.add
      .text(this.cameras.main.width / 2, this.cameras.main.height / 2 + 140, '[ Close ]', {
        fontSize: '16px',
        color: '#ffffff',
        backgroundColor: '#c0392b',
        padding: { x: 12, y: 6 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    closeBtn.on(
      'pointerdown',
      (
        _pointer: Phaser.Input.Pointer,
        _localX: number,
        _localY: number,
        event: Phaser.Types.Input.EventData,
      ) => {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call
        event.stopPropagation();
        this.hideStatusWindow();
      },
    );

    overlay.add(closeBtn);
    this.statusOverlay = overlay;
    this.updateSaveBtnVisibility();
  }

  private hideStatusWindow(): void {
    this.statusOverlay?.destroy();
    this.statusOverlay = null;
    this.statusWindow.close();
    this.inputEnabled = true;
    const unit = this.battleMenu.unit;
    if (unit) {
      this.battleMenu.show(unit, this.engine.getAdjacentEnemies(unit));
      this.showPostMoveMenu(unit);
    }
    this.updateSaveBtnVisibility();
  }

  private clearMenuTexts(): void {
    for (const text of this.menuTexts) {
      text.destroy();
    }
    this.menuTexts = [];
  }

  private isPointerOverMenuText(pointerX: number, pointerY: number): boolean {
    for (const text of this.menuTexts) {
      if (text.getBounds().contains(pointerX, pointerY)) {
        return true;
      }
    }
    return false;
  }

  private undoMove(): void {
    if (this.weaponOverlay) {
      this.hideWeaponSelection();
      return;
    }
    if (this.itemOverlay) {
      this.hideItemMenu(false);
      return;
    }
    if (this.statusOverlay) {
      this.hideStatusWindow();
      return;
    }
    const unit = this.battleMenu.unit;
    if (!unit) {
      return;
    }

    if (this.preMovePosition) {
      const { x, y } = this.preMovePosition;
      this.engine.moveUnit(unit, x, y);
      this.engine.updateFogOfWar();
      this.syncTileColors();
      this.syncUnitSprites();
      const sprite = this.unitSprites.get(unit.id);
      if (sprite) {
        sprite.setPosition(
          this.offsetX + x * TILE_SIZE + TILE_SIZE / 2,
          this.offsetY + y * TILE_SIZE + TILE_SIZE / 2,
        );
      }
      this.preMovePosition = null;
    }

    unit.state.reset();
    this.battleMenu.reset();
    this.clearMenuTexts();
    this.enemyPreview.clear();
    this.moveGraphics.clear();
    this.pathGraphics.clear();
    this.selectedUnit = unit;
    this.showMoveRange(unit);
    this.updateSaveBtnVisibility();
  }

  private handleOutsideMenuClick(): void {
    if (this.weaponOverlay) {
      this.battleMenu.cancelWeaponSelection();
      this.hideWeaponSelection();
      const unit = this.battleMenu.unit;
      if (unit) {
        const enemies = this.engine.getAdjacentEnemies(unit);
        this.battleMenu.show(unit, enemies);
        this.showPostMoveMenu(unit);
      }
      return;
    }
    if (this.itemOverlay) {
      this.hideItemMenu(false);
      return;
    }
    if (this.statusOverlay) {
      this.hideStatusWindow();
      return;
    }
    if (this.battleMenu.state === MenuState.CHOOSE_TARGET) {
      this.moveGraphics.clear();
      this.pathGraphics.clear();
      const unit = this.battleMenu.unit;
      if (!unit) {
        return;
      }
      const enemies = this.engine.getAdjacentEnemies(unit);
      this.battleMenu.show(unit, enemies);
      this.showPostMoveMenu(unit);
    } else if (this.battleMenu.state === MenuState.CHOOSE_ACTION) {
      this.undoMove();
    }
  }

  private highlightEnemyTargets(enemies: Unit[]): void {
    this.moveGraphics.clear();
    for (const enemy of enemies) {
      this.moveGraphics.fillStyle(0xe74c3c, 0.5);
      this.moveGraphics.fillRect(
        this.offsetX + enemy.gridX * TILE_SIZE,
        this.offsetY + enemy.gridY * TILE_SIZE,
        TILE_SIZE,
        TILE_SIZE,
      );
      this.moveGraphics.lineStyle(2, 0xff0000);
      this.moveGraphics.strokeRect(
        this.offsetX + enemy.gridX * TILE_SIZE,
        this.offsetY + enemy.gridY * TILE_SIZE,
        TILE_SIZE,
        TILE_SIZE,
      );
    }
  }

  private highlightHealTargets(targets: Unit[]): void {
    this.moveGraphics.clear();
    for (const target of targets) {
      this.moveGraphics.fillStyle(0x2ecc71, 0.5);
      this.moveGraphics.fillRect(
        this.offsetX + target.gridX * TILE_SIZE,
        this.offsetY + target.gridY * TILE_SIZE,
        TILE_SIZE,
        TILE_SIZE,
      );
      this.moveGraphics.lineStyle(2, 0x00ff00);
      this.moveGraphics.strokeRect(
        this.offsetX + target.gridX * TILE_SIZE,
        this.offsetY + target.gridY * TILE_SIZE,
        TILE_SIZE,
        TILE_SIZE,
      );
    }
  }

  private handleMenuInput(_gx: number, _gy: number, clickedUnit: Unit | null): void {
    if (this.battleMenu.state === MenuState.CHOOSE_TARGET) {
      const validTarget = this.battleMenu.adjacentEnemies.find((e) => e.id === clickedUnit?.id);
      const unit = this.battleMenu.unit;
      if (!unit) {
        return;
      }
      if (validTarget) {
        if (this.combatPreviewConfirmMode) {
          if (this.pendingCombatTarget?.id === validTarget.id) {
            // Already confirming this target — ignore repeated clicks
            return;
          }
          // Switch to a different enemy
          this.pendingCombatTarget = validTarget;
          this.showCombatPreviewWithConfirm(unit, validTarget);
          return;
        }
        // Enter confirm mode
        this.combatPreviewConfirmMode = true;
        this.pendingCombatTarget = validTarget;
        this.showCombatPreviewWithConfirm(unit, validTarget);
        return;
      } else {
        // Clicked a non-target tile
        if (this.combatPreviewConfirmMode) {
          // Exit confirm mode, stay in CHOOSE_TARGET
          this.combatPreviewConfirmMode = false;
          this.pendingCombatTarget = null;
          this.hideCombatPreview();
          return;
        }
        // Cancel target selection and return to action menu
        this.hideCombatPreview();
        this.moveGraphics.clear();
        this.pathGraphics.clear();
        this.battleMenu.cancelTargetSelection();
        this.showPostMoveMenu(unit);
        return;
      }
    } else if (this.battleMenu.state === MenuState.CHOOSE_HEAL_TARGET) {
      const unit = this.battleMenu.unit;
      if (!unit) {
        return;
      }
      const staff = this.engine.getStaffForUnit(unit);
      const healTargets = staff ? this.engine.getHealTargets(unit) : [];
      const validTarget = healTargets.find((e) => e.id === clickedUnit?.id);
      if (validTarget) {
        this.resolveStaffHeal(unit, validTarget);
      } else {
        // Clicked a non-target tile — cancel heal selection and return to action menu
        this.moveGraphics.clear();
        this.pathGraphics.clear();
        this.battleMenu.cancelHealSelection();
        this.showPostMoveMenu(unit);
        return;
      }
    }
  }

  private startBattleMode(attacker: Unit, defender: Unit, onComplete?: () => void): void {
    this.inBattleMode = true;
    this.pendingBattleCallback = onComplete ?? null;

    // Snapshot HP before combat resolution so the battle display shows
    // the correct starting values (resolveCombat mutates unit HP inline).
    const attackerInitialHp = attacker.stats.hp;
    const defenderInitialHp = defender.stats.hp;

    const result = this.engine.resolvePlayerCombat(
      attacker,
      defender,
      undefined,
      this.battleMenu.selectedWeaponIndex ?? undefined,
    );
    this.combatResult = result;
    this.battleDisplayState = new BattleDisplayState(
      attacker,
      defender,
      result.log,
      attackerInitialHp,
      defenderInitialHp,
    );

    // Get combat preview for display stats
    const preview = this.engine.getCombatPreview(attacker, defender);

    // Create overlay container — pinned to screen, on top of everything
    const overlay = this.add.container(0, 0);
    overlay.setScrollFactor(0);
    overlay.setDepth(200);
    const bg = this.add.rectangle(
      this.cameras.main.width / 2,
      this.cameras.main.height / 2,
      this.cameras.main.width,
      this.cameras.main.height,
      0x000000,
      0.7,
    );
    overlay.add(bg);

    // Attacker panel (left)
    const attX = this.cameras.main.width * 0.25;
    const attY = this.cameras.main.height * 0.5;
    this.attBattlePanel = this.createUnitBattlePanel(attacker, attX, attY, 0x3498db, preview.attacker, attackerInitialHp);
    overlay.add(this.attBattlePanel);

    // Defender panel (right)
    const defX = this.cameras.main.width * 0.75;
    const defY = this.cameras.main.height * 0.5;
    this.defBattlePanel = this.createUnitBattlePanel(defender, defX, defY, 0xe74c3c, preview.defender, defenderInitialHp);
    overlay.add(this.defBattlePanel);

    // VS label
    const vsText = this.add
      .text(this.cameras.main.width / 2, this.cameras.main.height * 0.3, 'VS', {
        fontSize: '32px',
        color: '#f1c40f',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    overlay.add(vsText);

    this.battleOverlay = overlay;

    // Start animation sequence
    this.time.delayedCall(800, () => {
      this.runBattleAnimation();
    });
  }

  private createUnitBattlePanel(
    unit: Unit,
    x: number,
    y: number,
    color: number,
    preview: import('../game/combat/Engine').AttackPreview | null,
    initialHp?: number,
  ): Phaser.GameObjects.Container {
    const panel = this.add.container(x, y);

    // Background box
    const box = this.add.rectangle(0, 0, 200, 180, 0x2c3e50, 0.9);
    box.setStrokeStyle(2, color);
    panel.add(box);

    // Name
    const nameText = this.add
      .text(0, -70, unit.name, {
        fontSize: '18px',
        color: '#ecf0f1',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    panel.add(nameText);

    // Class
    const classText = this.add
      .text(0, -50, unit.unitClass, {
        fontSize: '12px',
        color: '#bdc3c7',
      })
      .setOrigin(0.5);
    panel.add(classText);

    // Combat stats row
    if (preview) {
      const hitText = this.add
        .text(-60, -30, `Hit ${preview.hit.toString()}%`, {
          fontSize: '12px',
          color: '#ecf0f1',
        })
        .setOrigin(0, 0.5);
      panel.add(hitText);

      const critText = this.add
        .text(-60, -14, `Crit ${preview.crit.toString()}%`, {
          fontSize: '12px',
          color: preview.crit > 0 ? '#e74c3c' : '#95a5a6',
        })
        .setOrigin(0, 0.5);
      panel.add(critText);

      const dmgText = this.add
        .text(20, -30, `Dmg ${preview.damage.toString()}`, {
          fontSize: '12px',
          color: '#ecf0f1',
        })
        .setOrigin(0, 0.5);
      panel.add(dmgText);

      if (preview.doubleAttack) {
        const doubleText = this.add
          .text(20, -14, '2x', {
            fontSize: '12px',
            color: '#f1c40f',
            fontStyle: 'bold',
          })
          .setOrigin(0, 0.5);
        panel.add(doubleText);
      }
    }

    // HP label
    const hpLabel = this.add
      .text(-70, 10, 'HP', {
        fontSize: '12px',
        color: '#bdc3c7',
      })
      .setOrigin(0, 0.5);
    panel.add(hpLabel);

    // HP bar background
    const hpBg = this.add.rectangle(10, 10, 120, 12, 0x000000);
    panel.add(hpBg);

    // HP bar fill (uses initialHp so the panel reflects pre-combat state)
    const displayHp = Math.max(0, Math.min(initialHp ?? unit.stats.hp, unit.stats.maxHp));
    const hpRatio = displayHp / unit.stats.maxHp;
    const hpColor = hpRatio > 0.5 ? 0x2ecc71 : hpRatio > 0.25 ? 0xf1c40f : 0xe74c3c;
    const hpFill = this.add.rectangle(-50 + (120 * hpRatio) / 2, 10, 120 * hpRatio, 12, hpColor);
    hpFill.setName('hpFill');
    panel.add(hpFill);

    // HP text
    const hpText = this.add
      .text(10, 30, `${displayHp.toString()} / ${unit.stats.maxHp.toString()}`, {
        fontSize: '14px',
        color: '#ecf0f1',
      })
      .setOrigin(0.5);
    hpText.setName('hpText');
    panel.add(hpText);

    return panel;
  }

  private runBattleAnimation(): void {
    if (!this.battleDisplayState || !this.battleOverlay) {
      return;
    }

    const state = this.battleDisplayState;
    if (!state.canAdvance()) {
      this.endBattleMode();
      return;
    }

    state.advance();
    const entry = state.currentLogEntry;

    if (state.phase === BattlePhase.STRIKE) {
      // Determine target based on who is attacking in this log entry
      const isCounter = entry?.attacker.id === state.defender.id;
      const target = isCounter ? state.attacker : state.defender;

      // Camera shake on hit
      if (entry?.hit) {
        this.cameras.main.shake(100, entry.critical ? 0.015 : 0.005);
      }

      this.time.delayedCall(400, () => {
        if (entry?.hit) {
          this.showDamageNumber(target, entry.damage, entry.critical);
        } else if (entry) {
          this.showMissText(target);
        }
        if (entry) {
          state.applyLogEntry(entry);
        }
        this.updateBattleHpBars();
        this.time.delayedCall(600, () => {
          this.runBattleAnimation();
        });
      });
    } else if (state.phase === BattlePhase.RECOIL) {
      // Recoil phase — just advance after brief pause
      this.time.delayedCall(300, () => {
        this.runBattleAnimation();
      });
    } else {
      this.time.delayedCall(200, () => {
        this.runBattleAnimation();
      });
    }
  }

  private showDamageNumber(target: Unit, damage: number, critical: boolean): void {
    if (!this.battleOverlay || !this.battleDisplayState) {
      return;
    }
    const isLeft = target.id === this.battleDisplayState.attacker.id;
    const x = this.cameras.main.width * (isLeft ? 0.25 : 0.75);
    const y = this.cameras.main.height * 0.5 - 80;

    const text = this.add
      .text(x, y, critical ? `${damage.toString()}!` : String(damage), {
        fontSize: critical ? '28px' : '22px',
        color: critical ? '#e74c3c' : '#ffffff',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 4,
      })
      .setOrigin(0.5);
    this.battleOverlay.add(text);

    this.tweens.add({
      targets: text,
      y: y - 40,
      alpha: 0,
      duration: 800,
      onComplete: () => {
        text.destroy();
      },
    });
  }

  private showMissText(target: Unit): void {
    if (!this.battleOverlay || !this.battleDisplayState) {
      return;
    }
    const isLeft = target.id === this.battleDisplayState.attacker.id;
    const x = this.cameras.main.width * (isLeft ? 0.25 : 0.75);
    const y = this.cameras.main.height * 0.5 - 80;

    const text = this.add
      .text(x, y, 'Miss', {
        fontSize: '20px',
        color: '#95a5a6',
        stroke: '#000000',
        strokeThickness: 3,
      })
      .setOrigin(0.5);
    this.battleOverlay.add(text);

    this.tweens.add({
      targets: text,
      y: y - 30,
      alpha: 0,
      duration: 600,
      onComplete: () => {
        text.destroy();
      },
    });
  }

  private updateBattleHpBars(): void {
    if (!this.battleDisplayState || !this.battleOverlay) {
      return;
    }
    const { attacker, defender, attackerCurrentHp, defenderCurrentHp } = this.battleDisplayState;

    // Update attacker HP bar
    this.updatePanelHp(attacker, attackerCurrentHp, 0x3498db);
    // Update defender HP bar
    this.updatePanelHp(defender, defenderCurrentHp, 0xe74c3c);
  }

  private updatePanelHp(unit: Unit, currentHp: number, _color: number): void {
    if (!this.battleDisplayState || !this.battleOverlay) {
      return;
    }
    const isLeft = unit.id === this.battleDisplayState.attacker.id;
    const panel = isLeft ? this.attBattlePanel : this.defBattlePanel;
    if (!panel) return;

    const hpRatio = Math.max(0, currentHp / unit.stats.maxHp);
    const hpColor = hpRatio > 0.5 ? 0x2ecc71 : hpRatio > 0.25 ? 0xf1c40f : 0xe74c3c;

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
    const oldFill = panel.getByName('hpFill') as Phaser.GameObjects.GameObject;

    oldFill.destroy();
    const newFill = this.add.rectangle(-50 + (120 * hpRatio) / 2, 10, 120 * hpRatio, 12, hpColor);
    newFill.setName('hpFill');

    panel.add(newFill);

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
    const hpText = panel.getByName('hpText') as Phaser.GameObjects.Text;
    hpText.setText(`${currentHp.toString()} / ${unit.stats.maxHp.toString()}`);
  }

  private resolveStaffHeal(healer: Unit, target: Unit): void {
    const result = this.engine.resolveStaffHeal(healer, target);
    this.moveGraphics.clear();
    this.pathGraphics.clear();
    this.showHealNumber(target, result.healedAmount);
    this.syncUnitSprites();

    this.time.delayedCall(600, () => {
      const progression = this.engine.applyStaffExp(healer, result);
      if (progression) {
        this.showExpPopup(healer, progression, () => {
          this.finishStaffUse(healer);
        });
      } else {
        this.finishStaffUse(healer);
      }
    });
  }

  private showHealNumber(target: Unit, amount: number): void {
    const px = this.offsetX + target.gridX * TILE_SIZE + TILE_SIZE / 2;
    const py = this.offsetY + target.gridY * TILE_SIZE + TILE_SIZE / 2;
    const text = this.add
      .text(px, py - 10, `+${amount.toString()}`, {
        fontSize: '20px',
        color: '#2ecc71',
        stroke: '#000000',
        strokeThickness: 3,
      })
      .setOrigin(0.5);

    this.tweens.add({
      targets: text,
      y: py - 40,
      alpha: 0,
      duration: 1200,
      ease: 'Power2',
      onComplete: () => {
        text.destroy();
      },
    });
  }

  private finishStaffUse(healer: Unit): void {
    healer.state.transition(UNIT_STATE.EXHAUSTED);
    this.syncUnitSprites();
    this.checkAutoEndTurn();
  }

  private endBattleMode(): void {
    this.inBattleMode = false;

    // Capture dead units before removal so we can evaluate kill/death triggers
    const deadBeforeRemoval = this.engine.getAllUnits().filter((u) => u.stats.hp <= 0);

    // Clean up dead units from the grid and sync sprites immediately,
    // before the overlay fade / exp popup, so 0-HP enemies don't linger.
    this.engine.removeDeadUnits();
    this.syncUnitSprites();

    const afterFade = () => {
      this.battleOverlay?.destroy();
      this.battleOverlay = null;

      // Play kill/death triggers before applying EXP / checking objectives
      this.playDeadUnitTriggers(deadBeforeRemoval, 0, () => {
        // Apply combat EXP
        const attacker = this.battleDisplayState?.attacker;
        let progression = null;
        if (attacker && this.combatResult) {
          progression = this.engine.applyCombatExp(attacker, this.combatResult);
        }

        // Show EXP popup for player-initiated attacks with EXP > 0
        if (
          attacker?.isPlayer &&
          progression &&
          this.combatResult &&
          this.combatResult.expAward > 0
        ) {
          this.showExpPopup(attacker, progression, () => {
            this.finishBattleMode();
          });
          return;
        }

        this.finishBattleMode();
      });
    };

    if (this.battleOverlay) {
      this.tweens.add({
        targets: this.battleOverlay,
        alpha: 0,
        duration: 400,
        onComplete: afterFade,
      });
    } else {
      afterFade();
    }
  }

  private finishBattleMode(): void {
    // Exhaust the player unit
    if (this.battleDisplayState?.attacker.isPlayer) {
      this.battleDisplayState.attacker.hasActed = true;
    }

    // Re-sync sprites so the attacker dims immediately after being exhausted
    this.syncUnitSprites();

    // Check win/loss after combat resolves
    const objectives = this.engine.checkObjectives();
    if (objectives.victory) {
      this.showVictoryScreen();
    } else if (objectives.defeat) {
      this.showDefeatScreen();
    } else {
      this.checkAutoEndTurn();
    }

    this.battleDisplayState = null;
    this.combatResult = null;
    this.battleMenu.reset();
    this.pendingBattleCallback?.();
    this.pendingBattleCallback = null;
  }

  private showVictoryScreen(): void {
    const overlay = this.add.container(0, 0);

    const bg = this.add.rectangle(
      this.cameras.main.width / 2,
      this.cameras.main.height / 2,
      this.cameras.main.width,
      this.cameras.main.height,
      0x000000,
      0.85,
    );
    overlay.add(bg);

    const title = this.add
      .text(this.cameras.main.width / 2, this.cameras.main.height * 0.4, 'Victory', {
        fontSize: '48px',
        color: '#f1c40f',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    overlay.add(title);

    const nextLevelId = getNextLevelId(this.currentLevelId);
    const subtitleText = nextLevelId !== null ? 'All enemies defeated' : 'Campaign Complete!';
    const subtitle = this.add
      .text(this.cameras.main.width / 2, this.cameras.main.height * 0.55, subtitleText, {
        fontSize: '18px',
        color: '#bdc3c7',
      })
      .setOrigin(0.5);
    overlay.add(subtitle);

    // Auto-advance after 2s delay
    this.time.delayedCall(2000, () => {
      this.cameras.main.fadeOut(1000, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        if (nextLevelId !== null) {
          this.scene.start('BattleScene', { levelId: nextLevelId });
        } else {
          this.scene.start('MainMenuScene');
        }
      });
    });
  }

  private showDefeatScreen(): void {
    const overlay = this.add.container(0, 0);

    const bg = this.add.rectangle(
      this.cameras.main.width / 2,
      this.cameras.main.height / 2,
      this.cameras.main.width,
      this.cameras.main.height,
      0x000000,
      0.85,
    );
    overlay.add(bg);

    const title = this.add
      .text(this.cameras.main.width / 2, this.cameras.main.height * 0.4, 'Defeat', {
        fontSize: '48px',
        color: '#e74c3c',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    overlay.add(title);

    const subtitle = this.add
      .text(this.cameras.main.width / 2, this.cameras.main.height * 0.55, 'All units lost', {
        fontSize: '18px',
        color: '#bdc3c7',
      })
      .setOrigin(0.5);
    overlay.add(subtitle);

    const restart = this.add
      .text(this.cameras.main.width / 2, this.cameras.main.height * 0.7, '[ Try Again ]', {
        fontSize: '20px',
        color: '#ffffff',
        backgroundColor: '#c0392b',
        padding: { x: 16, y: 8 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    overlay.add(restart);

    restart.on('pointerdown', () => {
      this.scene.restart({ levelId: this.currentLevelId });
    });
  }

  private showMenuConfirmation(): void {
    if (this.menuConfirmationOverlay) return;
    this.inputEnabled = false;
    const overlay = this.add.container(0, 0);
    overlay.setScrollFactor(0);
    overlay.setDepth(200);
    this.menuConfirmationOverlay = overlay;

    const bg = this.add.rectangle(
      this.cameras.main.width / 2,
      this.cameras.main.height / 2,
      this.cameras.main.width,
      this.cameras.main.height,
      0x000000,
      0.7,
    );
    overlay.add(bg);

    const panel = this.add.rectangle(
      this.cameras.main.width / 2,
      this.cameras.main.height / 2,
      320,
      160,
      0x2c3e50,
      0.95,
    );
    overlay.add(panel);

    const title = this.add
      .text(this.cameras.main.width / 2, this.cameras.main.height / 2 - 40, 'Return to Main Menu?', {
        fontSize: '20px',
        color: '#ecf0f1',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    overlay.add(title);

    const yesBtn = this.add
      .text(this.cameras.main.width / 2 - 60, this.cameras.main.height / 2 + 20, '[ Yes ]', {
        fontSize: '18px',
        color: '#ffffff',
        backgroundColor: '#c0392b',
        padding: { x: 12, y: 6 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    overlay.add(yesBtn);

    const noBtn = this.add
      .text(this.cameras.main.width / 2 + 60, this.cameras.main.height / 2 + 20, '[ No ]', {
        fontSize: '18px',
        color: '#ffffff',
        backgroundColor: '#27ae60',
        padding: { x: 12, y: 6 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    overlay.add(noBtn);

    yesBtn.on('pointerdown', () => {
      this.scene.start('MainMenuScene');
    });

    noBtn.on('pointerdown', () => {
      this.hideMenuConfirmation();
    });
  }

  private hideMenuConfirmation(): void {
    if (this.menuConfirmationOverlay) {
      this.menuConfirmationOverlay.destroy();
      this.menuConfirmationOverlay = null;
    }
    this.inputEnabled = true;
  }

  private showCombatPreview(attacker: Unit, defender: Unit): void {
    if (this.combatPreviewOverlay) {
      // Only rebuild if target changed
      const existingDefender = (this.combatPreviewOverlay as any).__defenderId;
      if (existingDefender === defender.id) return;
      this.combatPreviewOverlay.destroy();
    }

    const overlay = this.add.container(0, 0);
    (overlay as any).__defenderId = defender.id;
    this.combatPreviewOverlay = overlay;
    overlay.setScrollFactor(0);
    overlay.setDepth(100);

    const w = 280;
    const h = 220;
    const cx = this.cameras.main.width / 2;
    const cy = this.cameras.main.height * 0.35;

    const bg = this.add.rectangle(cx, cy, w, h, 0x000000, 0.85);
    bg.setStrokeStyle(2, 0xffffff);
    overlay.add(bg);

    const preview = this.engine.getCombatPreview(attacker, defender, this.battleMenu.selectedWeaponIndex ?? undefined);

    // Weapon triangle indicator
    const attWeapon = this.engine.getWeaponForUnit(attacker, this.battleMenu.selectedWeaponIndex ?? undefined);
    const defWeapon = this.engine.getWeaponForUnit(defender);
    const triangleMod = getWeaponTriangleMod(attWeapon.type, defWeapon.type);
    let triangleText = '';
    let triangleColor = '#ffffff';
    if (triangleMod.hitBonus > 0) {
      triangleText = 'Advantage';
      triangleColor = '#2ecc71';
    } else if (triangleMod.hitBonus < 0) {
      triangleText = 'Disadvantage';
      triangleColor = '#e74c3c';
    } else {
      triangleText = 'Neutral';
      triangleColor = '#bdc3c7';
    }

    const triLabel = this.add.text(cx, cy - h / 2 + 16, triangleText, {
      fontSize: '14px',
      color: triangleColor,
      fontStyle: 'bold',
    }).setOrigin(0.5);
    overlay.add(triLabel);

    const leftX = cx - w / 2 + 16;
    const rightX = cx + w / 2 - 16;
    const rowY = cy - h / 2 + 44;
    const rowH = 22;

    // Headers
    overlay.add(this.add.text(leftX, rowY, attacker.name, { fontSize: '13px', color: '#3498db' }).setOrigin(0, 0));
    overlay.add(this.add.text(rightX, rowY, defender.name, { fontSize: '13px', color: '#e74c3c' }).setOrigin(1, 0));

    const stats = [
      { label: 'Dmg', att: preview.attacker.damage, def: preview.defender?.damage ?? '-' },
      { label: 'Hit', att: preview.attacker.hit + '%', def: preview.defender ? preview.defender.hit + '%' : '-' },
      { label: 'Crit', att: preview.attacker.crit + '%', def: preview.defender ? preview.defender.crit + '%' : '-' },
      { label: '2x', att: preview.attacker.doubleAttack ? 'Yes' : 'No', def: preview.defender?.doubleAttack ? 'Yes' : 'No' },
    ];

    for (let i = 0; i < stats.length; i++) {
      const y = rowY + 24 + i * rowH;
      overlay.add(this.add.text(leftX, y, stats[i].label, { fontSize: '12px', color: '#aaaaaa' }).setOrigin(0, 0));
      overlay.add(this.add.text(leftX + 70, y, String(stats[i].att), { fontSize: '12px', color: '#ffffff' }).setOrigin(1, 0));
      overlay.add(this.add.text(rightX, y, stats[i].label, { fontSize: '12px', color: '#aaaaaa' }).setOrigin(1, 0));
      overlay.add(this.add.text(rightX - 70, y, String(stats[i].def), { fontSize: '12px', color: '#ffffff' }).setOrigin(0, 0));
    }

    // Weapon names
    const wepY = rowY + 24 + stats.length * rowH + 8;
    overlay.add(this.add.text(leftX, wepY, attWeapon.name, { fontSize: '11px', color: '#f1c40f' }).setOrigin(0, 0));
    overlay.add(this.add.text(rightX, wepY, defWeapon.name, { fontSize: '11px', color: '#f1c40f' }).setOrigin(1, 0));
  }

  private showCombatPreviewWithConfirm(attacker: Unit, defender: Unit): void {
    this.hideCombatPreview();

    const overlay = this.add.container(0, 0);
    (overlay as any).__defenderId = defender.id;
    this.combatPreviewOverlay = overlay;
    overlay.setScrollFactor(0);
    overlay.setDepth(100);

    const w = 280;
    const h = 260;
    const cx = this.cameras.main.width / 2;
    const cy = this.cameras.main.height * 0.35;

    const bg = this.add.rectangle(cx, cy, w, h, 0x000000, 0.85);
    bg.setStrokeStyle(2, 0xffffff);
    overlay.add(bg);

    const preview = this.engine.getCombatPreview(attacker, defender, this.battleMenu.selectedWeaponIndex ?? undefined);

    // Weapon triangle indicator
    const attWeapon = this.engine.getWeaponForUnit(attacker, this.battleMenu.selectedWeaponIndex ?? undefined);
    const defWeapon = this.engine.getWeaponForUnit(defender);
    const triangleMod = getWeaponTriangleMod(attWeapon.type, defWeapon.type);
    let triangleText = '';
    let triangleColor = '#ffffff';
    if (triangleMod.hitBonus > 0) {
      triangleText = 'Advantage';
      triangleColor = '#2ecc71';
    } else if (triangleMod.hitBonus < 0) {
      triangleText = 'Disadvantage';
      triangleColor = '#e74c3c';
    } else {
      triangleText = 'Neutral';
      triangleColor = '#bdc3c7';
    }

    const triLabel = this.add.text(cx, cy - h / 2 + 16, triangleText, {
      fontSize: '14px',
      color: triangleColor,
      fontStyle: 'bold',
    }).setOrigin(0.5);
    overlay.add(triLabel);

    const leftX = cx - w / 2 + 16;
    const rightX = cx + w / 2 - 16;
    const rowY = cy - h / 2 + 44;
    const rowH = 22;

    // Headers
    overlay.add(this.add.text(leftX, rowY, attacker.name, { fontSize: '13px', color: '#3498db' }).setOrigin(0, 0));
    overlay.add(this.add.text(rightX, rowY, defender.name, { fontSize: '13px', color: '#e74c3c' }).setOrigin(1, 0));

    const stats = [
      { label: 'Dmg', att: preview.attacker.damage, def: preview.defender?.damage ?? '-' },
      { label: 'Hit', att: preview.attacker.hit + '%', def: preview.defender ? preview.defender.hit + '%' : '-' },
      { label: 'Crit', att: preview.attacker.crit + '%', def: preview.defender ? preview.defender.crit + '%' : '-' },
      { label: '2x', att: preview.attacker.doubleAttack ? 'Yes' : 'No', def: preview.defender?.doubleAttack ? 'Yes' : 'No' },
    ];

    for (let i = 0; i < stats.length; i++) {
      const y = rowY + 24 + i * rowH;
      overlay.add(this.add.text(leftX, y, stats[i].label, { fontSize: '12px', color: '#aaaaaa' }).setOrigin(0, 0));
      overlay.add(this.add.text(leftX + 70, y, String(stats[i].att), { fontSize: '12px', color: '#ffffff' }).setOrigin(1, 0));
      overlay.add(this.add.text(rightX, y, stats[i].label, { fontSize: '12px', color: '#aaaaaa' }).setOrigin(1, 0));
      overlay.add(this.add.text(rightX - 70, y, String(stats[i].def), { fontSize: '12px', color: '#ffffff' }).setOrigin(0, 0));
    }

    // Weapon names
    const wepY = rowY + 24 + stats.length * rowH + 8;
    overlay.add(this.add.text(leftX, wepY, attWeapon.name, { fontSize: '11px', color: '#f1c40f' }).setOrigin(0, 0));
    overlay.add(this.add.text(rightX, wepY, defWeapon.name, { fontSize: '11px', color: '#f1c40f' }).setOrigin(1, 0));

    // Confirm / Cancel buttons
    const btnY = cy + h / 2 - 28;
    const confirmBtn = this.add.text(cx - 50, btnY, 'Confirm', {
      fontSize: '14px',
      color: '#2ecc71',
      fontStyle: 'bold',
      backgroundColor: '#000000',
      padding: { x: 8, y: 4 },
    }).setOrigin(0.5).setInteractive();

    const cancelBtn = this.add.text(cx + 50, btnY, 'Cancel', {
      fontSize: '14px',
      color: '#e74c3c',
      fontStyle: 'bold',
      backgroundColor: '#000000',
      padding: { x: 8, y: 4 },
    }).setOrigin(0.5).setInteractive();

    confirmBtn.on('pointerover', () => confirmBtn.setStyle({ color: '#27ae60' }));
    confirmBtn.on('pointerout', () => confirmBtn.setStyle({ color: '#2ecc71' }));
    confirmBtn.on('pointerdown', () => {
      this.combatPreviewConfirmMode = false;
      this.pendingCombatTarget = null;
      this.hideCombatPreview();
      this.battleMenu.selectTarget(defender);
      this.clearMenuTexts();
      this.moveGraphics.clear();
      this.pathGraphics.clear();
      const isFirstCombat = !this.engine.getFirstCombatOccurred();
      this.playCutsceneIfTriggered(
        { eventType: 'on_attack', attackerId: attacker.id, defenderId: defender.id },
        () => {
          if (isFirstCombat) {
            this.playCutsceneIfTriggered({ eventType: 'on_first_combat' }, () => {
              this.engine.markFirstCombat();
              this.startBattleMode(attacker, defender);
            });
          } else {
            this.startBattleMode(attacker, defender);
          }
        },
      );
    });

    cancelBtn.on('pointerover', () => cancelBtn.setStyle({ color: '#c0392b' }));
    cancelBtn.on('pointerout', () => cancelBtn.setStyle({ color: '#e74c3c' }));
    cancelBtn.on('pointerdown', () => {
      this.combatPreviewConfirmMode = false;
      this.pendingCombatTarget = null;
      this.hideCombatPreview();
    });

    overlay.add([confirmBtn, cancelBtn]);
  }

  private hideCombatPreview(): void {
    if (this.combatPreviewOverlay) {
      this.combatPreviewOverlay.destroy();
      this.combatPreviewOverlay = null;
    }
  }

  private showChapterStartAnimation(onComplete: () => void): void {
    this.inputEnabled = false;
    const overlay = this.add.container(0, 0);
    overlay.setScrollFactor(0);
    overlay.setDepth(100);

    const match = this.currentLevelId.match(/level-(\d+)/);
    const chapterNum = match ? match[1] : this.currentLevelId;
    const level = getLevel(this.currentLevelId);
    const chapterTitle = level ? level.name : '';

    const bg = this.add.rectangle(
      this.cameras.main.width / 2,
      this.cameras.main.height * 0.4,
      this.cameras.main.width,
      120,
      0x000000,
      0.8,
    );

    const chapterText = this.add
      .text(
        this.cameras.main.width / 2,
        this.cameras.main.height * 0.4 - 20,
        `Chapter ${chapterNum}`,
        {
          fontSize: '28px',
          color: '#f1c40f',
          fontStyle: 'bold',
          stroke: '#000000',
          strokeThickness: 4,
        },
      )
      .setOrigin(0.5)
      .setAlpha(0);

    const titleText = this.add
      .text(
        this.cameras.main.width / 2,
        this.cameras.main.height * 0.4 + 20,
        chapterTitle,
        {
          fontSize: '20px',
          color: '#ecf0f1',
          fontStyle: 'bold',
          stroke: '#000000',
          strokeThickness: 3,
        },
      )
      .setOrigin(0.5)
      .setAlpha(0);

    overlay.add([bg, chapterText, titleText]);

    const timing = new TurnBannerTiming();
    const timer = this.time.addEvent({
      delay: 16,
      callback: () => {
        timing.update(16);
        chapterText.setAlpha(timing.textAlpha);
        titleText.setAlpha(timing.textAlpha);
        overlay.setAlpha(timing.overlayAlpha);
        const offsetY = (1 - timing.bannerProgress) * -40;
        bg.setY(this.cameras.main.height * 0.4 + offsetY);
        chapterText.setY(this.cameras.main.height * 0.4 - 20 + offsetY);
        titleText.setY(this.cameras.main.height * 0.4 + 20 + offsetY);

        if (timing.isComplete()) {
          timer.destroy();
          overlay.destroy();
          onComplete();
        }
      },
      loop: true,
    });
  }

  private showTurnBanner(turnNumber: number, onComplete: () => void): void {
    this.inputEnabled = false;
    const overlay = this.add.container(0, 0);
    overlay.setScrollFactor(0);
    overlay.setDepth(100);
    const bg = this.add.rectangle(
      this.cameras.main.width / 2,
      this.cameras.main.height * 0.4,
      this.cameras.main.width,
      80,
      0x000000,
      0.7,
    );
    const text = this.add
      .text(
        this.cameras.main.width / 2,
        this.cameras.main.height * 0.4,
        `Turn ${turnNumber.toString()}`,
        {
          fontSize: '36px',
          color: '#f1c40f',
          fontStyle: 'bold',
          stroke: '#000000',
          strokeThickness: 4,
        },
      )
      .setOrigin(0.5)
      .setAlpha(0);
    overlay.add([bg, text]);

    const timing = new TurnBannerTiming();
    const timer = this.time.addEvent({
      delay: 16,
      callback: () => {
        timing.update(16);
        text.setAlpha(timing.textAlpha);
        overlay.setAlpha(timing.overlayAlpha);
        // Slide banner in during FADE_IN
        const offsetY = (1 - timing.bannerProgress) * -40;
        bg.setY(this.cameras.main.height * 0.4 + offsetY);
        text.setY(this.cameras.main.height * 0.4 + offsetY);

        if (timing.isComplete()) {
          timer.destroy();
          overlay.destroy();
          onComplete();
        }
      },
      loop: true,
    });
  }

  private beginPlayerPhase(): void {
    if (!this.engine.turnManager.isPlayerPhase()) {
      return;
    }
    this.playCutsceneIfTriggered({ eventType: 'on_turn_start', faction: 'player' }, () => {
      const rowan = this.engine.getAllUnits().find((u) => u.id === 'rowan' && u.isAlive);
      if (rowan) {
        this.panCameraToUnit({ x: rowan.gridX, y: rowan.gridY });
      }
      if (this.bannerShownForTurn === this.engine.turnManager.turnNumber) {
        this.inputEnabled = true;
        return;
      }
      this.showTurnBanner(this.engine.turnManager.turnNumber, () => {
        this.inputEnabled = true;
      });
      this.bannerShownForTurn = this.engine.turnManager.turnNumber;
    });
  }

  private playCutsceneIfTriggered(ctx: TriggerContext, onResume?: () => void): void {
    const trigger = this.engine.evaluateTrigger(ctx);
    if (!trigger || !hasCutscene(trigger.cutsceneId)) {
      onResume?.();
      return;
    }
    this.preCutsceneInputEnabled = this.inputEnabled;
    this.inputEnabled = false;
    this.scene.launch('CutsceneScene', {
      cutsceneId: trigger.cutsceneId,
      overlay: true,
      onComplete: () => {
        this.inputEnabled = this.preCutsceneInputEnabled;
        onResume?.();
      },
    });
  }

  private playDeadUnitTriggers(deadUnits: Unit[], index: number, onDone: () => void): void {
    if (index >= deadUnits.length) {
      onDone();
      return;
    }
    const dead = deadUnits[index];
    const attacker = this.battleDisplayState?.attacker;
    this.playCutsceneIfTriggered(
      { eventType: 'on_kill', killerId: attacker?.id, victimId: dead.id },
      () => {
        this.playCutsceneIfTriggered({ eventType: 'on_death', unitId: dead.id }, () => {
          this.playDeadUnitTriggers(deadUnits, index + 1, onDone);
        });
      },
    );
  }

  private showExpPopup(
    unit: Unit,
    progression: import('../game/progression/ProgressionEngine').ProgressionResult,
    onComplete: () => void,
  ): void {
    const startExp = unit.exp - progression.expGained;
    const popup = new ExpPopup(startExp, unit.exp, progression.leveledUp);

    const cx = this.cameras.main.width / 2;
    const cy = this.cameras.main.height / 2;

    const container = this.add.container(cx, cy);
    container.setScrollFactor(0);
    this.expPopupContainer = container;

    // Background panel
    const panel = this.add.rectangle(0, 0, 280, 120, 0x1a1a2e, 0.95);
    panel.setStrokeStyle(2, 0xf1c40f);
    container.add(panel);

    // Title
    const title = this.add
      .text(0, -36, `${unit.name} +${progression.expGained.toString()} EXP`, {
        fontSize: '18px',
        color: '#f1c40f',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    container.add(title);

    // Bar background
    const barBg = this.add.rectangle(0, -4, 200, 16, 0x000000);
    barBg.setStrokeStyle(1, 0xffffff);
    container.add(barBg);

    // Bar fill (initially at startExp width)
    const startRatio = startExp / 100;
    const barFill = this.add.rectangle(-100 + 100 * startRatio, -4, 200 * startRatio, 14, 0x3498db);
    barFill.setName('barFill');
    container.add(barFill);

    // EXP text
    const expText = this.add
      .text(0, 22, `EXP: ${startExp.toString()} / 100`, {
        fontSize: '14px',
        color: '#ecf0f1',
      })
      .setOrigin(0.5)
      .setName('expText');
    container.add(expText);

    // Level text
    const levelText = this.add
      .text(0, 42, `Lv ${unit.level.toString()}`, {
        fontSize: '14px',
        color: '#bdc3c7',
      })
      .setOrigin(0.5);
    container.add(levelText);

    // Animate bar fill using a repeating timer
    const timer = this.time.addEvent({
      delay: 16,
      callback: () => {
        popup.update(16);
        const ratio = popup.getFillRatio();
        const currentWidth = 200 * ratio;
        barFill.setSize(currentWidth, 14);
        barFill.setPosition(-100 + currentWidth / 2, -4);
        expText.setText(`EXP: ${popup.currentExp.toString()} / 100`);

        if (popup.isComplete()) {
          timer.remove();
          if (popup.leveledUp) {
            this.showLevelUpSequence(unit, progression, () => {
              this.hideExpPopup();
              this.handlePostLevelUp(unit, onComplete);
            });
          } else {
            this.time.delayedCall(600, () => {
              this.hideExpPopup();
              onComplete();
            });
          }
        }
      },
      loop: true,
    });
  }

  private hideExpPopup(): void {
    this.expPopupContainer?.destroy();
    this.expPopupContainer = null;
  }

  private showLevelUpSequence(
    unit: Unit,
    progression: import('../game/progression/ProgressionEngine').ProgressionResult,
    onComplete: () => void,
  ): void {
    if (!progression.levelUpResult || !progression.oldStats) {
      onComplete();
      return;
    }

    const display = new LevelUpDisplay(
      unit.name,
      unit.level,
      progression.oldStats,
      progression.levelUpResult.newStats,
      progression.levelUpResult.increases,
    );

    const cx = this.cameras.main.width / 2;
    const cy = this.cameras.main.height / 2;

    const container = this.add.container(cx, cy);
    container.setScrollFactor(0);
    container.setDepth(100);
    // ---- BANNER ----
    const bannerBg = this.add.rectangle(0, -120, 320, 56, 0x27ae60, 0.95);
    bannerBg.setStrokeStyle(3, 0xf1c40f);
    container.add(bannerBg);

    const bannerText = this.add
      .text(0, -120, `LEVEL UP!  ${display.unitName} \u2192 Lv ${display.newLevel.toString()}`, {
        fontSize: '20px',
        color: '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    container.add(bannerText);

    // ---- STATS PANEL ----
    const panel = this.add.rectangle(0, 40, 280, 320, 0x1a1a2e, 0.95);
    panel.setStrokeStyle(2, 0x34495e);
    panel.setAlpha(0);
    container.add(panel);

    const panelTitle = this.add
      .text(0, -100, 'Stat Growth', {
        fontSize: '16px',
        color: '#f1c40f',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setAlpha(0);
    container.add(panelTitle);

    const statKeys: (keyof import('../game/units/Stats').UnitStats)[] = [
      'hp',
      'str',
      'mag',
      'skl',
      'spd',
      'luk',
      'def',
      'res',
      'mov',
    ];
    const statLabels: Record<string, string> = {
      hp: 'HP',
      str: 'Str',
      mag: 'Mag',
      skl: 'Skl',
      spd: 'Spd',
      luk: 'Luk',
      def: 'Def',
      res: 'Res',
      mov: 'Mov',
    };

    const statTexts: Phaser.GameObjects.Text[] = [];
    const startY = -70;
    const rowHeight = 28;

    for (let i = 0; i < statKeys.length; i++) {
      const key = statKeys[i];
      const y = startY + i * rowHeight;

      const nameText = this.add
        .text(-80, y, statLabels[key as string] ?? key, {
          fontSize: '14px',
          color: '#bdc3c7',
        })
        .setOrigin(0, 0.5)
        .setAlpha(0);
      container.add(nameText);

      const oldVal = (progression.oldStats![key] ?? 0).toString();
      const newVal = (progression.levelUpResult!.newStats[key] ?? 0).toString();
      const increased = display.isIncreased(key);

      const valueText = this.add
        .text(60, y, `${oldVal} \u2192 ${newVal}${increased ? ' \u25b2' : ''}`, {
          fontSize: '14px',
          color: increased ? '#f1c40f' : '#bdc3c7',
          fontStyle: increased ? 'bold' : 'normal',
        })
        .setOrigin(1, 0.5)
        .setAlpha(0);
      container.add(valueText);

      statTexts.push(nameText, valueText);
    }

    const hintText = this.add
      .text(0, 200, '', {
        fontSize: '12px',
        color: '#7f8c8d',
        fontStyle: 'italic',
      })
      .setOrigin(0.5)
      .setAlpha(0);
    container.add(hintText);

    // ---- ANIMATION LOOP ----
    const timer = this.time.addEvent({
      delay: 16,
      callback: () => {
        display.update(16);

        // Banner entrance
        if (display.phase === LEVEL_UP_PHASE.BANNER_IN) {
          const t = Math.min(1, display.elapsed / 300);
          bannerBg.setAlpha(t * 0.95);
          bannerText.setAlpha(t);
          bannerBg.setPosition(0, -120 + (1 - t) * -40);
          bannerText.setPosition(0, -120 + (1 - t) * -40);
        } else {
          bannerBg.setAlpha(0.95);
          bannerText.setAlpha(1);
          bannerBg.setPosition(0, -120);
          bannerText.setPosition(0, -120);
        }

        // Stats panel entrance (also during counting)
        if (
          display.phase === LEVEL_UP_PHASE.STATS_IN ||
          display.phase === LEVEL_UP_PHASE.STAT_REVEAL ||
          display.phase === LEVEL_UP_PHASE.STAT_COUNTING
        ) {
          const panelT = Math.min(1, (display.elapsed - 1100) / 400);
          panel.setAlpha(panelT * 0.95);
          panelTitle.setAlpha(panelT);
        }

        // Per-stat reveal + counting values
        if (
          display.phase === LEVEL_UP_PHASE.STAT_REVEAL ||
          display.phase === LEVEL_UP_PHASE.STAT_COUNTING ||
          display.phase === LEVEL_UP_PHASE.WAIT_FOR_INPUT ||
          display.phase === LEVEL_UP_PHASE.DONE
        ) {
          for (let i = 0; i < statKeys.length; i++) {
            const key = statKeys[i];
            const progress = display.getRevealProgress(key);
            const nameText = statTexts[i * 2];
            const valueText = statTexts[i * 2 + 1];
            nameText.setAlpha(progress);
            valueText.setAlpha(progress);

            // During counting phase, animate the number counting up
            if (
              display.isIncreased(key) &&
              (display.phase === LEVEL_UP_PHASE.STAT_COUNTING ||
                display.phase === LEVEL_UP_PHASE.WAIT_FOR_INPUT ||
                display.phase === LEVEL_UP_PHASE.DONE)
            ) {
              const currentVal = display.getCurrentValue(key).toString();
              const oldVal = (progression.oldStats![key] ?? 0).toString();
              const increased = display.isIncreased(key);
              const isCounting = display.isCounting(key);
              valueText.setText(`${oldVal} \\u2192 ${currentVal}${increased ? ' \\u25b2' : ''}`);
              valueText.setColor(isCounting ? '#27ae60' : increased ? '#f1c40f' : '#bdc3c7');
            }
          }
        }

        // Show dismiss hint
        if (display.phase === LEVEL_UP_PHASE.WAIT_FOR_INPUT) {
          hintText.setText('Click or press SPACE to continue');
          hintText.setAlpha(1);
        }

        // Done
        if (display.isComplete()) {
          timer.remove();
          this.hideLevelUpSequence();
          onComplete();
        }
      },
      loop: true,
    });

    this.levelUpSequence = { display, container, timer };
    this.updateSaveBtnVisibility();

    // Input handlers for dismissal
    const dismissHandler = () => {
      if (this.levelUpSequence?.display.phase === LEVEL_UP_PHASE.WAIT_FOR_INPUT) {
        this.levelUpSequence.display.dismiss();
      }
    };

    this.input.once('pointerdown', dismissHandler);
    this.input.keyboard?.once('keydown-SPACE', dismissHandler);
  }

  private hideLevelUpSequence(): void {
    this.levelUpSequence?.timer.remove();
    this.levelUpSequence?.container.destroy();
    this.levelUpSequence = null;
    this.updateSaveBtnVisibility();
  }

  private handlePostLevelUp(unit: Unit, onComplete: () => void): void {
    if (!this.engine.canPromote(unit)) {
      onComplete();
      return;
    }
    this.showPromotionPrompt(unit, (accepted) => {
      if (accepted) {
        const result = this.engine.promote(unit);
        if (result.success) {
          this.showPromotionSequence(result, () => {
            onComplete();
          });
          return;
        }
      }
      onComplete();
    });
  }

  private showPromotionPrompt(unit: Unit, callback: (accepted: boolean) => void): void {
    this.inputEnabled = false;
    const container = this.add.container(0, 0);
    const cx = this.cameras.main.width / 2;
    const cy = this.cameras.main.height / 2;

    const bg = this.add.rectangle(
      cx,
      cy,
      this.cameras.main.width,
      this.cameras.main.height,
      0x000000,
      0.6,
    );
    container.add(bg);

    const panel = this.add.rectangle(cx, cy, 340, 180, 0x1a1a2e, 0.95);
    panel.setStrokeStyle(2, 0xf1c40f);
    container.add(panel);

    const promotedClass = getPromotedClass(unit.unitClass);
    const classTitle = promotedClass ?? 'promoted class';
    const title = this.add
      .text(cx, cy - 40, `Promote ${unit.name} to ${classTitle}?`, {
        fontSize: '18px',
        color: '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    container.add(title);

    const yesBtn = this.add
      .text(cx - 60, cy + 30, 'YES', {
        fontSize: '16px',
        color: '#2ecc71',
        fontStyle: 'bold',
        backgroundColor: '#1a1a2e',
        padding: { x: 16, y: 8 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    container.add(yesBtn);

    const noBtn = this.add
      .text(cx + 60, cy + 30, 'NO', {
        fontSize: '16px',
        color: '#e74c3c',
        fontStyle: 'bold',
        backgroundColor: '#1a1a2e',
        padding: { x: 16, y: 8 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    container.add(noBtn);

    const cleanup = (accepted: boolean) => {
      container.destroy();
      this.inputEnabled = true;
      callback(accepted);
    };

    yesBtn.on('pointerdown', () => cleanup(true));
    noBtn.on('pointerdown', () => cleanup(false));
  }

  private showPromotionSequence(
    result: import('../game/promotion/PromotionEngine').PromotionResult,
    onComplete: () => void,
  ): void {
    const cx = this.cameras.main.width / 2;
    const cy = this.cameras.main.height / 2;
    const display = new PromotionDisplay(
      result.unitName,
      result.oldClass,
      result.newClass!,
      result.oldStats,
      result.newStats,
      result.diff,
    );

    const container = this.add.container(cx, cy);
    container.setScrollFactor(0);
    container.setDepth(100);

    const bannerBg = this.add.rectangle(0, -120, 320, 56, 0x8e44ad, 0.95);
    bannerBg.setStrokeStyle(3, 0xf1c40f);
    container.add(bannerBg);

    const bannerText = this.add
      .text(0, -120, `PROMOTION!  ${result.unitName} \u2192 ${result.newClass}`, {
        fontSize: '20px',
        color: '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    container.add(bannerText);

    const classText = this.add
      .text(0, -60, `${result.oldClass} \u2192 ${result.newClass}`, {
        fontSize: '16px',
        color: '#f1c40f',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setAlpha(0);
    container.add(classText);

    const statKeys: (keyof import('../game/units/Stats').UnitStats)[] = [
      'hp',
      'str',
      'mag',
      'skl',
      'spd',
      'luk',
      'def',
      'res',
      'mov',
    ];
    const statLabels: Record<string, string> = {
      hp: 'HP',
      str: 'Str',
      mag: 'Mag',
      skl: 'Skl',
      spd: 'Spd',
      luk: 'Luk',
      def: 'Def',
      res: 'Res',
      mov: 'Mov',
    };

    const statTexts: Phaser.GameObjects.Text[] = [];
    const startY = -20;
    const rowHeight = 28;

    for (let i = 0; i < statKeys.length; i++) {
      const key = statKeys[i];
      const y = startY + i * rowHeight;

      const nameText = this.add
        .text(-80, y, statLabels[key as string] ?? key, {
          fontSize: '14px',
          color: '#bdc3c7',
        })
        .setOrigin(0, 0.5)
        .setAlpha(0);
      container.add(nameText);

      const diff = result.diff[key] ?? 0;
      const diffStr = diff > 0 ? `+${diff.toString()}` : diff.toString();
      const color = diff > 0 ? '#2ecc71' : '#bdc3c7';

      const valueText = this.add
        .text(60, y, diffStr, {
          fontSize: '14px',
          color,
          fontStyle: diff > 0 ? 'bold' : 'normal',
        })
        .setOrigin(1, 0.5)
        .setAlpha(0);
      container.add(valueText);

      statTexts.push(nameText, valueText);
    }

    const hintText = this.add
      .text(0, 200, '', {
        fontSize: '12px',
        color: '#7f8c8d',
        fontStyle: 'italic',
      })
      .setOrigin(0.5)
      .setAlpha(0);
    container.add(hintText);

    const timer = this.time.addEvent({
      delay: 16,
      callback: () => {
        display.update(16);

        if (display.phase === PROMOTION_PHASE.BANNER_IN) {
          const t = Math.min(1, display.elapsed / 300);
          bannerBg.setAlpha(t * 0.95);
          bannerText.setAlpha(t);
          bannerBg.setPosition(0, -120 + (1 - t) * -40);
          bannerText.setPosition(0, -120 + (1 - t) * -40);
        } else {
          bannerBg.setAlpha(0.95);
          bannerText.setAlpha(1);
          bannerBg.setPosition(0, -120);
          bannerText.setPosition(0, -120);
        }

        if (
          display.phase === PROMOTION_PHASE.CLASS_REVEAL ||
          display.phase === PROMOTION_PHASE.STATS_IN ||
          display.phase === PROMOTION_PHASE.STAT_REVEAL ||
          display.phase === PROMOTION_PHASE.WAIT_FOR_INPUT ||
          display.phase === PROMOTION_PHASE.DONE
        ) {
          const classT = Math.min(1, (display.elapsed - 600) / 400);
          classText.setAlpha(classT);
        }

        if (
          display.phase === PROMOTION_PHASE.STATS_IN ||
          display.phase === PROMOTION_PHASE.STAT_REVEAL ||
          display.phase === PROMOTION_PHASE.WAIT_FOR_INPUT ||
          display.phase === PROMOTION_PHASE.DONE
        ) {
          for (let i = 0; i < statKeys.length; i++) {
            const progress = display.getRevealProgress(statKeys[i]);
            const nameText = statTexts[i * 2];
            const valueText = statTexts[i * 2 + 1];
            nameText.setAlpha(progress);
            valueText.setAlpha(progress);
          }
        }

        if (display.phase === PROMOTION_PHASE.WAIT_FOR_INPUT) {
          hintText.setText('Click or press SPACE to continue');
          hintText.setAlpha(1);
        }

        if (display.isComplete()) {
          timer.remove();
          this.hidePromotionSequence();
          onComplete();
        }
      },
      loop: true,
    });

    this.promotionSequence = { display, container, timer };
    this.updateSaveBtnVisibility();

    const dismissHandler = () => {
      if (this.promotionSequence?.display.phase === PROMOTION_PHASE.WAIT_FOR_INPUT) {
        this.promotionSequence.display.dismiss();
      }
    };

    this.input.once('pointerdown', dismissHandler);
    this.input.keyboard?.once('keydown-SPACE', dismissHandler);
  }

  private hidePromotionSequence(): void {
    this.promotionSequence?.timer.remove();
    this.promotionSequence?.container.destroy();
    this.promotionSequence = null;
    this.updateSaveBtnVisibility();
  }

  private showItemMenu(unit: Unit): void {
    this.inputEnabled = false;
    const overlay = this.add.container(0, 0);
    overlay.setScrollFactor(0);
    overlay.setDepth(99);
    const bg = this.add
      .rectangle(
        this.cameras.main.width / 2,
        this.cameras.main.height / 2,
        this.cameras.main.width,
        this.cameras.main.height,
        0x000000,
        0.7,
      )
      .setInteractive();
    bg.on(
      'pointerdown',
      (_p: Phaser.Input.Pointer, _lx: number, _ly: number, event: Phaser.Types.Input.EventData) => {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call
        event.stopPropagation();
        this.hideItemMenu(false);
      },
    );
    overlay.add(bg);

    const cx = this.cameras.main.width / 2;
    const cy = this.cameras.main.height / 2;

    const panel = this.add.rectangle(cx, cy, 280, 320, 0x2c3e50, 0.95);
    panel.setStrokeStyle(2, 0x8e44ad);
    overlay.add(panel);

    const title = this.add
      .text(cx, cy - 130, 'Items', {
        fontSize: '18px',
        color: '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    overlay.add(title);

    const items = unit.inventory.items;
    this.itemMenu.open(items.map((i) => ({ name: i.name, uses: i.uses })));

    if (items.length === 0) {
      const noneText = this.add
        .text(cx, cy, 'No items', {
          fontSize: '14px',
          color: '#bdc3c7',
        })
        .setOrigin(0.5);
      overlay.add(noneText);
    } else {
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const y = cy - 80 + i * 32;
        const itemText = this.add
          .text(cx, y, `${item.name} x${item.uses}`, {
            fontSize: '14px',
            color: '#ffffff',
            backgroundColor: '#34495e',
            padding: { x: 8, y: 4 },
          })
          .setOrigin(0.5)
          .setInteractive({ useHandCursor: true });

        itemText.on(
          'pointerdown',
          (
            _pointer: Phaser.Input.Pointer,
            _localX: number,
            _localY: number,
            event: Phaser.Types.Input.EventData,
          ) => {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-call
            event.stopPropagation();
            this.showItemConfirm(unit, item, i);
          },
        );

        overlay.add(itemText);
      }
    }

    const closeBtn = this.add
      .text(cx, cy + 130, '[ Close ]', {
        fontSize: '14px',
        color: '#ffffff',
        backgroundColor: '#c0392b',
        padding: { x: 8, y: 4 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    closeBtn.on(
      'pointerdown',
      (
        _pointer: Phaser.Input.Pointer,
        _localX: number,
        _localY: number,
        event: Phaser.Types.Input.EventData,
      ) => {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call
        event.stopPropagation();
        this.hideItemMenu(false);
      },
    );

    overlay.add(closeBtn);
    this.itemOverlay = overlay;

    // ESC key to dismiss
    this.input.keyboard?.once('keydown-ESC', () => {
      this.hideItemMenu(false);
    });

    this.updateSaveBtnVisibility();
  }

  private showItemConfirm(unit: Unit, item: Item, index: number): void {
    this.itemMenu.selectItem(index);
    this.itemOverlay?.destroy();
    this.itemOverlay = null;

    const overlay = this.add.container(0, 0);
    overlay.setScrollFactor(0);
    overlay.setDepth(99);
    const bg = this.add.rectangle(
      this.cameras.main.width / 2,
      this.cameras.main.height / 2,
      this.cameras.main.width,
      this.cameras.main.height,
      0x000000,
      0.7,
    );
    overlay.add(bg);

    const cx = this.cameras.main.width / 2;
    const cy = this.cameras.main.height / 2;

    const panel = this.add.rectangle(cx, cy, 260, 180, 0x2c3e50, 0.95);
    panel.setStrokeStyle(2, 0x8e44ad);
    overlay.add(panel);

    const confirmText = this.add
      .text(cx, cy - 40, `Use ${item.name}?`, {
        fontSize: '16px',
        color: '#ffffff',
      })
      .setOrigin(0.5);
    overlay.add(confirmText);

    const yesBtn = this.add
      .text(cx - 50, cy + 20, '[ Yes ]', {
        fontSize: '14px',
        color: '#ffffff',
        backgroundColor: '#27ae60',
        padding: { x: 12, y: 6 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    yesBtn.on(
      'pointerdown',
      (
        _pointer: Phaser.Input.Pointer,
        _localX: number,
        _localY: number,
        event: Phaser.Types.Input.EventData,
      ) => {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call
        event.stopPropagation();
        if (item.kind === 'promotion') {
          const result = this.engine.useItem(unit, index);
          if (result.success && result.promotionResult) {
            this.itemMenu.confirmUse();
            this.hideItemMenu(true);
            this.showPromotionSequence(result.promotionResult, () => {});
          } else {
            this.itemMenu.cancel();
            this.hideItemMenu(false);
          }
        } else {
          unit.inventory.useAt(index);
          this.applyItemEffect(unit, item);
          this.itemMenu.confirmUse();
          this.hideItemMenu(true);
        }
      },
    );

    const noBtn = this.add
      .text(cx + 50, cy + 20, '[ No ]', {
        fontSize: '14px',
        color: '#ffffff',
        backgroundColor: '#c0392b',
        padding: { x: 12, y: 6 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    noBtn.on(
      'pointerdown',
      (
        _pointer: Phaser.Input.Pointer,
        _localX: number,
        _localY: number,
        event: Phaser.Types.Input.EventData,
      ) => {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call
        event.stopPropagation();
        this.itemMenu.cancel();
        this.hideItemMenu(false);
      },
    );

    overlay.add(yesBtn);
    overlay.add(noBtn);
    this.itemOverlay = overlay;
  }

  private applyItemEffect(unit: Unit, item: Item): void {
    if (item.kind === 'recovery') {
      const heal = Math.min(item.healAmount, unit.stats.maxHp - unit.stats.hp);
      if (heal > 0) {
        unit.takeDamage(-heal);
      }
    }
  }

  private hideItemMenu(didUse: boolean): void {
    this.itemOverlay?.destroy();
    this.itemOverlay = null;
    this.itemMenu.close();
    this.inputEnabled = true;

    if (didUse) {
      const unit = this.battleMenu.unit;
      if (unit) {
        unit.state.transition(UNIT_STATE.EXHAUSTED);
        this.clearMenuTexts();
        this.syncUnitSprites();
        this.checkAutoEndTurn();
      }
    } else {
      const unit = this.battleMenu.unit;
      if (unit) {
        this.battleMenu.show(unit, this.engine.getAdjacentEnemies(unit));
        this.showPostMoveMenu(unit);
      }
    }
  }

  private openSaveMenu(): void {
    if (this.saveMenuContainer) return;
    this.inputEnabled = false;

    const container = this.add.container(0, 0);
    container.setDepth(100);
    this.saveMenuContainer = container;

    const cx = this.cameras.main.width / 2;
    const cy = this.cameras.main.height / 2;

    const dim = this.add.rectangle(
      cx,
      cy,
      this.cameras.main.width,
      this.cameras.main.height,
      0x000000,
      0.7,
    );
    container.add(dim);

    const panel = this.add.rectangle(cx, cy, 400, 320, 0x2c3e50, 0.95);
    panel.setStrokeStyle(2, 0x3498db);
    container.add(panel);

    const title = this.add
      .text(cx, cy - 130, 'Save Game', {
        fontSize: '20px',
        color: '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    container.add(title);

    const mgr = new SaveManager();
    const saves = mgr.listSaves();
    const saveMap = new Map<string, { levelId: string; turnNumber: number }>();
    for (const save of saves) {
      saveMap.set(save.slot, { levelId: save.meta.levelId, turnNumber: save.meta.turnNumber });
    }

    for (let i = 0; i < 5; i++) {
      const slot = `slot_${i}`;
      const existing = saveMap.get(slot);
      const label = existing
        ? `${i + 1}. ${existing.levelId} — Turn ${existing.turnNumber}`
        : `${i + 1}. [ Empty ]`;
      const y = cy - 60 + i * 45;

      const slotText = this.add
        .text(cx, y, label, {
          fontSize: '14px',
          color: '#ecf0f1',
          backgroundColor: '#34495e',
          padding: { x: 10, y: 5 },
        })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true });

      slotText.on('pointerover', () => slotText.setStyle({ color: '#f1c40f' }));
      slotText.on('pointerout', () => slotText.setStyle({ color: '#ecf0f1' }));
      slotText.on(
        'pointerdown',
        (
          _pointer: Phaser.Input.Pointer,
          _localX: number,
          _localY: number,
          event: Phaser.Types.Input.EventData,
        ) => {
          event.stopPropagation();
          mgr.save(slot, this.engine.snapshot(this.currentLevelId));
          this.closeSaveMenu();
          const confirm = this.add
            .text(cx, cy + 140, 'Game Saved!', {
              fontSize: '16px',
              color: '#2ecc71',
              fontStyle: 'bold',
            })
            .setOrigin(0.5);
          this.time.delayedCall(1200, () => confirm.destroy());
        },
      );

      container.add(slotText);
    }

    const cancelBtn = this.add
      .text(cx, cy + 140, '[ Cancel ]', {
        fontSize: '14px',
        color: '#e74c3c',
        backgroundColor: '#1a1a2e',
        padding: { x: 12, y: 6 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    cancelBtn.on('pointerover', () => cancelBtn.setStyle({ color: '#ff6b6b' }));
    cancelBtn.on('pointerout', () => cancelBtn.setStyle({ color: '#e74c3c' }));
    cancelBtn.on(
      'pointerdown',
      (
        _pointer: Phaser.Input.Pointer,
        _localX: number,
        _localY: number,
        event: Phaser.Types.Input.EventData,
      ) => {
        event.stopPropagation();
        this.closeSaveMenu();
      },
    );

    container.add(cancelBtn);
  }

  private closeSaveMenu(): void {
    this.saveMenuContainer?.destroy();
    this.saveMenuContainer = null;
    this.inputEnabled = true;
    this.updateSaveBtnVisibility();
  }
}
