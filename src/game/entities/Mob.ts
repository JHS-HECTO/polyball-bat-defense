import Phaser from 'phaser';

// 111percent 알키우기 톤: 작은 도트풍 몹. 단색 + 외곽선.
export type MobKind = 'normal' | 'boss';

type MobStyle = { body: number; outline: number; eye: number };

const MOB_PALETTES: Record<string, MobStyle> = {
  skull: { body: 0xfffaf2, outline: 0x2c1d12, eye: 0x2c1d12 },     // 흰 해골
  orc: { body: 0x5bb95b, outline: 0x2c4a1e, eye: 0x000000 },       // 녹색 오크
  slime: { body: 0x4aa3df, outline: 0x1a4d6e, eye: 0x0a2030 },     // 파란 슬라임
  bat: { body: 0x5d4a8b, outline: 0x2a1850, eye: 0xffffff },       // 보라 박쥐
  ghost: { body: 0xfceedb, outline: 0x6e6457, eye: 0x2c1d12 },     // 크림 유령
};

const MOB_VARIANTS = ['skull', 'orc', 'slime', 'bat', 'ghost'] as const;

export class Mob extends Phaser.GameObjects.Container {
  kind: MobKind;
  hp: number;
  hpMax: number;
  speed: number;
  goldReward: number;
  pathT: number = 0;

  private bodyG: Phaser.GameObjects.Graphics;
  private hpBar: Phaser.GameObjects.Graphics;
  private shadowG: Phaser.GameObjects.Graphics;
  private variantKey: string;
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
    this.variantKey =
      options.kind === 'boss'
        ? 'boss'
        : MOB_VARIANTS[Math.floor(Math.random() * MOB_VARIANTS.length)] ?? 'skull';

    this.shadowG = scene.add.graphics();
    this.add(this.shadowG);
    this.drawShadow();

    this.bodyG = scene.add.graphics();
    this.add(this.bodyG);

    this.hpBar = scene.add.graphics();
    this.add(this.hpBar);

    this.drawBody();
    this.drawHpBar();

