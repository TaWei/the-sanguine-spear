import Phaser from 'phaser';
import { TILE_SIZE } from '../constants';
import { UnitData } from '../types';

const FACTION_COLORS: Record<string, number> = {
  player: 0x3498db,
  enemy: 0xe74c3c,
  ally: 0x2ecc71,
};

export class Unit {
  private sprite: Phaser.GameObjects.Container;
  private data: UnitData;
  private acted: boolean = false;
  private offsetX: number;
  private offsetY: number;

  constructor(scene: Phaser.Scene, offsetX: number, offsetY: number, data: UnitData) {
    this.data = data;
    this.offsetX = offsetX;
    this.offsetY = offsetY;

    const color = FACTION_COLORS[data.faction] ?? 0xffffff;
    const body = scene.add.rectangle(0, 0, TILE_SIZE - 8, TILE_SIZE - 8, color);
    const label = scene.add.text(0, TILE_SIZE / 2 + 2, data.name.slice(0, 3), {
      fontSize: '10px',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5);

    this.sprite = scene.add.container(
      offsetX + data.gridX * TILE_SIZE + TILE_SIZE / 2,
      offsetY + data.gridY * TILE_SIZE + TILE_SIZE / 2,
      [body, label]
    );

    // HP bar
    const hpBg = scene.add.rectangle(0, -TILE_SIZE / 2 + 4, TILE_SIZE - 4, 4, 0x000000);
    const hpBar = scene.add.rectangle(
      -(TILE_SIZE - 4) / 2 + ((TILE_SIZE - 4) * data.stats.hp) / data.stats.maxHp / 2,
      -TILE_SIZE / 2 + 4,
      ((TILE_SIZE - 4) * data.stats.hp) / data.stats.maxHp,
      4,
      0x2ecc71
    );
    this.sprite.add([hpBg, hpBar]);
  }

  getFaction(): string {
    return this.data.faction;
  }

  getGridX(): number {
    return this.data.gridX;
  }

  getGridY(): number {
    return this.data.gridY;
  }

  moveTo(x: number, y: number): void {
    this.data.gridX = x;
    this.data.gridY = y;
    this.sprite.setPosition(
      this.offsetX + x * TILE_SIZE + TILE_SIZE / 2,
      this.offsetY + y * TILE_SIZE + TILE_SIZE / 2
    );
  }

  getMoveRange(): [number, number][] {
    const range: [number, number][] = [];
    const mov = this.data.stats.mov;
    for (let dy = -mov; dy <= mov; dy++) {
      for (let dx = -mov; dx <= mov; dx++) {
        if (Math.abs(dx) + Math.abs(dy) <= mov) {
          range.push([this.data.gridX + dx, this.data.gridY + dy]);
        }
      }
    }
    return range;
  }

  hasActed(): boolean {
    return this.acted;
  }

  setActed(v: boolean): void {
    this.acted = v;
    this.sprite.setAlpha(v ? 0.6 : 1);
  }

  getData(): UnitData {
    return this.data;
  }

  destroy(): void {
    this.sprite.destroy();
  }
}
