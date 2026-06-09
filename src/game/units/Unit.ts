import Phaser from 'phaser';
import { profileFor, sellRefund, type UnitLevel, type UnitProfile, type UnitType } from './types';

let nextId = 1;

export class Unit extends Phaser.GameObjects.Container {
  readonly id: number;
  unitType: UnitType;
  level: UnitLevel;
  profile: UnitProfile;
  cooldownLeft: number = 0;
  slotIndex: number;

  private bodyG: Phaser.GameObjects.Graphics;
  private rangeG: Phaser.GameObjects.Graphics;
  private levelTag: Phaser.GameObjects.Text;
  private idleTimeline: number = 0;
  private hovered: boolean = false;

  constructor(scene: Phaser.Scene, x: number, y: number, type: UnitType, level: UnitLevel, slotIndex: number) {
    super(scene, x, y);
    this.id = nextId++;
    this.unitType = type;
    this.level = level;
    this.profile = profileFor(type, level);
    this.slotIndex = slotIndex;

    // 사거리 링 (보이지 않다가 hover/drag 시 보임)
    this.rangeG = scene.add.graphics();
    this.add(this.rangeG);
    this.rangeG.setVisible(false);

    // 그림자
    const shadow = scene.add.image(0, 22, 'shadow');
    shadow.setAlpha(0.45);
    shadow.setScale(0.95);
    this.add(shadow);

    // 본체
    this.bodyG = scene.add.graphics();
    this.add(this.bodyG);

    // Lv 텍스트
    this.levelTag = scene.add.text(0, -34, `Lv${level}`, {
      fontFamily: 'Pretendard, system-ui, sans-serif',
      fontSize: '12px',
      color: '#fffaf2',
      backgroundColor: '#2c1d12',
      padding: { x: 4, y: 1 },
    });
    this.levelTag.setOrigin(0.5);
    this.add(this.levelTag);

    this.drawBody();

    // 입력 받을 영역
    this.setSize(60, 60);
    this.setInteractive(new Phaser.Geom.Rectangle(-30, -30, 60, 60), Phaser.Geom.Rectangle.Contains);
    scene.input.setDraggable(this);

    scene.add.existing(this);
  }

  private drawBody(): void {
    const g = this.bodyG;
    g.clear();
    const c = this.profile.color;
    const outline = this.darken(c, 0.45);

    // 베이스 받침
    g.fillStyle(outline, 0.65);
    g.fillRoundedRect(-26, -4, 52, 18, 7);

    // 몸통 (타입별 약간 다른 모양)
    g.fillStyle(c, 1);
    g.lineStyle(3, outline, 1);
    if (this.unitType === 'melee') {
      g.fillRoundedRect(-22, -22, 44, 36, 12);
      g.strokeRoundedRect(-22, -22, 44, 36, 12);
    } else if (this.unitType === 'ranged') {
      g.fillTriangle(-20, 14, 20, 14, 0, -26);
      g.strokeTriangle(-20, 14, 20, 14, 0, -26);
    } else if (this.unitType === 'magic') {
      g.fillCircle(0, -2, 20);
      g.strokeCircle(0, -2, 20);
    } else {
      // bomb
      g.fillCircle(0, -2, 18);
      g.strokeCircle(0, -2, 18);
      // 도화선
      g.lineStyle(3, 0x2c1d12, 1);
      g.beginPath();
      g.moveTo(8, -16);
      g.lineTo(16, -26);
      g.strokePath();
      g.fillStyle(0xffd35e, 1);
      g.fillCircle(17, -27, 3);
    }

    // 얼굴 (귀여운 점 두개 = 눈)
    g.fillStyle(0xffffff, 1);
    g.fillCircle(-6, -6, 3);
    g.fillCircle(6, -6, 3);
    g.fillStyle(0x2c1d12, 1);
    g.fillCircle(-6, -5, 1.4);
    g.fillCircle(6, -5, 1.4);

    // 빠따 — 근접만 빠따 들고있음
    if (this.unitType === 'melee') {
      g.fillStyle(this.batColor(), 1);
      g.lineStyle(2, 0x4d2e10, 1);
      g.fillRoundedRect(14, -2, 22, 5, 2);
      g.strokeRoundedRect(14, -2, 22, 5, 2);
    }

    // Lv 점 (몸통에 그릴 거)
    g.fillStyle(0xffffff, 0.95);
    for (let i = 0; i < this.level; i += 1) {
      g.fillCircle(-16 + i * 6, 8, 1.6);
    }
  }

  private batColor(): number {
    const colors = [0x8b5a2b, 0xa67139, 0xd4a04a, 0xe8c878, 0xf4d35e, 0xf2a35a, 0xe25555];
    return colors[Math.min(colors.length - 1, this.level - 1)] ?? 0x8b5a2b;
  }

  private darken(c: number, p: number): number {
    const r = Math.max(0, Math.round(((c >> 16) & 0xff) * (1 - p)));
    const g = Math.max(0, Math.round(((c >> 8) & 0xff) * (1 - p)));
    const b = Math.max(0, Math.round((c & 0xff) * (1 - p)));
    return (r << 16) | (g << 8) | b;
  }

  drawRange(force?: boolean): void {
    const g = this.rangeG;
    g.clear();
    if (force || this.hovered) {
      const r = this.profile.range;
      g.fillStyle(this.profile.color, 0.1);
      g.fillCircle(0, 0, r);
      g.lineStyle(2, this.profile.color, 0.55);
      g.strokeCircle(0, 0, r);
      g.setVisible(true);
    } else {
      g.setVisible(false);
    }
  }

  setHovered(b: boolean): void {
    this.hovered = b;
    this.drawRange();
  }

  refundOnSell(): number {
    return sellRefund(this.level);
  }

  tickAnim(deltaMs: number): void {
    this.idleTimeline += deltaMs;
    const bob = Math.sin(this.idleTimeline * 0.005) * 1.2;
    this.bodyG.y = bob;
    if (this.cooldownLeft > 0) this.cooldownLeft -= deltaMs;
  }
}
