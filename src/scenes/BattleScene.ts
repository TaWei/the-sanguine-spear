import Phaser from 'phaser';
import { TILE_SIZE } from '../constants';
import { GameEngine } from '../game/GameEngine';
import { Unit, Faction, UnitClass } from '../game/units/Unit';
import { createStats } from '../game/units/Stats';
import { TerrainType } from '../game/map/Terrain';
import { WEAPON_DB } from '../game/combat/Weapons';
import { BattleMenu, MenuState, MenuAction } from '../game/ui/BattleMenu';
import { BattleDisplayState, BattlePhase } from '../game/ui/BattleDisplayState';
import { UNIT_STATE } from '../game/state/UnitState';
import { EnemyPreview } from '../game/ui/EnemyPreview';
import { getLevel } from '../game/levels/LevelData';

const TERRAIN_COLORS: Record<string, number> = {
  plains: 0x8fbc8f,
  forest: 0x228b22,
  mountain: 0x808080,
  water: 0x4682b4,
  wall: 0x2f4f4f,
  lava: 0xff4500,
  cliff: 0xa0522d,
};

const FACTION_COLORS: Record<string, number> = {
  player: 0x3498db,
  enemy: 0xe74c3c,
  ally: 0x2ecc71,
};

function getWeaponForUnit(unit: Unit) {
  if (unit.unitClass === UnitClass.MAGE) {
    return WEAPON_DB.Fire;
  }
  if (unit.unitClass === UnitClass.BRIGAND) {
    return WEAPON_DB['Iron Axe'];
  }
  if (unit.unitClass === UnitClass.SOLDIER) {
    return WEAPON_DB['Iron Lance'];
  }
  return WEAPON_DB['Iron Sword'];
}

export class BattleScene extends Phaser.Scene {
  private engine!: GameEngine;
  private tileRects: Phaser.GameObjects.Rectangle[][] = [];
  private unitSprites = new Map<string, Phaser.GameObjects.Container>();
  private moveGraphics!: Phaser.GameObjects.Graphics;
  private selectedUnit: Unit | null = null;
  private offsetX = 0;
  private offsetY = 0;
  private battleMenu!: BattleMenu;
  private enemyPreview: EnemyPreview;
  private menuTexts: Phaser.GameObjects.Text[] = [];
  private battleOverlay: Phaser.GameObjects.Container | null = null;
  private battleDisplayState: BattleDisplayState | null = null;
  private inBattleMode = false;
  private pendingBattleCallback: (() => void) | null = null;
  private phaseText!: Phaser.GameObjects.Text;
  private inputEnabled = true;
  private bannerShownForTurn = 0;
  private preMovePosition: { x: number; y: number } | null = null;
  private pathGraphics!: Phaser.GameObjects.Graphics;
  private isAnimatingMovement = false;

  constructor() {
    super({ key: 'BattleScene' });
    this.enemyPreview = new EnemyPreview();
  }

  create(data?: { levelId?: string }): void {
    this.cameras.main.fadeIn(500, 0, 0, 0);

    const levelId = data?.levelId ?? 'level-1';
    const level = getLevel(levelId);
    if (!level) {
      throw new Error(`Unknown level: ${levelId}`);
    }

    this.engine = new GameEngine(level.cols, level.rows);
    this.engine.loadLevel(level);

    this.offsetX = (this.cameras.main.width - level.cols * TILE_SIZE) / 2;
    this.offsetY = (this.cameras.main.height - level.rows * TILE_SIZE) / 2;

    this.moveGraphics = this.add.graphics();
    this.moveGraphics.setDepth(1);
    this.pathGraphics = this.add.graphics();
    this.pathGraphics.setDepth(2);

    this.createGridVisuals();
    this.syncTileColors();
    this.syncUnitSprites();
    this.setupInput();
    this.createUI();
    this.battleMenu = new BattleMenu();
    this.beginPlayerPhase();
  }

