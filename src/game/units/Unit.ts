import Phaser from 'phaser';
import { profileFor, sellRefund, type UnitLevel, type UnitProfile, type UnitType } from './types';

// Twemoji 스프라이트 사용. 절차적 Graphics 폐기.
let nextId = 1;

const TYPE_TO_WEAPON: Record<UnitType, string> = {
  melee: 'emoji-bat',
  ranged: 'emoji-bow',
  magic: 'emoji-crystal',
  bomb: 'emoji-bomb',
};

// Stable Horde 생성 일러스트 (4종) — 누끼 처리됨, 무기 일체형이므로 weapon img 제거 가능
const TYPE_TO_CHARACTER: Record<UnitType, string> = {
  melee: 'sprite-char-melee',
  ranged: 'sprite-char-ranged',
  magic: 'sprite-char-magic',
  bomb: 'sprite-char-bomb',
};

// 일러스트 자체에 무기가 그려져있으므로 추가 무기 표시 안함
const USE_BUILTIN_WEAPON = true;

const TYPE_TO_FRAME_COLOR: Record<UnitType, number> = {
  melee: 0x4b8de8,
  ranged: 0x5bb95b,
  magic: 0xb46be0,
  bomb: 0xe25555,
};

export class Unit extends Phaser.GameObjects.Container {
  readonly id: number;
  unitType: UnitType;
  level: UnitLevel;
  profile: UnitProfile;
  cooldownLeft: number = 0;
  slotIndex: number;

  private shadowG: Phaser.GameObjects.Graphics;
  private frameG: Phaser.GameObjects.Graphics;
  private boyImg: Phaser.GameObjects.Image;
  private weaponImg: Phaser.GameObjects.Image;
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

    // 사거리 링 (hover시 표시)
    this.rangeG = scene.add.graphics();
    this.add(this.rangeG);
    this.rangeG.setVisible(false);

    // 그림자
    this.shadowG = scene.add.graphics();
    this.add(this.shadowG);
    this.drawShadow();

    // 컬러 원형 프레임
    this.frameG = scene.add.graphics();
    this.add(this.frameG);
    this.drawFrame();

    // 캐릭터 일러스트 (Horde 생성, 무기 일체형)
    this.boyImg = scene.add.image(0, -8, TYPE_TO_CHARACTER[type]);
    this.boyImg.setDisplaySize(64, 64);
    this.add(this.boyImg);

    // 무기 이미지 (휘두름 모션용 — 일러스트에 무기 있어도 동작감 위해 별도)
    this.weaponImg = scene.add.image(14, -4, TYPE_TO_WEAPON[type]);
    this.weaponImg.setDisplaySize(20, 20);
    this.weaponImg.setOrigin(0.3, 0.7);
    this.weaponImg.setVisible(false); // 일러스트 무기로 대체 (필요 시 visible=true)
    if (!USE_BUILTIN_WEAPON) this.weaponImg.setVisible(true);
    this.add(this.weaponImg);

    // Lv 태그
    this.levelTag = scene.add.text(0, -38, `Lv${level}`, {
      fontFamily: 'Pretendard, system-ui, sans-serif',
      fontSize: '11px',
      fontStyle: 'bold',
      color: '#fffaf2',
      backgroundColor: '#2c1d12',
      padding: { x: 5, y: 1 },
    });
    this.levelTag.setOrigin(0.5);
    this.add(this.levelTag);

    // 매우 큰 hit 영역 (터치 드래그 안정성)
    this.setSize(100, 110);
    this.setInteractive({
      hitArea: new Phaser.Geom.Rectangle(-50, -64, 100, 110),
      hitAreaCallback: Phaser.Geom.Rectangle.Contains,
      useHandCursor: true,
      draggable: true,
    });

    scene.add.existing(this);
  }

  private drawShadow(): void {
    const g = this.shadowG;
    g.clear();
    g.fillStyle(0x2c1d12, 0.4);
    g.fillEllipse(0, 22, 44, 12);
  }

  private drawFrame(): void {
    const g = this.frameG;
    g.clear();
    const c = TYPE_TO_FRAME_COLOR[this.unitType];
    const dark = this.darken(c, 0.5);
    const mid = this.darken(c, 0.2);
    const light = this.lighten(c, 0.35);
    // 외곽 ring (다크)
    g.fillStyle(dark, 1);
    g.fillCircle(0, 2, 30);
    // 메인 림 (mid)
    g.fillStyle(mid, 1);
    g.fillCircle(0, 0, 28);
    // 내부 (base)
    g.fillStyle(c, 1);
    g.fillCircle(0, -1, 25);
    // 하이라이트 (좌상)
    g.fillStyle(light, 0.45);
    g.fillEllipse(-8, -10, 16, 12);
    // 작은 빛점
    g.fillStyle(0xffffff, 0.55);
    g.fillCircle(-10, -12, 3);
    // 외곽선
    g.lineStyle(2, dark, 1);
    g.strokeCircle(0, 0, 28);
    // Lv 별 표시 (4+ tier)
    if (this.level >= 4) {
      const stars = Math.min(3, this.level - 3);
      for (let i = 0; i < stars; i += 1) {
        const a = -Math.PI / 2 + (i - (stars - 1) / 2) * 0.4;
        const sx = Math.cos(a) * 22;
        const sy = Math.sin(a) * 22;
        this.drawStarShape(g, sx, sy, 4, 2, 0xffd35e);
      }
    }
  }

  private drawStarShape(g: Phaser.GameObjects.Graphics, cx: number, cy: number, outer: number, inner: number, color: number): void {
    g.fillStyle(color, 1);
    g.lineStyle(0.8, 0x2c1d12, 0.7);
    const points: { x: number; y: number }[] = [];
    for (let i = 0; i < 10; i += 1) {
      const r = i % 2 === 0 ? outer : inner;
      const a = (Math.PI * 2 * i) / 10 - Math.PI / 2;
      points.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r });
    }
    g.fillPoints(points, true);
    g.strokePoints(points, true);
  }

  private lighten(c: number, p: number): number {
    const r = Math.min(255, ((c >> 16) & 0xff) + Math.round(255 * p));
    const g = Math.min(255, ((c >> 8) & 0xff) + Math.round(255 * p));
    const b = Math.min(255, (c & 0xff) + Math.round(255 * p));
    return (r << 16) | (g << 8) | b;
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
      const c = TYPE_TO_FRAME_COLOR[this.unitType];
      g.fillStyle(c, 0.1);
      g.fillCircle(0, 0, r);
      g.lineStyle(2, c, 0.6);
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
    if (this.swingAnimMs > 0) this.swingAnimMs -= deltaMs;
    if (this.cooldownLeft > 0) this.cooldownLeft -= deltaMs;

    // Idle bob + 공격 시 살짝 lunge
    const bob = Math.sin(this.idleTimeline * 0.005) * 1.5;
    let lungeX = 0;
    let lungeY = 0;
    if (this.swingAnimMs > 0) {
      const t = 1 - this.swingAnimMs / 220;
      const lungeAmount = Math.sin(t * Math.PI) * 6;
      lungeX = Math.cos(this.targetAngle) * lungeAmount;
      lungeY = Math.sin(this.targetAngle) * lungeAmount;
    }
    this.boyImg.x = lungeX;
    this.boyImg.y = -8 + bob + lungeY;
  }
}
