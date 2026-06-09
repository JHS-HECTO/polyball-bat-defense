import Phaser from 'phaser';

export type MobKind = 'normal' | 'boss';

const MOB_PALETTES: Record<string, { body: number; outline: number; eye: number }> = {
  slime: { body: 0x6cbe5b, outline: 0x3e7f2f, eye: 0x1a3d0e },
  bat: { body: 0x5d4a8b, outline: 0x342555, eye: 0xffffff },
  skull: { body: 0xe8e1d4, outline: 0x6e6457, eye: 0x2c1d12 },
  orc: { body: 0xa5d161, outline: 0x4c7a23, eye: 0x271b08 },
  ghost: { body: 0xb6cfeb, outline: 0x506a8a, eye: 0x1c2e44 },
};

const MOB_VARIANTS = ['slime', 'bat', 'skull', 'orc', 'ghost'] as const;

export class Mob extends Phaser.GameObjects.Container {
  kind: MobKind;
  hp: number;
  hpMax: number;
  speed: number;
  goldReward: number;
  bodyG: Phaser.GameObjects.Graphics;
  hpBar: Phaser.GameObjects.Graphics;
  shadow: Phaser.GameObjects.Image;
  variantKey: string;
  bounceTimeline: number = 0;
  hitFlash: number = 0;

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
    this.variantKey =
      options.kind === 'boss'
        ? 'boss'
        : MOB_VARIANTS[Math.floor(Math.random() * MOB_VARIANTS.length)] ?? 'slime';

    this.shadow = scene.add.image(0, 18, 'shadow');
    this.shadow.setAlpha(0.4);
    this.add(this.shadow);

    this.bodyG = scene.add.graphics();
    this.add(this.bodyG);
    this.drawBody();

    this.hpBar = scene.add.graphics();
    this.add(this.hpBar);
    this.drawHpBar();

    scene.add.existing(this);
    scene.physics.add.existing(this);

    const body = this.body as Phaser.Physics.Arcade.Body;
    const radius = options.kind === 'boss' ? 44 : 22;
    body.setCircle(radius, -radius, -radius);
    body.setVelocityX(this.speed);

