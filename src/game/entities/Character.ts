import Phaser from 'phaser';
import { STATS } from '../config';

// 자동 스윙 캐릭터. 몹이 사거리 내 있을 때 cooldown마다 AOE 휘두름.
export class Character extends Phaser.GameObjects.Container {
  bodyG: Phaser.GameObjects.Graphics;
  batG: Phaser.GameObjects.Graphics;
  rangeRing: Phaser.GameObjects.Graphics;
  swingFx: Phaser.GameObjects.Graphics;

  private swingingMs = 0;
  private rangeBlinkMs = 0;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);

    // 사거리 링 (페이드 인 가능)
    this.rangeRing = scene.add.graphics();
    this.add(this.rangeRing);

    // 그림자
    const shadow = scene.add.image(0, 44, 'shadow');
    shadow.setAlpha(0.55);
    shadow.setScale(1.4);
    this.add(shadow);

    this.bodyG = scene.add.graphics();
    this.add(this.bodyG);

    this.batG = scene.add.graphics();
    this.add(this.batG);

    this.swingFx = scene.add.graphics();
    this.add(this.swingFx);

    this.drawBody();
    this.drawRange(STATS.baseRange);
    this.drawBat(0, 0);

    scene.add.existing(this);
  }

  private drawBody(): void {
    this.bodyG.clear();
    // 유니폼 몸통
    this.bodyG.fillStyle(0x4b8de8, 1);
    this.bodyG.lineStyle(3, 0x2b5fa8, 1);
    this.bodyG.fillRoundedRect(-26, -22, 52, 50, 14);
    this.bodyG.strokeRoundedRect(-26, -22, 52, 50, 14);

    // 어깨 번호
    this.bodyG.fillStyle(0xffffff, 1);
    this.bodyG.fillCircle(0, -2, 9);
    this.bodyG.fillStyle(0x2b5fa8, 1);

    // 머리
    this.bodyG.fillStyle(0xfdd9b8, 1);
    this.bodyG.lineStyle(3, 0xc9a07a, 1);
    this.bodyG.fillCircle(0, -42, 19);
    this.bodyG.strokeCircle(0, -42, 19);

    // 야구 모자
    this.bodyG.fillStyle(0xe25555, 1);
    this.bodyG.fillEllipse(0, -54, 40, 18);
    this.bodyG.fillRect(-20, -54, 40, 8);
    this.bodyG.fillStyle(0xa53939, 1);
    this.bodyG.fillRect(6, -50, 24, 5); // 챙

    // 눈
    this.bodyG.fillStyle(0x2c1d12, 1);
    this.bodyG.fillCircle(-6, -42, 2.5);
    this.bodyG.fillCircle(6, -42, 2.5);

    // 입
    this.bodyG.lineStyle(2, 0x2c1d12, 1);
    this.bodyG.beginPath();
    this.bodyG.arc(0, -34, 4, 0.1, Math.PI - 0.1, false);
    this.bodyG.strokePath();
  }

  drawBat(angle: number, scale: number): void {
    this.batG.clear();
    const batLen = 78;
    const sx = 16;
    const sy = -4;
    const ex = sx + Math.cos(angle) * batLen;
    const ey = sy + Math.sin(angle) * batLen;
    const dx = ex - sx;
    const dy = ey - sy;
    const len = Math.hypot(dx, dy);
    if (len === 0) return;
    const ux = dx / len;
    const uy = dy / len;
    const perpX = -uy;
    const perpY = ux;
    const w1 = 5 + scale * 1.4;
    const w2 = 12 + scale * 3;
    const color = STATS.batColors[Math.min(STATS.batColors.length - 1, scale)] ?? STATS.batColors[0]!;
    this.batG.fillStyle(color, 1);
    this.batG.lineStyle(2, 0x4d2e10, 1);
    const pts = [
      { x: sx + perpX * w1, y: sy + perpY * w1 },
      { x: sx - perpX * w1, y: sy - perpY * w1 },
      { x: ex - perpX * w2, y: ey - perpY * w2 },
      { x: ex + perpX * w2, y: ey + perpY * w2 },
    ];
    this.batG.fillPoints(pts, true);
    this.batG.strokePoints([...pts, pts[0]!], true);
    // 빠따 끝 라벨 (티어 표시 dot)
    if (scale > 0) {
      this.batG.fillStyle(0xffffff, 0.85);
      this.batG.fillCircle(ex - perpX * (w2 - 2), ey - perpY * (w2 - 2), 2 + scale * 0.4);
    }
  }

  drawRange(range: number): void {
    this.rangeRing.clear();
    const a = this.rangeBlinkMs > 0 ? 0.18 : 0.08;
    this.rangeRing.fillStyle(0xffb347, a);
    this.rangeRing.fillCircle(0, 0, range);
    this.rangeRing.lineStyle(2, 0xffb347, 0.45);
    this.rangeRing.strokeCircle(0, 0, range);
  }

  playSwing(range: number, batTier: number): void {
    this.swingingMs = STATS.swingArcMs;
    this.rangeBlinkMs = 200;
    // 빠따 회전 트윈 (각도 변화)
    this.scene.tweens.add({
      targets: { angle: -0.6, scale: batTier },
      angle: 1.6,
      duration: STATS.swingArcMs,
      ease: 'Sine.easeInOut',
      onUpdate: (tw) => {
        const t = tw.getValue();
        if (typeof t === 'number') this.drawBat(t, batTier);
      },
      onComplete: () => this.drawBat(-0.35, batTier),
    });

    // AOE 이펙트 (반투명 원이 펴졌다 사라짐)
    this.swingFx.clear();
    const fx = this.swingFx;
    const start = { r: range * 0.4, a: 0.55 };
    this.scene.tweens.add({
      targets: start,
      r: range,
      a: 0,
      duration: STATS.swingArcMs * 1.4,
      ease: 'Cubic.easeOut',
      onUpdate: () => {
        fx.clear();
        fx.lineStyle(6, 0xffe7a8, start.a);
        fx.strokeCircle(0, 0, start.r);
      },
      onComplete: () => fx.clear(),
    });

    // 카메라 셰이크 (게임 주스)
    this.scene.cameras.main.shake(80, 0.0035);
  }

  tickAnim(deltaMs: number): void {
    if (this.swingingMs > 0) {
      this.swingingMs -= deltaMs;
      if (this.swingingMs <= 0) this.swingingMs = 0;
    }
    if (this.rangeBlinkMs > 0) {
      this.rangeBlinkMs -= deltaMs;
      if (this.rangeBlinkMs <= 0) this.rangeBlinkMs = 0;
    }
  }
}
