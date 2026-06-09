import Phaser from 'phaser';
import { profileFor, sellRefund, type UnitLevel, type UnitProfile, type UnitType } from './types';

let nextId = 1;

// 유닛 타입별 스타일 토큰
const STYLE: Record<
  UnitType,
  {
    skin: number;        // 얼굴/손 살색
    skinShadow: number;
    body: number;        // 옷/몸통
    bodyShadow: number;
    bodyLight: number;
    accent: number;      // 모자/장식
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
    g.fillStyle(0x2c1d12, 0.32);
    g.fillEllipse(0, 28, 56, 16);
  }

  // bobOffset 0~1, swingPhase -1~1 (스윙 모션)
  private drawCharacter(bobOffset: number): void {
    const g = this.bodyG;
    g.clear();
    const s = STYLE[this.unitType];

    // 다리 (몸 아래 짧은 두 줄)
    g.fillStyle(s.bodyShadow, 1);
    g.fillRoundedRect(-12, 18, 8, 12, 3);
    g.fillRoundedRect(4, 18, 8, 12, 3);

    // 몸통 — 둥근 박스
    g.fillStyle(s.body, 1);
    g.lineStyle(2.5, s.bodyShadow, 1);
    g.fillRoundedRect(-22, -10 + bobOffset, 44, 32, 14);
    g.strokeRoundedRect(-22, -10 + bobOffset, 44, 32, 14);
    // 하이라이트 (왼쪽 위 광택)
    g.fillStyle(s.bodyLight, 0.55);
    g.fillRoundedRect(-18, -8 + bobOffset, 14, 12, 7);

    // 가슴 마크 (타입 아이콘 점)
    g.fillStyle(0xffffff, 0.9);
    g.fillCircle(0, 2 + bobOffset, 6);
    g.fillStyle(s.bodyShadow, 1);
    if (this.unitType === 'melee') {
      // 야구공 줄무늬
      g.lineStyle(1.4, s.accent, 1);
      g.beginPath();
      g.arc(0, 2 + bobOffset, 5, Math.PI * 0.2, Math.PI * 0.8, false);
      g.strokePath();
      g.beginPath();
      g.arc(0, 2 + bobOffset, 5, Math.PI * 1.2, Math.PI * 1.8, false);
      g.strokePath();
    } else if (this.unitType === 'ranged') {
      g.fillTriangle(-3, 0 + bobOffset, 3, 0 + bobOffset, 0, 6 + bobOffset);
    } else if (this.unitType === 'magic') {
      // 별
      this.drawStar(g, 0, 2 + bobOffset, 5, 2, s.accent);
    } else {
      // 폭탄 X 마크
      g.lineStyle(1.5, s.accent, 1);
      g.beginPath();
      g.moveTo(-3, -1 + bobOffset); g.lineTo(3, 5 + bobOffset);
      g.moveTo(3, -1 + bobOffset); g.lineTo(-3, 5 + bobOffset);
      g.strokePath();
    }

    // 머리
    const headY = -32 + bobOffset;
    g.fillStyle(s.skin, 1);
    g.lineStyle(2.5, s.skinShadow, 1);
    g.fillCircle(0, headY, 17);
    g.strokeCircle(0, headY, 17);
    // 볼 (홍조)
    g.fillStyle(0xffb6a8, 0.55);
    g.fillCircle(-9, headY + 3, 3);
    g.fillCircle(9, headY + 3, 3);

    // 눈
    g.fillStyle(0xffffff, 1);
    g.fillCircle(-5, headY - 2, 3.4);
    g.fillCircle(5, headY - 2, 3.4);
    g.fillStyle(0x2c1d12, 1);
    g.fillCircle(-5, headY - 1, 2);
    g.fillCircle(5, headY - 1, 2);
    g.fillStyle(0xffffff, 1);
    g.fillCircle(-4, headY - 2, 0.9);
    g.fillCircle(6, headY - 2, 0.9);

    // 입
    g.lineStyle(1.6, 0x2c1d12, 1);
    g.beginPath();
    g.arc(0, headY + 6, 3, 0.2, Math.PI - 0.2, false);
    g.strokePath();

    // 모자 / 헤드 액세서리 (타입별)
    if (this.unitType === 'melee') {
      // 야구 모자
      g.fillStyle(s.accent, 1);
      g.lineStyle(2.5, s.accentShadow, 1);
      g.fillEllipse(0, headY - 12, 36, 14);
      g.fillRect(-18, headY - 14, 36, 6);
      g.strokeEllipse(0, headY - 12, 36, 14);
      g.fillStyle(s.accentShadow, 1);
      g.fillRect(8, headY - 9, 22, 4); // 챙
      // 모자 로고
      g.fillStyle(0xffffff, 1);
      g.fillCircle(0, headY - 13, 3);
    } else if (this.unitType === 'ranged') {
      // 깃털 모자 (로빈후드)
      g.fillStyle(s.bodyShadow, 1);
      g.lineStyle(2, 0x2c4a1e, 1);
      g.fillTriangle(-14, headY - 10, 14, headY - 10, 0, headY - 22);
      g.strokeTriangle(-14, headY - 10, 14, headY - 10, 0, headY - 22);
      // 깃털
      g.fillStyle(s.accent, 1);
      g.lineStyle(1.5, s.accentShadow, 1);
      g.fillTriangle(8, headY - 18, 22, headY - 28, 14, headY - 16);
    } else if (this.unitType === 'magic') {
      // 마법사 고깔
      g.fillStyle(s.bodyShadow, 1);
      g.lineStyle(2.5, 0x4b1d6c, 1);
      g.beginPath();
      g.moveTo(-15, headY - 8);
      g.lineTo(15, headY - 8);
      g.lineTo(0, headY - 28);
      g.closePath();
      g.fillPath();
      g.strokePath();
      // 챙
      g.fillStyle(s.bodyLight, 1);
      g.fillRect(-15, headY - 11, 30, 5);
      // 별
      this.drawStar(g, 0, headY - 18, 3, 1.4, s.accent);
    } else {
      // 폭탄병 두건
      g.fillStyle(s.accent, 1);
      g.lineStyle(2, s.accentShadow, 1);
      g.fillRoundedRect(-15, headY - 16, 30, 12, 4);
      g.strokeRoundedRect(-15, headY - 16, 30, 12, 4);
      // 줄
      g.fillStyle(s.body, 1);
      g.fillRect(-15, headY - 10, 30, 3);
    }

    // Lv 표시 점 (몸통 아래 색 점)
    g.fillStyle(s.bodyLight, 1);
    g.lineStyle(0.8, s.bodyShadow, 1);
    const dots = Math.min(this.level, 6);
    const totalWidth = (dots - 1) * 5;
    for (let i = 0; i < dots; i += 1) {
      g.fillCircle(-totalWidth / 2 + i * 5, 14 + bobOffset, 1.6);
    }
    if (this.level === 7) {
      // 최고 Lv = 별
      this.drawStar(g, 0, 14 + bobOffset, 4, 2, s.accent);
    }

    // 무기 그리기
    this.drawWeapon();
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

  private drawWeapon(): void {
    const g = this.weaponG;
    g.clear();
    const s = STYLE[this.unitType];
    const swing = this.swingAnimMs > 0 ? Math.sin((this.swingAnimMs / 220) * Math.PI) : 0;

    if (this.unitType === 'melee') {
      // 빠따 — 오른쪽 어깨에서 비스듬히
      const ang = -0.45 + swing * 1.6;
      const sx = 18;
      const sy = -2;
      const len = 38 + this.level * 1.5;
      const ex = sx + Math.cos(ang) * len;
      const ey = sy + Math.sin(ang) * len;
      const ux = (ex - sx) / len;
      const uy = (ey - sy) / len;
      const perpX = -uy;
      const perpY = ux;
      const w1 = 3.5;
      const w2 = 7 + this.level * 0.5;
      const batColor = this.batColor();
      g.fillStyle(batColor, 1);
      g.lineStyle(1.5, s.weaponSecondary, 1);
      const pts = [
        { x: sx + perpX * w1, y: sy + perpY * w1 },
        { x: sx - perpX * w1, y: sy - perpY * w1 },
        { x: ex - perpX * w2, y: ey - perpY * w2 },
        { x: ex + perpX * w2, y: ey + perpY * w2 },
      ];
      g.fillPoints(pts, true);
      g.strokePoints([...pts, pts[0]!], true);
      // 손
      g.fillStyle(s.skin, 1);
      g.lineStyle(1.5, s.skinShadow, 1);
      g.fillCircle(sx, sy, 4);
      g.strokeCircle(sx, sy, 4);
    } else if (this.unitType === 'ranged') {
      // 활 — 왼쪽에 활 들고 화살 시위
      const draw = swing;
      const bx = -18;
      const by = -4;
      g.lineStyle(2.5, s.weaponPrimary, 1);
      // 활 곡선 (다중 선분으로 호 그리기)
      g.beginPath();
      const segs = 12;
      const curveDepth = 14 + draw * 6;
      for (let i = 0; i <= segs; i += 1) {
        const t = i / segs;
        const py = by + (t - 0.5) * 32;
        // 포물선: x = bx - 4 - curveDepth * (1 - 4*(t-0.5)^2)
        const px = bx - 4 - curveDepth * (1 - 4 * (t - 0.5) * (t - 0.5));
        if (i === 0) g.moveTo(px, py);
        else g.lineTo(px, py);
      }
      g.strokePath();
      // 시위
      g.lineStyle(1, 0xfffaf2, 0.85);
      g.beginPath();
      g.moveTo(bx - 4, by - 16);
      g.lineTo(bx - 2 + draw * 8, by);
      g.lineTo(bx - 4, by + 16);
      g.strokePath();
      // 화살 (시위 위)
      if (draw > 0.05) {
        g.lineStyle(1.5, s.weaponSecondary, 1);
        g.beginPath();
        g.moveTo(bx - 2 + draw * 8, by);
        g.lineTo(bx + 12, by);
        g.strokePath();
        g.fillStyle(s.weaponSecondary, 1);
        g.fillTriangle(bx + 10, by - 2, bx + 14, by, bx + 10, by + 2);
      }
      // 손
      g.fillStyle(s.skin, 1);
      g.lineStyle(1.5, s.skinShadow, 1);
      g.fillCircle(bx - 4, by, 3.5);
      g.strokeCircle(bx - 4, by, 3.5);
    } else if (this.unitType === 'magic') {
      // 지팡이 — 오른쪽
      const px = 16;
      const py = -2;
      const len = 36 + this.level * 2;
      const tipX = px;
      const tipY = py - len;
      g.lineStyle(4, s.weaponPrimary, 1);
      g.beginPath();
      g.moveTo(px, py + 8);
      g.lineTo(tipX, tipY);
      g.strokePath();
      // 끝 보석
      const glow = 1 + Math.sin(this.idleTimeline * 0.008) * 0.2;
      g.fillStyle(STYLE.magic.body, 1);
      g.fillCircle(tipX, tipY, 6 * glow);
      g.lineStyle(1.5, STYLE.magic.bodyShadow, 1);
      g.strokeCircle(tipX, tipY, 6 * glow);
      g.fillStyle(0xffffff, 0.85);
      g.fillCircle(tipX - 2, tipY - 2, 2 * glow);
      // 손
      g.fillStyle(s.skin, 1);
      g.lineStyle(1.5, s.skinShadow, 1);
      g.fillCircle(px, py + 4, 4);
      g.strokeCircle(px, py + 4, 4);
    } else {
      // 폭탄 — 들고있는
      const bx = 18;
      const by = -2;
      g.fillStyle(s.weaponPrimary, 1);
      g.lineStyle(2, 0x000000, 1);
      g.fillCircle(bx, by, 9);
      g.strokeCircle(bx, by, 9);
      // 도화선
      g.lineStyle(2, 0x6b4523, 1);
      g.beginPath();
      g.moveTo(bx + 4, by - 8);
      g.lineTo(bx + 10, by - 14);
      g.strokePath();
      // 불꽃
      const flicker = 1 + Math.sin(this.idleTimeline * 0.02) * 0.3;
      g.fillStyle(s.weaponSecondary, 1);
      g.fillCircle(bx + 11, by - 15, 2.5 * flicker);
      g.fillStyle(0xff8c42, 0.85);
      g.fillCircle(bx + 11, by - 15, 1.5 * flicker);
      // 손
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
      g.fillStyle(c, 0.12);
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

  triggerSwing(): void {
    this.swingAnimMs = 220;
  }

  tickAnim(deltaMs: number): void {
    this.idleTimeline += deltaMs;
    const bob = Math.sin(this.idleTimeline * 0.005) * 1.5;
    if (this.swingAnimMs > 0) this.swingAnimMs -= deltaMs;
    this.drawCharacter(bob);
    if (this.cooldownLeft > 0) this.cooldownLeft -= deltaMs;
  }
}
