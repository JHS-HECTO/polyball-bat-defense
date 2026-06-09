import Phaser from 'phaser';

export type MobKind = 'normal' | 'boss';

const NORMAL_VARIANTS = ['skull', 'ogre', 'slime', 'ghost', 'batmob'] as const;

export class Mob extends Phaser.GameObjects.Container {
  kind: MobKind;
  hp: number;
  hpMax: number;
  speed: number;
  goldReward: number;
  pathT: number = 0;

  private mobImg: Phaser.GameObjects.Image;
  private shadowG: Phaser.GameObjects.Graphics;
  private hpBar: Phaser.GameObjects.Graphics;
  private flashImg: Phaser.GameObjects.Image | null = null;
  private bounceTimeline: number = 0;
  private hitFlash: number = 0;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    options: { kind: MobKind; hp: number; speed: number; goldReward: number; bossTier?: number },
  ) {
    super(scene, x, y);
    this.kind = options.kind;
    this.hp = options.hp;
    this.hpMax = options.hp;
    this.speed = options.speed;
    this.goldReward = options.goldReward;

    const variantKey =
      options.kind === 'boss'
        ? 'dragon'
        : NORMAL_VARIANTS[Math.floor(Math.random() * NORMAL_VARIANTS.length)] ?? 'skull';

    this.shadowG = scene.add.graphics();
    this.add(this.shadowG);
    this.drawShadow();

    this.mobImg = scene.add.image(0, 0, `emoji-${variantKey}`);
    this.mobImg.setDisplaySize(options.kind === 'boss' ? 80 : 42, options.kind === 'boss' ? 80 : 42);
    this.add(this.mobImg);

    this.hpBar = scene.add.graphics();
    this.add(this.hpBar);
    this.drawHpBar();

    scene.add.existing(this);
  }

  private drawShadow(): void {
    const g = this.shadowG;
    g.clear();
    g.fillStyle(0x2c1d12, 0.42);
    if (this.kind === 'boss') g.fillEllipse(0, 32, 70, 16);
    else g.fillEllipse(0, 14, 30, 8);
  }

  private drawHpBar(): void {
    this.hpBar.clear();
    const w = this.kind === 'boss' ? 64 : 36;
    const h = this.kind === 'boss' ? 6 : 4;
    const y = this.kind === 'boss' ? -48 : -26;
    const ratio = Math.max(0, this.hp / this.hpMax);
    this.hpBar.fillStyle(0x2c1d12, 0.75);
    this.hpBar.fillRoundedRect(-w / 2 - 1, y - 1, w + 2, h + 2, 2);
    this.hpBar.fillStyle(0x5a2424, 1);
    this.hpBar.fillRoundedRect(-w / 2, y, w, h, 2);
    this.hpBar.fillStyle(this.kind === 'boss' ? 0xffd35e : 0x6cd073, 1);
    this.hpBar.fillRoundedRect(-w / 2, y, w * ratio, h, 2);
  }

  takeDamage(amount: number): boolean {
    this.hp -= amount;
    this.hitFlash = 120;
    this.mobImg.setTint(0xffffff);
    this.mobImg.setAlpha(0.6);
    this.drawHpBar();
    return this.hp <= 0;
  }

  tickAnim(deltaMs: number): void {
    this.bounceTimeline += deltaMs;
    const bob = Math.sin(this.bounceTimeline * 0.012) * 1.6;
    this.mobImg.y = bob;
    if (this.hitFlash > 0) {
      this.hitFlash -= deltaMs;
      if (this.hitFlash <= 0) {
        this.hitFlash = 0;
        this.mobImg.clearTint();
        this.mobImg.setAlpha(1);
      } else {
        // 깜빡임
        this.mobImg.setAlpha(0.5 + Math.sin(this.hitFlash * 0.08) * 0.3);
      }
    }
  }
}
