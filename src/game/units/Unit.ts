import Phaser from 'phaser';
import { profileFor, sellRefund, type UnitLevel, type UnitProfile, type UnitType } from './types';

// 111percent 알키우기 톤: 작은 도트풍 카툰. 단색 면 + 단순 외곽선.
// 멀티톤 셰이딩 없음. 캐릭터 작고 귀엽게.

let nextId = 1;

const STYLE: Record<
  UnitType,
  { body: number; outline: number; accent: number; weapon: number }
> = {
  melee: { body: 0xfffaf2, outline: 0x2c1d12, accent: 0xe25555, weapon: 0x8b5a2b },     // 화이트 유니폼 + 빨간 모자 + 빠따
  ranged: { body: 0x5bb95b, outline: 0x2c4a1e, accent: 0xf4d35e, weapon: 0x6b4523 },    // 녹색 + 활
  magic: { body: 0xb46be0, outline: 0x4b1d6c, accent: 0xffd35e, weapon: 0x6b4523 },     // 보라 + 별 지팡이
  bomb: { body: 0x2c1d12, outline: 0x000000, accent: 0xff8c42, weapon: 0xffd35e },      // 검정 + 불꽃 폭탄
};

export class Unit extends Phaser.GameObjects.Container {
  readonly id: number;
  unitType: UnitType;
  level: UnitLevel;
  profile: UnitProfile;
  cooldownLeft: number = 0;
  slotIndex: number;

