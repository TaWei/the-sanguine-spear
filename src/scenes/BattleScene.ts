import Phaser from 'phaser';
import { TILE_SIZE, GRID_COLS, GRID_ROWS } from '../constants';
import { GameEngine } from '../game/GameEngine';
import { Unit, Faction, UnitClass } from '../game/units/Unit';
import { createStats } from '../game/units/Stats';
import { TerrainType } from '../game/map/Terrain';
import { WEAPON_DB } from '../game/combat/Weapons';
import { CombatEngine } from '../game/combat/Engine';
import { BattleMenu, MenuState, MenuAction } from '../game/ui/BattleMenu';
import { BattleDisplayState, BattlePhase } from '../game/ui/BattleDisplayState';
import { UNIT_STATE } from '../game/state/UnitState';

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
  private menuTexts: Phaser.GameObjects.Text[] = [];
  private battleOverlay: Phaser.GameObjects.Container | null = null;
  private battleDisplayState: BattleDisplayState | null = null;
  private inBattleMode = false;

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
    this.battleMenu = new BattleMenu();
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
        rect.setFillStyle(color);
      }
    }
  }

  private spawnUnits(): void {
    const pStats1 = createStats({
      hp: 22,
      maxHp: 22,
      str: 8,
      mag: 2,
      skl: 7,
      spd: 8,
      luk: 6,
      def: 6,
      res: 2,
      mov: 5,
    });
    const pStats2 = createStats({
      hp: 16,
      maxHp: 16,
      str: 1,
      mag: 9,
      skl: 6,
      spd: 7,
      luk: 5,
      def: 2,
      res: 7,
      mov: 5,
    });
    const eStats1 = createStats({
      hp: 26,
      maxHp: 26,
      str: 9,
      mag: 0,
      skl: 4,
      spd: 5,
      luk: 3,
      def: 5,
      res: 1,
      mov: 5,
    });
    const eStats2 = createStats({
      hp: 20,
      maxHp: 20,
      str: 7,
      mag: 0,
      skl: 6,
      spd: 5,
      luk: 2,
      def: 7,
      res: 1,
      mov: 5,
    });

    this.engine.addUnit('p1', 'Rowan', Faction.PLAYER, UnitClass.LORD, pStats1, 2, 5);
    this.engine.addUnit('p2', 'Elara', Faction.PLAYER, UnitClass.MAGE, pStats2, 3, 6);
    this.engine.addUnit('e1', 'Bandit', Faction.ENEMY, UnitClass.BRIGAND, eStats1, 12, 4);
    this.engine.addUnit('e2', 'Soldier', Faction.ENEMY, UnitClass.SOLDIER, eStats2, 13, 6);

    this.syncUnitSprites();
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
        return;
      }
      this.handleTileClick(gx, gy);
    });
  }

  private handleTileClick(gx: number, gy: number): void {
    if (!this.engine.turnManager.isPlayerPhase()) {
      return;
    }

    // Battle mode blocks map input
    if (this.inBattleMode) {
      return;
    }

    const clickedUnit = this.engine.getUnit(gx, gy);

    // If menu is open, handle menu/target selection
    if (this.battleMenu.isVisible) {
      this.handleMenuInput(gx, gy, clickedUnit);
      return;
    }

    // Move selected unit
    if (this.selectedUnit) {
      const range = this.engine.getMoveRange(this.selectedUnit);
      const key = `${String(gx)},${String(gy)}`;
      if (range.has(key) && !clickedUnit) {
        const unitToMove = this.selectedUnit;
        this.tweens.add({
          targets: this.unitSprites.get(this.selectedUnit.id),
          x: this.offsetX + gx * TILE_SIZE + TILE_SIZE / 2,
          y: this.offsetY + gy * TILE_SIZE + TILE_SIZE / 2,
          duration: 300,
          onComplete: () => {
            this.engine.moveUnit(unitToMove, gx, gy);
            unitToMove.state.transition(UNIT_STATE.MOVING);
            unitToMove.state.transition(UNIT_STATE.MENU);
            this.showPostMoveMenu(unitToMove);
          },
        });
        return;
      }
    }

    // Select a fresh player unit
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
    const phaseText = this.add
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
      this.selectedUnit = null;
      this.moveGraphics.clear();
      this.battleMenu.reset();
      this.clearMenuTexts();
      this.engine.endTurn();
      this.syncUnitSprites();
      phaseText.setText(`Phase: ${this.engine.turnManager.isPlayerPhase() ? 'Player' : 'Enemy'}`);

      if (this.engine.turnManager.isEnemyPhase()) {
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
            } else if (lastEntry.hit) {
              this.cameras.main.shake(100, 0.005);
            }

            if (defenderDied) {
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
              if (lastEntry.hit) {
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

  private showPostMoveMenu(unit: Unit): void {
    this.moveGraphics.clear();
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
      fightText.on('pointerdown', () => {
        this.battleMenu.selectAction(MenuAction.FIGHT);
        this.clearMenuTexts();
        this.highlightEnemyTargets(enemies);
      });
    }

    endText.on('pointerdown', () => {
      this.battleMenu.reset();
      unit.state.transition(UNIT_STATE.EXHAUSTED);
      this.clearMenuTexts();
      this.syncUnitSprites();
    });

    this.menuTexts.push(fightText, endText);
  }

  private clearMenuTexts(): void {
    for (const text of this.menuTexts) {
      text.destroy();
    }
    this.menuTexts = [];
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

  private handleMenuInput(_gx: number, _gy: number, clickedUnit: Unit | null): void {
    if (this.battleMenu.state === MenuState.CHOOSE_TARGET && clickedUnit && clickedUnit.isEnemy) {
      const validTarget = this.battleMenu.adjacentEnemies.find((e) => e.id === clickedUnit.id);
      if (validTarget) {
        this.battleMenu.selectTarget(validTarget);
        this.clearMenuTexts();
        this.moveGraphics.clear();
        this.startBattleMode(this.battleMenu.unit!, validTarget);
      }
    }
  }

  private startBattleMode(attacker: Unit, defender: Unit): void {
    this.inBattleMode = true;
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
    const panelIndex = isLeft ? 2 : 3; // overlay children: bg, vsText, attPanel, defPanel
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
    if (this.battleOverlay) {
      this.tweens.add({
        targets: this.battleOverlay,
        alpha: 0,
        duration: 400,
        onComplete: () => {
          this.battleOverlay?.destroy();
          this.battleOverlay = null;
          this.syncUnitSprites();
        },
      });
    }

    // Exhaust the player unit
    if (this.battleDisplayState?.attacker.isPlayer) {
      const unit = this.battleDisplayState.attacker;
      if (unit.state.current === UNIT_STATE.MENU) {
        unit.state.transition(UNIT_STATE.EXHAUSTED);
      }
    }

    this.battleDisplayState = null;

    // Check win/loss after combat resolves
    const objectives = this.engine.checkObjectives();
    if (objectives.victory) {
      this.showVictoryScreen();
      return;
    }
    if (objectives.defeat) {
      this.showDefeatScreen();
      return;
    }

    this.battleMenu.reset();
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
}