    this.setSize(radius * 2, radius * 2);
  }

  private drawBody(): void {
    this.bodyG.clear();
    if (this.kind === 'boss') {
      this.drawBoss();
    } else {
      this.drawNormal();
    }
  }

  private drawNormal(): void {
    const p = MOB_PALETTES[this.variantKey] ?? MOB_PALETTES.slime!;
    const flash = this.hitFlash;
    const body = flash > 0 ? this.lighten(p.body, 0.5) : p.body;

    const sway = Math.sin(this.bounceTimeline * 0.012) * 1.2;

    // 몸통 (둥근 형태 - variant에 따라 미세 변형)
    this.bodyG.fillStyle(body, 1);
    this.bodyG.lineStyle(3, p.outline, 1);

    if (this.variantKey === 'slime') {
      this.bodyG.fillRoundedRect(-22, -18 + sway, 44, 36, 18);
      this.bodyG.strokeRoundedRect(-22, -18 + sway, 44, 36, 18);
    } else if (this.variantKey === 'skull') {
      this.bodyG.fillCircle(0, -2 + sway, 20);
      this.bodyG.strokeCircle(0, -2 + sway, 20);
      this.bodyG.fillStyle(p.outline, 1);
      this.bodyG.fillRect(-8, 6 + sway, 6, 8);
      this.bodyG.fillRect(2, 6 + sway, 6, 8);
    } else if (this.variantKey === 'bat') {
      this.bodyG.fillEllipse(0, sway, 32, 30);
      this.bodyG.strokeEllipse(0, sway, 32, 30);
      // 날개
      this.bodyG.fillStyle(p.outline, 1);
      this.bodyG.fillTriangle(-14, -2 + sway, -28, -10 + sway, -22, 6 + sway);
      this.bodyG.fillTriangle(14, -2 + sway, 28, -10 + sway, 22, 6 + sway);
    } else if (this.variantKey === 'orc') {
      this.bodyG.fillRoundedRect(-20, -20 + sway, 40, 38, 8);
      this.bodyG.strokeRoundedRect(-20, -20 + sway, 40, 38, 8);
      // 송곳니
      this.bodyG.fillStyle(0xffffff, 1);
      this.bodyG.fillTriangle(-6, 6 + sway, -2, 12 + sway, -8, 12 + sway);
      this.bodyG.fillTriangle(6, 6 + sway, 2, 12 + sway, 8, 12 + sway);
    } else {
      // ghost
      this.bodyG.fillRoundedRect(-18, -18 + sway, 36, 32, 14);
      this.bodyG.strokeRoundedRect(-18, -18 + sway, 36, 32, 14);
    }

    // 눈
    this.bodyG.fillStyle(p.eye, 1);
    this.bodyG.fillCircle(-7, -4 + sway, 3);
    this.bodyG.fillCircle(7, -4 + sway, 3);
    if (flash <= 0) {
      this.bodyG.fillStyle(0xffffff, 1);
      this.bodyG.fillCircle(-6, -5 + sway, 1.2);
      this.bodyG.fillCircle(8, -5 + sway, 1.2);
    }
  }

  private drawBoss(): void {
    const flash = this.hitFlash;
    const body = flash > 0 ? 0xff8a8a : 0x8e3e3e;
    const outline = 0x4d1a1a;

    // 큰 몸통
    this.bodyG.fillStyle(body, 1);
    this.bodyG.lineStyle(4, outline, 1);
    this.bodyG.fillCircle(0, 0, 42);
    this.bodyG.strokeCircle(0, 0, 42);

    // 뿔
    this.bodyG.fillStyle(outline, 1);
    this.bodyG.fillTriangle(-18, -32, -10, -50, -2, -36);
    this.bodyG.fillTriangle(18, -32, 10, -50, 2, -36);

    // 눈
    this.bodyG.fillStyle(0xffd35e, 1);
    this.bodyG.fillCircle(-14, -4, 7);
    this.bodyG.fillCircle(14, -4, 7);
    if (flash <= 0) {
      this.bodyG.fillStyle(0x2c1d12, 1);
      this.bodyG.fillCircle(-14, -4, 3);
      this.bodyG.fillCircle(14, -4, 3);
    }

    // 입
    this.bodyG.lineStyle(3, outline, 1);
    this.bodyG.beginPath();
    this.bodyG.arc(0, 14, 12, 0.2, Math.PI - 0.2, false);
    this.bodyG.strokePath();
    // 송곳니
    this.bodyG.fillStyle(0xffffff, 1);
    this.bodyG.fillTriangle(-8, 14, -4, 26, -10, 22);
    this.bodyG.fillTriangle(8, 14, 4, 26, 10, 22);
  }

  private drawHpBar(): void {
    this.hpBar.clear();
    const w = this.kind === 'boss' ? 70 : 38;
    const h = this.kind === 'boss' ? 7 : 5;
    const y = this.kind === 'boss' ? -56 : -32;
    const ratio = Math.max(0, this.hp / this.hpMax);
    this.hpBar.fillStyle(0x2c1d12, 0.45);
    this.hpBar.fillRoundedRect(-w / 2 - 1, y - 1, w + 2, h + 2, 3);
    this.hpBar.fillStyle(0x5a2424, 1);
    this.hpBar.fillRoundedRect(-w / 2, y, w, h, 2);
    this.hpBar.fillStyle(this.kind === 'boss' ? 0xffb347 : 0x6cd073, 1);
    this.hpBar.fillRoundedRect(-w / 2, y, w * ratio, h, 2);
  }

  takeDamage(amount: number): boolean {
    this.hp -= amount;
    this.hitFlash = 90; // ms
    this.drawBody();
    this.drawHpBar();
    return this.hp <= 0;
  }

  private lighten(c: number, p: number): number {
    const r = Math.min(255, ((c >> 16) & 0xff) + Math.round(255 * p));
    const g = Math.min(255, ((c >> 8) & 0xff) + Math.round(255 * p));
    const b = Math.min(255, (c & 0xff) + Math.round(255 * p));
    return (r << 16) | (g << 8) | b;
  }

  tickAnim(deltaMs: number): void {
    this.bounceTimeline += deltaMs;
    if (this.hitFlash > 0) {
      this.hitFlash -= deltaMs;
      if (this.hitFlash <= 0) {
        this.hitFlash = 0;
        this.drawBody();
      }
    } else {
      // 미세 흔들림 애니메이션
      this.drawBody();
    }
  }
}
