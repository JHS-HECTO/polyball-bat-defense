import Phaser from 'phaser';
import { profileFor, sellRefund, type UnitLevel, type UnitProfile, type UnitType } from './types';

let nextId = 1;

// AC:NH/알키우기 3D 렌더링 톤. 멀티톤 셰이딩 + 둥근 캐릭터.
const STYLE: Record<
  UnitType,
  {
    skin: number;
    skinShadow: number;
    body: number;
    bodyShadow: number;
    bodyLight: number;
    accent: number;
    accentShadow: number;
    weaponPrimary: number;
    weaponSecondary: number;
  }
> = {
  melee: {
    skin: 0xfdd9b8,
    skinShadow: 0xc9a07a,
    body: 0x4b8de8,
    bodyShadow: 0x2b5fa8,
    bodyLight: 0x7eb2f0,
    accent: 0xe25555,
    accentShadow: 0xa53939,
    weaponPrimary: 0x8b5a2b,
    weaponSecondary: 0x4d2e10,
  },
  ranged: {
    skin: 0xfdd9b8,
    skinShadow: 0xc9a07a,
    body: 0x5bb95b,
    bodyShadow: 0x357c37,
    bodyLight: 0x8ddc8e,
    accent: 0xf4d35e,
    accentShadow: 0xb89a3a,
    weaponPrimary: 0x8b5a2b,
    weaponSecondary: 0x4d2e10,
  },
  magic: {
    skin: 0xfdd9b8,
    skinShadow: 0xc9a07a,
    body: 0xb46be0,
    bodyShadow: 0x6f3d99,
    bodyLight: 0xd4a5ff,
    accent: 0xffd35e,
    accentShadow: 0xb89a3a,
    weaponPrimary: 0x7a5430,
    weaponSecondary: 0x4d2e10,
  },
  bomb: {
    skin: 0xfdd9b8,
    skinShadow: 0xc9a07a,
    body: 0xe25555,
    bodyShadow: 0xa53939,
    bodyLight: 0xff8c8c,
    accent: 0x2c1d12,
    accentShadow: 0x0d0703,
    weaponPrimary: 0x2c1d12,
    weaponSecondary: 0xffd35e,
  },
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
  private weaponG: Phaser.GameObjects.Graphics;
  private rangeG: Phaser.GameObjects.Graphics;
  private levelTag: Phaser.GameObjects.Text;
  private idleTimeline: number = 0;
  private hovered: boolean = false;
  private swingAnimMs: number = 0;
  private targetAngle: number = -Math.PI / 4;
  private targetDist: number = 60;

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

    this.weaponG = scene.add.graphics();
    this.add(this.weaponG);

    this.levelTag = scene.add.text(0, -52, `Lv${level}`, {
      fontFamily: 'Pretendard, system-ui, sans-serif',
      fontSize: '11px',
      fontStyle: 'bold',
      color: '#fffaf2',
      backgroundColor: this.tagBg(),
      padding: { x: 5, y: 1 },
    });
    this.levelTag.setOrigin(0.5);
    this.add(this.levelTag);

    this.drawCharacter(0);

    this.setSize(72, 96);
    this.setInteractive(new Phaser.Geom.Rectangle(-36, -56, 72, 80), Phaser.Geom.Rectangle.Contains);
    scene.input.setDraggable(this);

    scene.add.existing(this);
  }

  private tagBg(): string {
    const s = STYLE[this.unitType];
    const r = (s.bodyShadow >> 16) & 0xff;
    const g = (s.bodyShadow >> 8) & 0xff;
    const b = s.bodyShadow & 0xff;
    return `rgb(${r},${g},${b})`;
  }

  private drawShadow(): void {
    const g = this.shadowG;
    g.clear();
    g.fillStyle(0x2c1d12, 0.36);
    g.fillEllipse(0, 28, 52, 14);
  }

  private drawCharacter(bob: number): void {
    const g = this.bodyG;
    g.clear();
    const s = STYLE[this.unitType];

    // 다리
    g.fillStyle(s.bodyShadow, 1);
    g.fillRoundedRect(-12, 16, 8, 12, 3);
    g.fillRoundedRect(4, 16, 8, 12, 3);

    // 몸통 — 둥근 박스 + 3톤 셰이딩
    g.fillStyle(s.body, 1);
    g.lineStyle(2.5, s.bodyShadow, 1);
    g.fillRoundedRect(-22, -10 + bob, 44, 30, 12);
    g.strokeRoundedRect(-22, -10 + bob, 44, 30, 12);
    // 하이라이트
    g.fillStyle(s.bodyLight, 0.6);
    g.fillRoundedRect(-18, -8 + bob, 14, 10, 6);

    // 가슴 마크
    g.fillStyle(0xffffff, 0.92);
    g.fillCircle(0, 2 + bob, 6);
    if (this.unitType === 'melee') {
      g.lineStyle(1.4, s.accent, 1);
      g.beginPath();
      g.arc(0, 2 + bob, 5, Math.PI * 0.2, Math.PI * 0.8, false);
      g.strokePath();
      g.beginPath();
      g.arc(0, 2 + bob, 5, Math.PI * 1.2, Math.PI * 1.8, false);
      g.strokePath();
    } else if (this.unitType === 'ranged') {
      g.fillStyle(s.bodyShadow, 1);
      g.fillTriangle(-3, 0 + bob, 3, 0 + bob, 0, 6 + bob);
    } else if (this.unitType === 'magic') {
      this.drawStar(g, 0, 2 + bob, 5, 2, s.accent);
    } else {
      g.lineStyle(1.6, s.body, 1);
      g.beginPath();
      g.moveTo(-3, -1 + bob); g.lineTo(3, 5 + bob);
      g.moveTo(3, -1 + bob); g.lineTo(-3, 5 + bob);
      g.strokePath();
    }

    // 머리
    const headY = -32 + bob;
    g.fillStyle(s.skin, 1);
    g.lineStyle(2.5, s.skinShadow, 1);
    g.fillCircle(0, headY, 16);
    g.strokeCircle(0, headY, 16);
    // 볼홍조
    g.fillStyle(0xffb6a8, 0.55);
    g.fillCircle(-8, headY + 3, 3);
    g.fillCircle(8, headY + 3, 3);
    // 눈
    g.fillStyle(0xffffff, 1);
    g.fillCircle(-5, headY - 2, 3.2);
    g.fillCircle(5, headY - 2, 3.2);
    g.fillStyle(0x2c1d12, 1);
    g.fillCircle(-5, headY - 1, 1.8);
    g.fillCircle(5, headY - 1, 1.8);
    g.fillStyle(0xffffff, 1);
    g.fillCircle(-4, headY - 2.5, 0.8);
    g.fillCircle(6, headY - 2.5, 0.8);
    // 입
    g.lineStyle(1.5, 0x2c1d12, 1);
    g.beginPath();
    g.arc(0, headY + 5, 2.8, 0.2, Math.PI - 0.2, false);
    g.strokePath();

    // 모자 / 헤드 액세서리
    if (this.unitType === 'melee') {
      g.fillStyle(s.accent, 1);
      g.lineStyle(2.5, s.accentShadow, 1);
      g.fillEllipse(0, headY - 11, 34, 14);
      g.fillRect(-17, headY - 13, 34, 5);
      g.strokeEllipse(0, headY - 11, 34, 14);
      g.fillStyle(s.accentShadow, 1);
      g.fillRect(8, headY - 9, 20, 4);
      g.fillStyle(0xffffff, 1);
      g.fillCircle(0, headY - 12, 3);
    } else if (this.unitType === 'ranged') {
      g.fillStyle(s.bodyShadow, 1);
      g.lineStyle(2, 0x2c4a1e, 1);
      g.fillTriangle(-13, headY - 10, 13, headY - 10, 0, headY - 20);
      g.strokeTriangle(-13, headY - 10, 13, headY - 10, 0, headY - 20);
      g.fillStyle(s.accent, 1);
      g.fillTriangle(6, headY - 16, 20, headY - 26, 12, headY - 14);
    } else if (this.unitType === 'magic') {
      g.fillStyle(s.bodyShadow, 1);
      g.lineStyle(2.5, 0x4b1d6c, 1);
      g.beginPath();
      g.moveTo(-14, headY - 8);
      g.lineTo(14, headY - 8);
      g.lineTo(0, headY - 26);
      g.closePath();
      g.fillPath();
      g.strokePath();
      g.fillStyle(s.bodyLight, 1);
      g.fillRect(-14, headY - 11, 28, 4);
      this.drawStar(g, 0, headY - 17, 3, 1.4, s.accent);
    } else {
      g.fillStyle(s.accent, 1);
      g.lineStyle(2, s.accentShadow, 1);
      g.fillRoundedRect(-14, headY - 16, 28, 11, 4);
      g.strokeRoundedRect(-14, headY - 16, 28, 11, 4);
      g.fillStyle(s.body, 1);
      g.fillRect(-14, headY - 10, 28, 3);
    }

    // Lv dots
    g.fillStyle(s.bodyLight, 1);
    g.lineStyle(0.8, s.bodyShadow, 1);
    const dots = Math.min(this.level, 6);
    const totalWidth = (dots - 1) * 5;
    for (let i = 0; i < dots; i += 1) {
      g.fillCircle(-totalWidth / 2 + i * 5, 12 + bob, 1.5);
    }
    if (this.level === 7) {
      this.drawStar(g, 0, 12 + bob, 3.5, 1.8, s.accent);
    }

    this.drawWeapon(bob);
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

  private drawWeapon(bob: number): void {
    const g = this.weaponG;
    g.clear();
    const s = STYLE[this.unitType];
    const swing = this.swingAnimMs > 0 ? this.swingAnimMs / 220 : 0; // 1→0
    const swingProgress = 1 - swing; // 0→1

    if (this.unitType === 'melee') {
      // 빠따 — 타겟 방향으로 휘두름
      const baseAng = this.targetAngle;
      const arc = (swingProgress - 0.5) * 1.6;
      const ang = baseAng + arc;
      const sx = 0;
      const sy = -2 + bob;
      const baseLen = 28 + this.level * 1.2;
      // 절정에 길이 늘어남 (몹까지 reach)
      const reach = Math.min(this.targetDist - 8, 180);
      const stretch = Math.sin(swingProgress * Math.PI);
      const len = Math.max(baseLen, baseLen + (reach - baseLen) * stretch);
      const ex = sx + Math.cos(ang) * len;
      const ey = sy + Math.sin(ang) * len;
      const dx = ex - sx;
      const dy = ey - sy;
      const dlen = Math.hypot(dx, dy);
      const ux = dx / dlen;
      const uy = dy / dlen;
      const perpX = -uy;
      const perpY = ux;
      const w1 = 4;
      const w2 = 8 + this.level * 0.4;
      const batColor = this.batColor();
      g.fillStyle(batColor, 1);
      g.lineStyle(2, s.weaponSecondary, 1);
      const pts = [
        { x: sx + perpX * w1, y: sy + perpY * w1 },
        { x: sx - perpX * w1, y: sy - perpY * w1 },
        { x: ex - perpX * w2, y: ey - perpY * w2 },
        { x: ex + perpX * w2, y: ey + perpY * w2 },
      ];
      g.fillPoints(pts, true);
      g.strokePoints([...pts, pts[0]!], true);
      // 잔상 호 (스윙 절정만)
      if (swingProgress > 0.2 && swingProgress < 0.9) {
        g.lineStyle(3, batColor, 0.3);
        for (let i = 1; i <= 3; i += 1) {
          const a2 = baseAng + (swingProgress - 0.5 - i * 0.18) * 1.6;
          const lx = sx + Math.cos(a2) * len * 0.9;
          const ly = sy + Math.sin(a2) * len * 0.9;
          g.beginPath();
          g.moveTo(sx, sy);
          g.lineTo(lx, ly);
          g.strokePath();
        }
      }
      // 손
      g.fillStyle(s.skin, 1);
      g.lineStyle(1.5, s.skinShadow, 1);
      g.fillCircle(sx, sy, 4);
      g.strokeCircle(sx, sy, 4);
    } else if (this.unitType === 'ranged') {
      const draw = swingProgress;
      const bx = -18;
      const by = -4 + bob;
      g.lineStyle(2.5, s.weaponPrimary, 1);
      g.beginPath();
      const segs = 12;
      const curveDepth = 14 + draw * 6;
      for (let i = 0; i <= segs; i += 1) {
        const t = i / segs;
        const py = by + (t - 0.5) * 32;
        const px = bx - 4 - curveDepth * (1 - 4 * (t - 0.5) * (t - 0.5));
        if (i === 0) g.moveTo(px, py);
        else g.lineTo(px, py);
      }
      g.strokePath();
      g.lineStyle(1, 0xfffaf2, 0.85);
      g.beginPath();
      g.moveTo(bx - 4, by - 16);
      g.lineTo(bx - 2 + draw * 8, by);
      g.lineTo(bx - 4, by + 16);
      g.strokePath();
      if (draw > 0.05) {
        g.lineStyle(1.5, s.weaponSecondary, 1);
        g.beginPath();
        g.moveTo(bx - 2 + draw * 8, by);
        g.lineTo(bx + 12, by);
        g.strokePath();
        g.fillStyle(s.weaponSecondary, 1);
        g.fillTriangle(bx + 10, by - 2, bx + 14, by, bx + 10, by + 2);
      }
      g.fillStyle(s.skin, 1);
      g.lineStyle(1.5, s.skinShadow, 1);
      g.fillCircle(bx - 4, by, 3.5);
      g.strokeCircle(bx - 4, by, 3.5);
    } else if (this.unitType === 'magic') {
      const px = 16;
      const py = -2 + bob;
      const len = 36 + this.level * 2;
      const tipX = px;
      const tipY = py - len;
      g.lineStyle(4, s.weaponPrimary, 1);
      g.beginPath();
      g.moveTo(px, py + 8);
      g.lineTo(tipX, tipY);
      g.strokePath();
      const glow = 1 + Math.sin(this.idleTimeline * 0.008) * 0.2;
      g.fillStyle(STYLE.magic.body, 1);
      g.fillCircle(tipX, tipY, 6 * glow);
      g.lineStyle(1.5, STYLE.magic.bodyShadow, 1);
      g.strokeCircle(tipX, tipY, 6 * glow);
      g.fillStyle(0xffffff, 0.85);
      g.fillCircle(tipX - 2, tipY - 2, 2 * glow);
      g.fillStyle(s.skin, 1);
      g.lineStyle(1.5, s.skinShadow, 1);
      g.fillCircle(px, py + 4, 4);
      g.strokeCircle(px, py + 4, 4);
    } else {
      const bx = 18;
      const by = -2 + bob;
      g.fillStyle(s.weaponPrimary, 1);
      g.lineStyle(2, 0x000000, 1);
      g.fillCircle(bx, by, 9);
      g.strokeCircle(bx, by, 9);
      g.lineStyle(2, 0x6b4523, 1);
      g.beginPath();
      g.moveTo(bx + 4, by - 8);
      g.lineTo(bx + 10, by - 14);
      g.strokePath();
      const flicker = 1 + Math.sin(this.idleTimeline * 0.02) * 0.3;
      g.fillStyle(s.weaponSecondary, 1);
      g.fillCircle(bx + 11, by - 15, 2.5 * flicker);
      g.fillStyle(0xff8c42, 0.85);
      g.fillCircle(bx + 11, by - 15, 1.5 * flicker);
      g.fillStyle(s.skin, 1);
      g.lineStyle(1.5, s.skinShadow, 1);
      g.fillCircle(bx - 6, by + 4, 4);
      g.strokeCircle(bx - 6, by + 4, 4);
    }
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
      g.lineStyle(2, c, 0.55);
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
    if (targetX !== undefined && targetY !== undefined) {
      const dx = targetX - this.x;
      const dy = targetY - this.y;
      this.targetAngle = Math.atan2(dy, dx);
      this.targetDist = Math.hypot(dx, dy);
    }
  }

  tickAnim(deltaMs: number): void {
    this.idleTimeline += deltaMs;
    const bob = Math.sin(this.idleTimeline * 0.005) * 1.5;
    if (this.swingAnimMs > 0) this.swingAnimMs -= deltaMs;
    this.drawCharacter(bob);
    if (this.cooldownLeft > 0) this.cooldownLeft -= deltaMs;
  }
}
