import Phaser from 'phaser';
import { TILE_SIZE } from '../constants';
import { TileData, UnitData } from '../types';
import { Unit } from './Unit';

const TERRAIN_COLORS: Record<string, number> = {
  plains: 0x8fbc8f,
  forest: 0x228b22,
  mountain: 0x808080,
  water: 0x4682b4,
  wall: 0x2f4f4f,
};

export class Tile {
  private rect: Phaser.GameObjects.Rectangle;
  private dataObj: Phaser.Data.DataManager;
  private currentUnit: Unit | null = null;

  constructor(scene: Phaser.Scene, x: number, y: number, tileData: TileData) {
    const color = TERRAIN_COLORS[tileData.terrain.type] ?? 0x8fbc8f;
    this.rect = scene.add.rectangle(x + TILE_SIZE / 2, y + TILE_SIZE / 2, TILE_SIZE - 2, TILE_SIZE - 2, color);
    this.rect.setStrokeStyle(1, 0x1a1a2e);
    this.rect.setInteractive({ useHandCursor: true });

    this.dataObj = new Phaser.Data.DataManager(this.rect);
    this.dataObj.set('gridX', tileData.x);
    this.dataObj.set('gridY', tileData.y);
    this.dataObj.set('terrain', tileData.terrain);
  }

  getGameObject(): Phaser.GameObjects.Rectangle {
    return this.rect;
  }

  setUnit(unit: Unit | null): void {
    this.currentUnit = unit;
  }

  getUnit(): Unit | null {
    return this.currentUnit;
  }

  getTerrain(): TileData['terrain'] {
    return this.dataObj.get('terrain');
  }
}