  private createGridVisuals(): void {
    for (let y = 0; y < this.engine.grid.rows; y++) {
      this.tileRects[y] = [];
      for (let x = 0; x < this.engine.grid.cols; x++) {
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

  private syncTileColors(): void {
    for (let y = 0; y < this.engine.grid.rows; y++) {
      for (let x = 0; x < this.engine.grid.cols; x++) {
        const terrain = this.engine.grid.getTerrain(x, y);
        const color = TERRAIN_COLORS[terrain] ?? TERRAIN_COLORS.plains;
        const rect = this.tileRects[y][x];
        rect.setFillStyle(color);
      }
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
      if (!this.engine.grid.isInBounds(gx, gy)) {
        if (this.battleMenu.isVisible && !this.isPointerOverMenuText(pointer.x, pointer.y)) {
          this.handleOutsideMenuClick();
        }
        return;
      }
      this.handleTileClick(gx, gy, pointer.x, pointer.y);
    });

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (!this.inputEnabled || !this.engine.turnManager.isPlayerPhase() || this.inBattleMode || this.isAnimatingMovement) {
        return;
      }
      const gx = Math.floor((pointer.x - this.offsetX) / TILE_SIZE);
      const gy = Math.floor((pointer.y - this.offsetY) / TILE_SIZE);
      if (!this.engine.grid.isInBounds(gx, gy)) {
        this.pathGraphics.clear();
        return;
      }
      this.handleTileHover(gx, gy);
    });
  }