  private shadowG: Phaser.GameObjects.Graphics;
  private bodyG: Phaser.GameObjects.Graphics;
  private rangeG: Phaser.GameObjects.Graphics;
  private levelTag: Phaser.GameObjects.Text;
  private idleTimeline: number = 0;
  private hovered: boolean = false;
  private swingAnimMs: number = 0;
  private targetAngle: number = -Math.PI / 4;       // 기본 우측 위
  private targetDist: number = 40;
  private lungeMs: number = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, type: UnitType, level: UnitLevel, slotIndex: number) {
    super(scene, x, y);
    this.id = nextId++;
    this.unitType = type;
    this.level = level;
    this.profile = profileFor(type, level);
    this.slotIndex = slotIndex;

    this.rangeG = scene.add.graphics();
    this.add(this.rangeG);
    this.rangeG.setVisible(false);

    this.shadowG = scene.add.graphics();
    this.add(this.shadowG);
    this.drawShadow();

    this.bodyG = scene.add.graphics();
    this.add(this.bodyG);

    this.levelTag = scene.add.text(0, -34, `${level}`, {
      fontFamily: 'Pretendard, system-ui, sans-serif',
      fontSize: '10px',
      fontStyle: 'bold',
      color: '#fffaf2',
      backgroundColor: '#2c1d12',
      padding: { x: 4, y: 1 },
    });
    this.levelTag.setOrigin(0.5);
    this.add(this.levelTag);

    this.drawCharacter();

    this.setSize(36, 48);
    this.setInteractive(new Phaser.Geom.Rectangle(-22, -28, 44, 56), Phaser.Geom.Rectangle.Contains);
    scene.input.setDraggable(this);

    scene.add.existing(this);
  }

  private drawShadow(): void {
    const g = this.shadowG;
    g.clear();
    g.fillStyle(0x2c1d12, 0.35);
    g.fillEllipse(0, 14, 24, 8);
  }

  // 캐릭터: 막대형 단순 도트풍
  // 머리(원) + 몸통(사각) + 무기 살짝 옆에
  private drawCharacter(): void {
    const g = this.bodyG;
    g.clear();
    const s = STYLE[this.unitType];
    const bob = Math.sin(this.idleTimeline * 0.005) * 0.8;

    // 다리 (선 두 줄)
    g.lineStyle(2, s.outline, 1);
    g.beginPath();
    g.moveTo(-4, 8 + bob);
    g.lineTo(-4, 14 + bob);
    g.moveTo(4, 8 + bob);
    g.lineTo(4, 14 + bob);
    g.strokePath();

    // 몸통 — 단색 사각 + 외곽선
    g.fillStyle(s.body, 1);
    g.lineStyle(1.5, s.outline, 1);
    g.fillRect(-7, -4 + bob, 14, 14);
    g.strokeRect(-7, -4 + bob, 14, 14);

    // 가슴 마크 (작은 점/문양)
    g.fillStyle(s.accent, 1);
    if (this.unitType === 'melee') {
      g.fillCircle(0, 3 + bob, 1.6);
    } else if (this.unitType === 'ranged') {
      g.fillRect(-1, 1 + bob, 2, 5);
    } else if (this.unitType === 'magic') {
      this.drawStar(g, 0, 3 + bob, 2.6, 1.1, s.accent);
    } else {
      g.fillCircle(0, 3 + bob, 1.8);
    }

    // 머리 — 둥근
    g.fillStyle(0xfdd9b8, 1); // 살색 단색
    g.lineStyle(1.5, s.outline, 1);
    g.fillCircle(0, -10 + bob, 8);
    g.strokeCircle(0, -10 + bob, 8);

    // 눈 두 점
    g.fillStyle(s.outline, 1);
    g.fillCircle(-2.5, -11 + bob, 1.2);
    g.fillCircle(2.5, -11 + bob, 1.2);

    // 입 (한 점)
    g.fillRect(-1, -7 + bob, 2, 1);

    // 헤드 액세서리
    if (this.unitType === 'melee') {
      // 빨간 야구 모자 (반원)
      g.fillStyle(s.accent, 1);
      g.lineStyle(1.5, s.outline, 1);
      g.beginPath();
      g.arc(0, -13 + bob, 8, Math.PI, 0, false);
      g.fillPath();
      g.strokePath();
      g.fillRect(2, -14 + bob, 7, 2); // 챙
    } else if (this.unitType === 'ranged') {
      // 작은 깃털모자
      g.fillStyle(s.outline, 1);
      g.fillTriangle(-6, -14 + bob, 6, -14 + bob, 0, -20 + bob);
      g.fillStyle(s.accent, 1);
      g.fillTriangle(2, -18 + bob, 10, -22 + bob, 4, -16 + bob);
    } else if (this.unitType === 'magic') {
      // 보라색 고깔
      g.fillStyle(s.outline, 1);
      g.lineStyle(1, s.body, 1);
      g.fillTriangle(-7, -14 + bob, 7, -14 + bob, 0, -22 + bob);
      g.strokeTriangle(-7, -14 + bob, 7, -14 + bob, 0, -22 + bob);
      g.fillStyle(s.accent, 1);
      this.drawStar(g, 0, -18 + bob, 1.6, 0.7, s.accent);
    } else {
      // 검은 두건
      g.fillStyle(s.outline, 1);
      g.fillRect(-7, -16 + bob, 14, 5);
    }

    // 무기
    this.drawWeapon(bob);

    // Lv 점 (몸통 아래)
    const dotCount = Math.min(this.level, 6);
    g.fillStyle(s.accent, 1);
    g.lineStyle(0.6, s.outline, 1);
    const tw = (dotCount - 1) * 2.5;
    for (let i = 0; i < dotCount; i += 1) {
      g.fillCircle(-tw / 2 + i * 2.5, 18 + bob, 1.1);
    }
    if (this.level === 7) {
      this.drawStar(g, 0, 18 + bob, 2.8, 1.3, s.accent);
    }
  }

  private drawWeapon(bob: number): void {
    const g = this.bodyG;
    const s = STYLE[this.unitType];
    const swing = this.swingAnimMs > 0 ? Math.sin((this.swingAnimMs / 220) * Math.PI) : 0;

    if (this.unitType === 'melee') {
      // 빠따 — 몹 방향으로 휘두름
      // swing 0~1: 휘두르는 진행도. 0=뒤로 젖힘, 1=앞으로 끝까지
      const baseAng = this.targetAngle;
      // 뒤→앞 회전 (휘두름 호)
      const arc = (swing - 0.5) * 1.6;
      const ang = baseAng + arc;
      const sx = 0;
      const sy = 0;
      // 길이: 타겟까지 도달 (swing 절정에 가장 늘어남)
      const reach = Math.min(this.targetDist - 6, 200);
      const baseLen = 14 + this.level * 0.8;
      const len = Math.max(baseLen, reach * Math.max(0, Math.sin(swing * Math.PI) * 1.0 + 0.3));
      const ex = sx + Math.cos(ang) * len;
      const ey = sy + Math.sin(ang) * len;
      const thickness = 4 + this.level * 0.3;
      // 빠따 본체 (두꺼운 선)
      g.lineStyle(thickness, this.batColor(), 1);
      g.beginPath();
      g.moveTo(sx, sy);
      g.lineTo(ex, ey);
      g.strokePath();
      // 빠따 외곽선
      g.lineStyle(1, s.outline, 1);
      g.beginPath();
      g.moveTo(sx, sy);
      g.lineTo(ex, ey);
      g.strokePath();
      // 끝부분 동그란 헤드
      g.fillStyle(this.batColor(), 1);
      g.lineStyle(1, s.outline, 1);
      g.fillCircle(ex, ey, 3.5 + this.level * 0.25);
      g.strokeCircle(ex, ey, 3.5 + this.level * 0.25);
      // 스윙 잔상 (호 트레일)
      if (swing > 0.1 && swing < 0.95) {
        g.lineStyle(2, this.batColor(), 0.35);
        for (let i = 1; i <= 3; i += 1) {
          const a = baseAng + (swing - 0.5 - i * 0.12) * 1.6;
          const lx = sx + Math.cos(a) * len;
          const ly = sy + Math.sin(a) * len;
          g.beginPath();
          g.moveTo(sx, sy);
          g.lineTo(lx, ly);
          g.strokePath();
        }
      }
    } else if (this.unitType === 'ranged') {
      // 활
      const bx = -8;
      const by = -2 + bob;
      const dr = swing;
      g.lineStyle(1.6, s.weapon, 1);
      // 활 호 (5 점 곡선)
      g.beginPath();
      const segs = 6;
      for (let i = 0; i <= segs; i += 1) {
        const t = i / segs;
        const py = by + (t - 0.5) * 12;
        const px = bx - 1 - (4 + dr * 2) * (1 - 4 * (t - 0.5) * (t - 0.5));
        if (i === 0) g.moveTo(px, py);
        else g.lineTo(px, py);
      }
      g.strokePath();
      // 시위 (얇은 선)
      g.lineStyle(0.6, 0xfffaf2, 0.9);
      g.beginPath();
      g.moveTo(bx - 1, by - 6);
      g.lineTo(bx - 1 + dr * 4, by);
      g.lineTo(bx - 1, by + 6);
      g.strokePath();
      // 화살
      if (dr > 0.1) {
        g.lineStyle(1.4, s.outline, 1);
        g.beginPath();
        g.moveTo(bx - 1 + dr * 4, by);
        g.lineTo(bx + 8, by);
        g.strokePath();
      }
    } else if (this.unitType === 'magic') {
      // 지팡이 (짧은 막대 + 끝 별)
      const px = 6;
      const py = -2 + bob;
      const tipX = px + 2;
      const tipY = py - 14 - this.level * 0.4;
      g.lineStyle(1.8, s.weapon, 1);
      g.beginPath();
      g.moveTo(px, py + 4);
      g.lineTo(tipX, tipY);
      g.strokePath();
      // 빛
      const glow = 1 + Math.sin(this.idleTimeline * 0.008) * 0.2;
      g.fillStyle(s.accent, 0.4);
      g.fillCircle(tipX, tipY, 5 * glow);
      this.drawStar(g, tipX, tipY, 2.6 * glow, 1.2 * glow, s.accent);
    } else {
      // 폭탄 (작은 원 + 도화선)
      const bx = 8;
      const by = 0 + bob;
      g.fillStyle(s.outline, 1);
      g.lineStyle(0.8, 0x000000, 1);
      g.fillCircle(bx, by, 3.5);
      g.strokeCircle(bx, by, 3.5);
      // 도화선
      g.lineStyle(1, 0x6b4523, 1);
      g.beginPath();
      g.moveTo(bx + 1, by - 3);
      g.lineTo(bx + 3, by - 6);
      g.strokePath();
      // 불꽃
      const flick = 1 + Math.sin(this.idleTimeline * 0.022) * 0.4;
      g.fillStyle(s.weapon, 1);
      g.fillCircle(bx + 3, by - 6, 1.4 * flick);
      g.fillStyle(s.accent, 0.85);
      g.fillCircle(bx + 3, by - 6, 0.8 * flick);
    }
  }

  private drawStar(g: Phaser.GameObjects.Graphics, cx: number, cy: number, outer: number, inner: number, color: number): void {
    g.fillStyle(color, 1);
    const points: { x: number; y: number }[] = [];
    for (let i = 0; i < 10; i += 1) {
      const r = i % 2 === 0 ? outer : inner;
      const a = (Math.PI * 2 * i) / 10 - Math.PI / 2;
      points.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r });
    }
    g.fillPoints(points, true);
  }

  private batColor(): number {
    const colors = [0x8b5a2b, 0xa67139, 0xd4a04a, 0xe8c878, 0xf4d35e, 0xf2a35a, 0xe25555];
    return colors[Math.min(colors.length - 1, this.level - 1)] ?? 0x8b5a2b;
  }

  drawRange(force?: boolean): void {
    const g = this.rangeG;
    g.clear();
    if (force || this.hovered) {
      const r = this.profile.range;
      const c = STYLE[this.unitType].body;
      g.fillStyle(c, 0.1);
      g.fillCircle(0, 0, r);
      g.lineStyle(1.5, STYLE[this.unitType].outline, 0.5);
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

  triggerSwing(targetX?: number, targetY?: number): void {
    this.swingAnimMs = 220;
    this.lungeMs = 220;
    if (targetX !== undefined && targetY !== undefined) {
      const dx = targetX - this.x;
      const dy = targetY - this.y;
      this.targetAngle = Math.atan2(dy, dx);
      this.targetDist = Math.hypot(dx, dy);
    }
  }

  tickAnim(deltaMs: number): void {
    this.idleTimeline += deltaMs;
    if (this.swingAnimMs > 0) this.swingAnimMs -= deltaMs;
    if (this.lungeMs > 0) this.lungeMs -= deltaMs;
    this.drawCharacter();
    if (this.cooldownLeft > 0) this.cooldownLeft -= deltaMs;
  }
}