    scene.add.existing(this);
  }

  private drawShadow(): void {
    const g = this.shadowG;
    g.clear();
    g.fillStyle(0x2c1d12, 0.35);
    if (this.kind === 'boss') g.fillEllipse(0, 22, 50, 12);
    else g.fillEllipse(0, 10, 18, 6);
  }

  private drawBody(): void {
    this.bodyG.clear();
    if (this.kind === 'boss') this.drawBoss();
    else this.drawNormal();
  }

  private drawNormal(): void {
    const p = MOB_PALETTES[this.variantKey] ?? MOB_PALETTES.skull!;
    const flash = this.hitFlash;
    const body = flash > 0 ? 0xffffff : p.body;
    const bob = Math.sin(this.bounceTimeline * 0.012) * 1.2;
    const g = this.bodyG;

    if (this.variantKey === 'skull') {
      // 작은 해골 캐릭 (알키우기 스타일)
      // 머리
      g.fillStyle(body, 1);
      g.lineStyle(1.5, p.outline, 1);
      g.fillCircle(0, -4 + bob, 8);
      g.strokeCircle(0, -4 + bob, 8);
      // 눈
      g.fillStyle(p.eye, 1);
      g.fillRect(-3, -6 + bob, 2, 2);
      g.fillRect(1, -6 + bob, 2, 2);
      // 이빨
      g.lineStyle(1, p.outline, 1);
      g.beginPath();
      g.moveTo(-3, 0 + bob); g.lineTo(-3, 2 + bob);
      g.moveTo(0, 0 + bob); g.lineTo(0, 2 + bob);
      g.moveTo(3, 0 + bob); g.lineTo(3, 2 + bob);
      g.strokePath();
      // 몸 (작은 막대)
      g.fillStyle(body, 1);
      g.lineStyle(1.5, p.outline, 1);
      g.fillRect(-4, 4 + bob, 8, 6);
      g.strokeRect(-4, 4 + bob, 8, 6);
    } else if (this.variantKey === 'orc') {
      // 녹색 오크
      g.fillStyle(body, 1);
      g.lineStyle(1.5, p.outline, 1);
      g.fillRect(-7, -8 + bob, 14, 16);
      g.strokeRect(-7, -8 + bob, 14, 16);
      // 눈
      g.fillStyle(p.eye, 1);
      g.fillRect(-4, -5 + bob, 2, 2);
      g.fillRect(2, -5 + bob, 2, 2);
      // 송곳니
      g.fillStyle(0xfffaf2, 1);
      g.fillTriangle(-3, 1 + bob, -1, 4 + bob, -4, 4 + bob);
      g.fillTriangle(3, 1 + bob, 1, 4 + bob, 4, 4 + bob);
    } else if (this.variantKey === 'slime') {
      // 슬라임
      g.fillStyle(body, 1);
      g.lineStyle(1.5, p.outline, 1);
      g.fillRoundedRect(-9, -6 + bob, 18, 14, 9);
      g.strokeRoundedRect(-9, -6 + bob, 18, 14, 9);
      // 눈
      g.fillStyle(0xffffff, 1);
      g.fillCircle(-3, -1 + bob, 2);
      g.fillCircle(3, -1 + bob, 2);
      g.fillStyle(p.eye, 1);
      g.fillCircle(-3, -1 + bob, 1);
      g.fillCircle(3, -1 + bob, 1);
    } else if (this.variantKey === 'bat') {
      // 박쥐
      g.fillStyle(body, 1);
      g.lineStyle(1.5, p.outline, 1);
      g.fillCircle(0, 0 + bob, 6);
      g.strokeCircle(0, 0 + bob, 6);
      // 날개
      g.fillStyle(p.outline, 1);
      g.fillTriangle(-6, -2 + bob, -14, -6 + bob, -10, 4 + bob);
      g.fillTriangle(6, -2 + bob, 14, -6 + bob, 10, 4 + bob);
      // 눈
      g.fillStyle(p.eye, 1);
      g.fillCircle(-2, -1 + bob, 1.2);
      g.fillCircle(2, -1 + bob, 1.2);
    } else {
      // ghost
      g.fillStyle(body, 1);
      g.lineStyle(1.5, p.outline, 1);
      // 윗부분 둥글
      g.beginPath();
      g.arc(0, -1 + bob, 8, Math.PI, 0, false);
      g.lineTo(8, 8 + bob);
      // 아래 물결 (단순화)
      g.lineTo(5, 6 + bob);
      g.lineTo(2, 8 + bob);
      g.lineTo(-2, 6 + bob);
      g.lineTo(-5, 8 + bob);
      g.lineTo(-8, 6 + bob);
      g.closePath();
      g.fillPath();
      g.strokePath();
      // 눈
      g.fillStyle(p.eye, 1);
      g.fillCircle(-3, -2 + bob, 1.4);
      g.fillCircle(3, -2 + bob, 1.4);
    }
  }

  private drawBoss(): void {
    // 빨간 드래곤 보스 (알키우기 참고)
    const flash = this.hitFlash;
    const body = flash > 0 ? 0xff8a8a : 0xe25555;
    const outline = 0x6f2222;
    const bob = Math.sin(this.bounceTimeline * 0.008) * 1.5;
    const g = this.bodyG;

    // 몸통 (큰 둥근 사각)
    g.fillStyle(body, 1);
    g.lineStyle(2, outline, 1);
    g.fillRoundedRect(-20, -8 + bob, 40, 26, 8);
    g.strokeRoundedRect(-20, -8 + bob, 40, 26, 8);

    // 머리 (몸통보다 약간 위로)
    g.fillStyle(body, 1);
    g.fillRoundedRect(-12, -22 + bob, 24, 16, 6);
    g.strokeRoundedRect(-12, -22 + bob, 24, 16, 6);

    // 뿔
    g.fillStyle(outline, 1);
    g.fillTriangle(-10, -20 + bob, -6, -30 + bob, -2, -20 + bob);
    g.fillTriangle(10, -20 + bob, 6, -30 + bob, 2, -20 + bob);

    // 눈 (노란 + 검정 동공)
    g.fillStyle(0xffd35e, 1);
    g.fillCircle(-5, -14 + bob, 2.8);
    g.fillCircle(5, -14 + bob, 2.8);
    if (flash <= 0) {
      g.fillStyle(0x2c1d12, 1);
      g.fillCircle(-5, -14 + bob, 1.4);
      g.fillCircle(5, -14 + bob, 1.4);
    }

    // 입 (이빨)
    g.fillStyle(0xfffaf2, 1);
    g.fillTriangle(-3, -10 + bob, -1, -6 + bob, -5, -6 + bob);
    g.fillTriangle(3, -10 + bob, 1, -6 + bob, 5, -6 + bob);

    // 등 가시
    g.fillStyle(outline, 1);
    g.fillTriangle(-12, -8 + bob, -10, -14 + bob, -8, -8 + bob);
    g.fillTriangle(-4, -8 + bob, -2, -16 + bob, 0, -8 + bob);
    g.fillTriangle(4, -8 + bob, 6, -14 + bob, 8, -8 + bob);
  }

  private drawHpBar(): void {
    this.hpBar.clear();
    const w = this.kind === 'boss' ? 50 : 22;
    const h = this.kind === 'boss' ? 5 : 3;
    const y = this.kind === 'boss' ? -34 : -16;
    const ratio = Math.max(0, this.hp / this.hpMax);
    this.hpBar.fillStyle(0x2c1d12, 0.7);
    this.hpBar.fillRect(-w / 2 - 1, y - 1, w + 2, h + 2);
    this.hpBar.fillStyle(0x5a2424, 1);
    this.hpBar.fillRect(-w / 2, y, w, h);
    this.hpBar.fillStyle(this.kind === 'boss' ? 0xffd35e : 0x6cd073, 1);
    this.hpBar.fillRect(-w / 2, y, w * ratio, h);
  }

  takeDamage(amount: number): boolean {
    this.hp -= amount;
    this.hitFlash = 90;
    this.drawBody();
    this.drawHpBar();
    return this.hp <= 0;
  }

  tickAnim(deltaMs: number): void {
    this.bounceTimeline += deltaMs;
    if (this.hitFlash > 0) {
      this.hitFlash -= deltaMs;
      if (this.hitFlash <= 0) this.hitFlash = 0;
    }
    this.drawBody();
  }
}