  private handleTileClick(gx: number, gy: number, pointerX: number, pointerY: number): void {
    if (!this.inputEnabled || !this.engine.turnManager.isPlayerPhase() || this.inBattleMode || this.isAnimatingMovement) {
      return;
    }

    const clickedUnit = this.engine.getUnit(gx, gy);

    // If menu is open, handle menu/target selection or outside clicks
    if (this.battleMenu.isVisible) {
      if (this.battleMenu.state === MenuState.CHOOSE_TARGET) {
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
        if (!path) return;
        this.pathGraphics.clear();
        this.animatePathMovement(unitToMove, path, () => {
          this.engine.moveUnit(unitToMove, gx, gy);
          unitToMove.state.transition(UNIT_STATE.MOVING);
          unitToMove.state.transition(UNIT_STATE.MENU);
          this.showPostMoveMenu(unitToMove);
        });
        return;
      }
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
    if (clickedUnit && clickedUnit.faction === Faction.ENEMY) {
      this.showEnemyPreview(clickedUnit);
      return;
    }

    // Clicking elsewhere clears any active enemy preview
    if (this.enemyPreview.isActive) {
      this.clearEnemyPreview();
    }
  }

  private handleTileHover(gx: number, gy: number): void {
    if (!this.selectedUnit || this.battleMenu.isVisible) {
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
    if (!path || path.length === 0 || !this.selectedUnit) return;

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

  private animatePathMovement(unit: Unit, path: import('../game/map/Grid').GridNeighbor[], onComplete: () => void): void {
    const sprite = this.unitSprites.get(unit.id);
    if (!sprite) {
      this.isAnimatingMovement = false;
      onComplete();
      return;
    }

    this.isAnimatingMovement = true;
    let stepIndex = 0;
    const processStep = () => {
      if (stepIndex >= path.length) {
        this.isAnimatingMovement = false;
        onComplete();
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
      if (range.has(key)) return;
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
    this.moveGraphics.clear();
    this.enemyPreview.show(unit);
    this.selectedUnit = null;

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
      if (range.has(key)) return;
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

  private clearEnemyPreview(): void {
    this.enemyPreview.clear();
    this.moveGraphics.clear();
    this.pathGraphics.clear();
  }

  private createUI(): void {
    this.phaseText = this.add
      .text(16, 16, 'Phase: Player', {
        fontSize: '20px',
        color: '#ecf0f1',
        backgroundColor: '#2c3e50',
        padding: { x: 10, y: 6 },
      })
      .setScrollFactor(0);

    const endTurn = this.add
      .text(16, 60, '[ End Turn ]', {
        fontSize: '16px',
        color: '#ecf0f1',
        backgroundColor: '#c0392b',
        padding: { x: 10, y: 6 },
      })
      .setInteractive({ useHandCursor: true });

    endTurn.on('pointerdown', () => {
      this.triggerEndTurn();
    });
  }

  private updatePhaseText(): void {
    this.phaseText.setText(`Phase: ${this.engine.turnManager.isPlayerPhase() ? 'Player' : 'Enemy'}`);
  }

  private triggerEndTurn(): void {
    if (this.inBattleMode || this.isAnimatingMovement) return;

    this.selectedUnit = null;
    this.moveGraphics.clear();
    this.pathGraphics.clear();
    this.enemyPreview.clear();
    this.battleMenu.reset();
    this.clearMenuTexts();
    const report = this.engine.endTurn();
    this.showHazardDamage(report);
    this.syncUnitSprites();
    this.updatePhaseText();

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
        const report2 = this.engine.endTurn(); // Ally → Player
        this.showHazardDamage(report2);
        this.syncUnitSprites();
        this.updatePhaseText();
        this.beginPlayerPhase();
      });
    } else if (this.engine.turnManager.isPlayerPhase()) {
      this.beginPlayerPhase();
    }
  }

  private showHazardDamage(report: import('../game/hazards/TerrainHazardEngine').HazardReport): void {
    for (const entry of report.damagedUnits) {
      const px = this.offsetX + entry.unit.gridX * TILE_SIZE + TILE_SIZE / 2;
      const py = this.offsetY + entry.unit.gridY * TILE_SIZE + TILE_SIZE / 2;
      const text = this.add
        .text(px, py - 10, `-${entry.damage}`, {
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
        onComplete: () => text.destroy(),
      });
    }
  }

  private checkAutoEndTurn(): void {
    if (this.engine.allPlayerUnitsExhausted()) {
      this.time.delayedCall(400, () => {
        if (!this.engine.turnManager.isPlayerPhase()) return;
        this.triggerEndTurn();
      });
    }
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
        const moveX = action.x;
        const moveY = action.y;
        if (sprite) {
          const targetX = this.offsetX + moveX * TILE_SIZE + TILE_SIZE / 2;
          const targetY = this.offsetY + moveY * TILE_SIZE + TILE_SIZE / 2;
          this.tweens.add({
            targets: sprite,
            x: targetX,
            y: targetY,
            duration: 300,
            onComplete: () => {
              this.engine.moveUnit(action.actor, moveX, moveY);
              processNext(index + 1);
            },
          });
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
          this.startBattleMode(action.actor, target, () => {
            processNext(index + 1);
          });
        } else {
          processNext(index + 1);
        }
      } else {
        processNext(index + 1);
      }
    };

    processNext(0);
  }

  private showPostMoveMenu(unit: Unit): void {
    this.moveGraphics.clear();
    this.pathGraphics.clear();
    this.selectedUnit = null;

    const enemies = this.engine.getAdjacentEnemies(unit);
    this.battleMenu.show(unit, enemies);

    const px = this.offsetX + unit.gridX * TILE_SIZE + TILE_SIZE / 2;
    const py = this.offsetY + unit.gridY * TILE_SIZE - TILE_SIZE;

    const fightText = this.add
      .text(px, py, '[ Fight ]', {
        fontSize: '14px',
        color: '#ffffff',
        backgroundColor: enemies.length > 0 ? '#c0392b' : '#7f8c8d',
        padding: { x: 8, y: 4 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: enemies.length > 0 });

    const endText = this.add
      .text(px, py + 24, '[ End Turn ]', {
        fontSize: '14px',
        color: '#ffffff',
        backgroundColor: '#2c3e50',
        padding: { x: 8, y: 4 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    if (enemies.length > 0) {
      fightText.on('pointerdown', (_pointer, _localX, _localY, event: Phaser.Types.Input.EventData) => {
        event.stopPropagation();
        this.battleMenu.selectAction(MenuAction.FIGHT);
        this.clearMenuTexts();
        this.highlightEnemyTargets(enemies);
      });
    }

    endText.on('pointerdown', (_pointer, _localX, _localY, event: Phaser.Types.Input.EventData) => {
      event.stopPropagation();
      this.battleMenu.reset();
      unit.state.transition(UNIT_STATE.EXHAUSTED);
      this.clearMenuTexts();
      this.syncUnitSprites();
      this.checkAutoEndTurn();
    });

    this.menuTexts.push(fightText, endText);
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
    const unit = this.battleMenu.unit;
    if (!unit) return;

    if (this.preMovePosition) {
      const { x, y } = this.preMovePosition;
      this.engine.moveUnit(unit, x, y);
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
  }

  private handleOutsideMenuClick(): void {
    if (this.battleMenu.state === MenuState.CHOOSE_TARGET) {
      this.moveGraphics.clear();
      this.pathGraphics.clear();
      const unit = this.battleMenu.unit!;
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

  private handleMenuInput(gx: number, gy: number, clickedUnit: Unit | null): void {
    if (this.battleMenu.state === MenuState.CHOOSE_TARGET) {
      const validTarget = this.battleMenu.adjacentEnemies.find((e) => e.id === clickedUnit?.id);
      if (validTarget) {
        this.battleMenu.selectTarget(validTarget);
        this.clearMenuTexts();
        this.moveGraphics.clear();
        this.pathGraphics.clear();
        this.startBattleMode(this.battleMenu.unit!, validTarget);
      } else {
        // Cancel target selection, return to action menu
        this.moveGraphics.clear();
        this.pathGraphics.clear();
        const unit = this.battleMenu.unit!;
        const enemies = this.engine.getAdjacentEnemies(unit);
        this.battleMenu.show(unit, enemies);
        this.showPostMoveMenu(unit);
      }
    }
  }

  private startBattleMode(attacker: Unit, defender: Unit, onComplete?: () => void): void {
    this.inBattleMode = true;
    this.pendingBattleCallback = onComplete ?? null;
    const result = this.engine.resolvePlayerCombat(attacker, defender);
    this.battleDisplayState = new BattleDisplayState(attacker, defender, result.log);

    // Create overlay container
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

    // Attacker panel (left)
    const attX = this.cameras.main.width * 0.25;
    const attY = this.cameras.main.height * 0.5;
    const attPanel = this.createUnitBattlePanel(attacker, attX, attY, 0x3498db);
    overlay.add(attPanel);

    // Defender panel (right)
    const defX = this.cameras.main.width * 0.75;
    const defY = this.cameras.main.height * 0.5;
    const defPanel = this.createUnitBattlePanel(defender, defX, defY, 0xe74c3c);
    overlay.add(defPanel);

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
    this.time.delayedCall(800, () => this.runBattleAnimation());
  }

  private createUnitBattlePanel(
    unit: Unit,
    x: number,
    y: number,
    color: number,
  ): Phaser.GameObjects.Container {
    const panel = this.add.container(x, y);

    // Background box
    const box = this.add.rectangle(0, 0, 200, 140, 0x2c3e50, 0.9);
    box.setStrokeStyle(2, color);
    panel.add(box);

    // Name
    const nameText = this.add.text(0, -50, unit.name, {
      fontSize: '18px',
      color: '#ecf0f1',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    panel.add(nameText);

    // Class
    const classText = this.add.text(0, -30, unit.unitClass, {
      fontSize: '12px',
      color: '#bdc3c7',
    }).setOrigin(0.5);
    panel.add(classText);

    // HP label
    const hpLabel = this.add.text(-70, 10, 'HP', {
      fontSize: '12px',
      color: '#bdc3c7',
    }).setOrigin(0, 0.5);
    panel.add(hpLabel);

    // HP bar background
    const hpBg = this.add.rectangle(10, 10, 120, 12, 0x000000);
    panel.add(hpBg);

    // HP bar fill
    const hpRatio = unit.stats.hp / unit.stats.maxHp;
    const hpColor = hpRatio > 0.5 ? 0x2ecc71 : hpRatio > 0.25 ? 0xf1c40f : 0xe74c3c;
    const hpFill = this.add.rectangle(-50 + (120 * hpRatio) / 2, 10, 120 * hpRatio, 12, hpColor);
    hpFill.setName('hpFill');
    panel.add(hpFill);

    // HP text
    const hpText = this.add.text(10, 30, `${unit.stats.hp} / ${unit.stats.maxHp}`, {
      fontSize: '14px',
      color: '#ecf0f1',
    }).setOrigin(0.5);
    hpText.setName('hpText');
    panel.add(hpText);

    return panel;
  }

  private runBattleAnimation(): void {
    if (!this.battleDisplayState || !this.battleOverlay) return;

    const state = this.battleDisplayState;
    if (!state.canAdvance()) {
      this.endBattleMode();
      return;
    }

    state.advance();
    const entry = state.currentLogEntry;

    if (state.phase === BattlePhase.ATTACKER_STRIKE || state.phase === BattlePhase.DEFENDER_COUNTER) {
      // Flash the attacker
      const isCounter = state.phase === BattlePhase.DEFENDER_COUNTER;
      const target = isCounter ? state.attacker : state.defender;

      // Camera shake on hit
      if (entry && entry.hit) {
        this.cameras.main.shake(100, entry.critical ? 0.015 : 0.005);
      }

      this.time.delayedCall(400, () => {
        if (entry && entry.hit) {
          this.showDamageNumber(target, entry.damage, entry.critical);
        } else if (entry) {
          this.showMissText(target);
        }
        this.updateBattleHpBars();
        this.time.delayedCall(600, () => this.runBattleAnimation());
      });
    } else if (
      state.phase === BattlePhase.DEFENDER_RECOIL ||
      state.phase === BattlePhase.ATTACKER_RECOIL
    ) {
      // Recoil phase — just advance after brief pause
      this.time.delayedCall(300, () => this.runBattleAnimation());
    } else {
      this.time.delayedCall(200, () => this.runBattleAnimation());
    }
  }

  private showDamageNumber(target: Unit, damage: number, critical: boolean): void {
    if (!this.battleOverlay) return;
    const isLeft = target.id === this.battleDisplayState!.attacker.id;
    const x = this.cameras.main.width * (isLeft ? 0.25 : 0.75);
    const y = this.cameras.main.height * 0.5 - 80;

    const text = this.add.text(x, y, critical ? `${damage}!` : String(damage), {
      fontSize: critical ? '28px' : '22px',
      color: critical ? '#e74c3c' : '#ffffff',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 4,
    }).setOrigin(0.5);
    this.battleOverlay.add(text);

    this.tweens.add({
      targets: text,
      y: y - 40,
      alpha: 0,
      duration: 800,
      onComplete: () => text.destroy(),
    });
  }

  private showMissText(target: Unit): void {
    if (!this.battleOverlay) return;
    const isLeft = target.id === this.battleDisplayState!.attacker.id;
    const x = this.cameras.main.width * (isLeft ? 0.25 : 0.75);
    const y = this.cameras.main.height * 0.5 - 80;

    const text = this.add.text(x, y, 'Miss', {
      fontSize: '20px',
      color: '#95a5a6',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5);
    this.battleOverlay.add(text);

    this.tweens.add({
      targets: text,
      y: y - 30,
      alpha: 0,
      duration: 600,
      onComplete: () => text.destroy(),
    });
  }

  private updateBattleHpBars(): void {
    if (!this.battleDisplayState || !this.battleOverlay) return;
    const { attacker, defender } = this.battleDisplayState;

    // Update attacker HP bar
    this.updatePanelHp(attacker, 0x3498db);
    // Update defender HP bar
    this.updatePanelHp(defender, 0xe74c3c);
  }

  private updatePanelHp(unit: Unit, _color: number): void {
    const isLeft = unit.id === this.battleDisplayState!.attacker.id;
    const panelIndex = isLeft ? 1 : 2; // overlay children: bg, attPanel, defPanel, vsText
    const panel = this.battleOverlay!.getAt(panelIndex) as Phaser.GameObjects.Container;

    const hpRatio = Math.max(0, unit.stats.hp / unit.stats.maxHp);
    const hpColor = hpRatio > 0.5 ? 0x2ecc71 : hpRatio > 0.25 ? 0xf1c40f : 0xe74c3c;

    const oldFill = panel.getByName('hpFill') as Phaser.GameObjects.Rectangle;
    if (oldFill) {
      oldFill.destroy();
    }
    const newFill = this.add.rectangle(
      -50 + (120 * hpRatio) / 2,
      10,
      120 * hpRatio,
      12,
      hpColor,
    );
    newFill.setName('hpFill');
    panel.add(newFill);

    const hpText = panel.getByName('hpText') as Phaser.GameObjects.Text;
    if (hpText) {
      hpText.setText(`${unit.stats.hp} / ${unit.stats.maxHp}`);
    }
  }

  private endBattleMode(): void {
    this.inBattleMode = false;

    const afterFade = () => {
      this.battleOverlay?.destroy();
      this.battleOverlay = null;
      this.engine.removeDeadUnits();
      this.syncUnitSprites();

      // Exhaust the player unit
      if (this.battleDisplayState?.attacker.isPlayer) {
        this.battleDisplayState.attacker.hasActed = true;
      }

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
      this.battleMenu.reset();
      this.pendingBattleCallback?.();
      this.pendingBattleCallback = null;
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

    const subtitle = this.add
      .text(this.cameras.main.width / 2, this.cameras.main.height * 0.55, 'All enemies defeated', {
        fontSize: '18px',
        color: '#bdc3c7',
      })
      .setOrigin(0.5);
    overlay.add(subtitle);

    const restart = this.add
      .text(this.cameras.main.width / 2, this.cameras.main.height * 0.7, '[ Play Again ]', {
        fontSize: '20px',
        color: '#ffffff',
        backgroundColor: '#27ae60',
        padding: { x: 16, y: 8 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    overlay.add(restart);

    restart.on('pointerdown', () => {
      this.scene.restart();
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
      this.scene.restart();
    });
  }

  private showTurnBanner(turnNumber: number, onComplete: () => void): void {
    this.inputEnabled = false;
    const overlay = this.add.container(0, 0);
    const bg = this.add.rectangle(
      this.cameras.main.width / 2,
      this.cameras.main.height * 0.4,
      this.cameras.main.width,
      80,
      0x000000,
      0.7,
    );
    const text = this.add
      .text(this.cameras.main.width / 2, this.cameras.main.height * 0.4, `Turn ${turnNumber}`, {
        fontSize: '36px',
        color: '#f1c40f',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setAlpha(0);
    overlay.add([bg, text]);

    this.tweens.add({
      targets: text,
      alpha: 1,
      duration: 300,
      onComplete: () => {
        this.time.delayedCall(1200, () => {
          this.tweens.add({
            targets: overlay,
            alpha: 0,
            duration: 300,
            onComplete: () => {
              overlay.destroy();
              onComplete();
            },
          });
        });
      },
    });
  }

  private beginPlayerPhase(): void {
    if (this.bannerShownForTurn === this.engine.turnManager.turnNumber) {
      this.inputEnabled = true;
      return;
    }
    this.showTurnBanner(this.engine.turnManager.turnNumber, () => {
      this.inputEnabled = true;
    });
    this.bannerShownForTurn = this.engine.turnManager.turnNumber;
  }
}
