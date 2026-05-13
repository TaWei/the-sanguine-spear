import Phaser from 'phaser';
import { Unit } from '../game/units/Unit';
import { SpriteAtlas, UnitAnimator, AnimationState } from '../game/sprites';
import type { AttackPreview } from '../game/combat/Engine';

export class BattleSpriteRenderer {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private sprite: Phaser.GameObjects.Sprite;
  private animator: UnitAnimator;
  private hpBg: Phaser.GameObjects.Rectangle;
  private hpFill: Phaser.GameObjects.Rectangle;
  private hpText: Phaser.GameObjects.Text;
  private nameText: Phaser.GameObjects.Text;
  private statsText: Phaser.GameObjects.Text | null = null;
  private unit: Unit;
  private maxHp: number;
  private atlas: SpriteAtlas;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    unit: Unit,
    preview: AttackPreview | null,
    initialHp: number,
    facingRight: boolean,
  ) {
    this.scene = scene;
    this.unit = unit;
    this.maxHp = unit.stats.maxHp;
    this.atlas = new SpriteAtlas();

    this.container = scene.add.container(x, y);
    this.container.setDepth(201);

    // Resolve texture key with fallback
    const textureKey = this.resolveTextureKey(unit, 'idle');

    if (scene.textures.exists(textureKey)) {
      this.sprite = scene.add.sprite(0, -20, textureKey);
      this.sprite.setScale(2);
    } else {
      // Procedural fallback rectangle with faction color
      const color =
        unit.faction === 'player' ? 0x3498db : unit.faction === 'enemy' ? 0xe74c3c : 0x2ecc71;
      const rect = scene.add.rectangle(0, -20, 48, 48, color);
      this.sprite = rect as unknown as Phaser.GameObjects.Sprite;
    }

    this.sprite.setFlipX(!facingRight);
    this.container.add(this.sprite);

    // Wrap sprite in AnimatableSprite interface for UnitAnimator
    const animatable = {
      setTexture: (key: string) => {
        if (scene.textures.exists(key)) {
          this.sprite.setTexture(key);
        }
      },
      setFlipX: (flip: boolean) => {
        this.sprite.setFlipX(facingRight ? flip : !flip);
      },
      play: (animationKey: string) => {
        if (scene.anims.exists(animationKey)) {
          this.sprite.play(animationKey);
        }
      },
    };

    this.animator = new UnitAnimator(this.atlas, animatable, unit.unitClass, unit.faction);
    this.animator.setFacing(facingRight ? 'right' : 'left');

    // Name
    this.nameText = scene.add
      .text(0, 30, unit.name, { fontSize: '16px', color: '#ecf0f1', fontStyle: 'bold' })
      .setOrigin(0.5);
    this.container.add(this.nameText);

    // Stats preview
    if (preview) {
      const statsStr = `Hit ${preview.hit}%  Dmg ${preview.damage}${preview.doubleAttack ? ' 2x' : ''}`;
      this.statsText = scene.add
        .text(0, 48, statsStr, { fontSize: '12px', color: '#bdc3c7' })
        .setOrigin(0.5);
      this.container.add(this.statsText);
    }

    // HP bar
    this.hpBg = scene.add.rectangle(0, 70, 120, 12, 0x000000);
    this.container.add(this.hpBg);

    const ratio = Math.max(0, initialHp / this.maxHp);
    const hpColor = ratio > 0.5 ? 0x2ecc71 : ratio > 0.25 ? 0xf1c40f : 0xe74c3c;
    this.hpFill = scene.add.rectangle(-60 + (120 * ratio) / 2, 70, 120 * ratio, 12, hpColor);
    this.container.add(this.hpFill);

    this.hpText = scene.add
      .text(0, 86, `${initialHp} / ${this.maxHp}`, { fontSize: '14px', color: '#ecf0f1' })
      .setOrigin(0.5);
    this.container.add(this.hpText);
  }

  private resolveTextureKey(unit: Unit, state: AnimationState, weapon?: string): string {
    const key = this.atlas.getTextureKey(unit.unitClass, unit.faction, state, weapon);
    if (this.scene.textures.exists(key)) {
      return key;
    }
    return this.atlas.getFallbackTextureKey(unit.faction);
  }

  playAnimation(state: AnimationState, weaponType?: string): void {
    this.animator.playAnimation(state, weaponType);
  }

  setHp(currentHp: number): void {
    const ratio = Math.max(0, currentHp / this.maxHp);
    const hpColor = ratio > 0.5 ? 0x2ecc71 : ratio > 0.25 ? 0xf1c40f : 0xe74c3c;
    this.hpFill.setFillStyle(hpColor);
    this.hpFill.setSize(120 * ratio, 12);
    this.hpFill.setX(-60 + (120 * ratio) / 2);
    this.hpText.setText(`${currentHp} / ${this.maxHp}`);
  }

  flashWhite(duration = 100): void {
    this.sprite.setTint(0xffffff);
    this.scene.time.delayedCall(duration, () => {
      this.sprite.clearTint();
    });
  }

  shake(intensity = 5, duration = 200): void {
    this.scene.tweens.add({
      targets: this.container,
      x: this.container.x + intensity,
      duration: duration / 4,
      yoyo: true,
      repeat: 3,
      onComplete: () => {
        this.container.setX(this.container.x);
      },
    });
  }

  intro(fromX: number, duration = 500, onComplete?: () => void): void {
    const targetX = this.container.x;
    this.container.setX(fromX);
    this.scene.tweens.add({
      targets: this.container,
      x: targetX,
      duration,
      ease: 'Cubic.easeOut',
      onComplete,
    });
  }

  getContainer(): Phaser.GameObjects.Container {
    return this.container;
  }

  destroy(): void {
    this.container.destroy();
  }
}
