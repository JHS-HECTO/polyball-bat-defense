import Phaser from 'phaser';
import {
  EGG_POSITION,
  GAME_HEIGHT,
  GAME_WIDTH,
  PALETTE,
  PATH_EDGE_WIDTH,
  PATH_POINTS,
  PATH_WIDTH,
  SCORE,
  STAGE,
  STATS,
  WORLD,
} from '../config';
import { Mob } from '../entities/Mob';
import { gameBus, BUS_EVENTS, type SelectedUnitInfo } from '../gameBus';
import {
  computeBossHp,
  computeMobGold,
  computeMobHp,
  computeMobSpeed,
  isBossStage,
  mobsThisStage,
} from '../state';
import { SLOT_POSITIONS, SlotGrid, type SlotPosition } from '../units/SlotGrid';
import { Unit } from '../units/Unit';
import {
  ALL_TYPES,
  buyCost,
  MAX_LEVEL,
  randomType,
  type UnitLevel,
  type UnitType,
} from '../units/types';

type Projectile = {
  g: Phaser.GameObjects.Graphics;
  x: number;
  y: number;
  vx: number;
  vy: number;
  target: Mob | null;
  damage: number;
  splash: number;
  life: number;
  color: number;
  type: UnitType;
};

export class MainScene extends Phaser.Scene {
  private mobs: Mob[] = [];
  private goldOrbs: Phaser.GameObjects.Container[] = [];
  private projectiles: Projectile[] = [];
  private slotGrid: SlotGrid = new SlotGrid();
  private slotMarkers: Map<number, Phaser.GameObjects.Graphics> = new Map();

  private path!: Phaser.Curves.Path;
  private pathLength: number = 0;

  private hp: number = STATS.baseHp;
  private hpMax: number = STATS.baseHp;
  private gold: number = 100; // starting gold
  private score: number = 0;
  private stage: number = 1;
  private mobsToSpawn: number = 0;
  private lastSpawnAt: number = 0;
  private purchases: number = 0;
  private selectedUnit: Unit | null = null;
  private draggingUnit: Unit | null = null;
  private dragOriginSlot: SlotPosition | null = null;
  private floatingUnit: Unit | null = null;
  private floatingPulseTween: Phaser.Tweens.Tween | null = null;
  private isGameOver: boolean = false;
  private isInterStage: boolean = false;

  private static SPAWN_POINT = { x: 270, y: 880 };

  private onBuyRequest = () => this.tryBuy();
  private onSellRequest = () => this.trySell();
  private onRestart = () => this.restart();

  constructor() {
    super({ key: 'Main' });
  }

  create(): void {
    this.drawBackground();
    this.buildPath();
    this.drawPath();
    this.drawFlagAndCastle();
    this.drawTreesAndFlowers();
    this.drawSlotMarkers();

    this.attachDragHandlers();

    gameBus.on(BUS_EVENTS.buyRequest, this.onBuyRequest);
    gameBus.on(BUS_EVENTS.sellRequest, this.onSellRequest);
    gameBus.on(BUS_EVENTS.restart, this.onRestart);

    this.events.on(Phaser.Scenes.Events.SHUTDOWN, () => {
      gameBus.off(BUS_EVENTS.buyRequest, this.onBuyRequest);
      gameBus.off(BUS_EVENTS.sellRequest, this.onSellRequest);
      gameBus.off(BUS_EVENTS.restart, this.onRestart);
    });

    // 시작 유닛 1마리 자동 배치 (드래그 안하고도 1스테이지 시작 가능)
    this.placeStarterUnit();

    // 스폰 스테이지 영역 표시 (BUY 시 유닛이 등장하는 위치 안내)
    this.drawSpawnPad();

    this.startStage(1);
    this.publishState();
  }

  override update(_time: number, delta: number): void {
    if (this.isGameOver) return;

    // 골드 orb 부유
    for (const o of this.goldOrbs) {
      o.y -= delta * 0.04;
      const life = (o.getData('life') as number | undefined) ?? 600;
      const next = life - delta;
      o.setData('life', next);
      o.setAlpha(Math.max(0, Math.min(1, next / 600)));
      if (next <= 0) o.destroy();
    }
    this.goldOrbs = this.goldOrbs.filter((o) => o.active);

    // 몹 애니메이션 + 경로 진행
    const dtSec = delta / 1000;
    for (let i = this.mobs.length - 1; i >= 0; i -= 1) {
      const m = this.mobs[i];
      if (!m) continue;
      m.tickAnim(delta);
      m.pathT += (m.speed / this.pathLength) * dtSec;
      if (m.pathT >= 1) {
        this.takeLifeHit();
        m.destroy();
        this.mobs.splice(i, 1);
        continue;
      }
      const pt = this.path.getPoint(m.pathT);
      m.setPosition(pt.x, pt.y);
    }

    // 유닛 애니메이션 + 자동 공격
    for (const unit of this.slotGrid.allUnits()) {
      unit.tickAnim(delta);
      if (unit.cooldownLeft <= 0) {
        const target = this.pickTarget(unit);
        if (target) {
          this.unitFires(unit, target);
          unit.cooldownLeft = unit.profile.cooldown;
        }
      }
    }
    // floating 유닛: 배치 전이라 공격 X, 애니메이션만
    if (this.floatingUnit) this.floatingUnit.tickAnim(delta);

    // 발사체 업데이트
    for (let i = this.projectiles.length - 1; i >= 0; i -= 1) {
      const p = this.projectiles[i];
      if (!p) continue;
      p.life -= delta;
      if (p.target && p.target.active) {
        // 호밍
        const dx = p.target.x - p.x;
        const dy = p.target.y - p.y;
        const d = Math.hypot(dx, dy);
        const speed = 540;
        const inv = 1 / Math.max(d, 0.0001);
        p.vx = dx * inv * speed;
        p.vy = dy * inv * speed;
      }
      p.x += p.vx * dtSec;
      p.y += p.vy * dtSec;
      this.redrawProjectile(p);
      // 충돌 체크 (가까운 몹)
      const hit = this.checkProjectileHit(p);
      if (hit || p.life <= 0 || p.x < -40 || p.x > GAME_WIDTH + 40 || p.y < -40 || p.y > GAME_HEIGHT + 40) {
        if (hit) this.applyDamage(p.x, p.y, p.damage, p.splash, p.color);
        p.g.destroy();
        this.projectiles.splice(i, 1);
      }
    }

    // 스폰
    if (!this.isInterStage && this.mobsToSpawn > 0) {
      this.lastSpawnAt += delta;
      const interval = isBossStage(this.stage) ? 800 : STAGE.mobSpawnInterval;
      if (this.lastSpawnAt >= interval) {
        this.spawnMob();
        this.lastSpawnAt = 0;
      }
    }

    // 스테이지 종료
    if (!this.isInterStage && this.mobsToSpawn === 0 && this.mobs.length === 0 && !this.isGameOver) {
      this.completeStage();
    }
  }

  // ─── 그리기 ────────────────────────────────────────────────

  private drawBackground(): void {
    const tileSize = 64;
    for (let y = 0; y < GAME_HEIGHT; y += tileSize) {
      for (let x = 0; x < GAME_WIDTH; x += tileSize) {
        this.add.image(x, y, 'tile-grass').setOrigin(0, 0).setDepth(0);
      }
    }
    const v = this.add.graphics();
    v.setDepth(0.5);
    v.fillStyle(0x2c1d12, 0.18);
    v.fillRect(0, 0, GAME_WIDTH, 40);
    v.fillRect(0, GAME_HEIGHT - 40, GAME_WIDTH, 40);
  }

  private buildPath(): void {
    const head = PATH_POINTS[0];
    if (!head) return;
    this.path = new Phaser.Curves.Path(head.x, head.y);
    for (let i = 1; i < PATH_POINTS.length; i += 1) {
      const p = PATH_POINTS[i]!;
      this.path.lineTo(p.x, p.y);
    }
    this.pathLength = this.path.getLength();
  }

  private drawPath(): void {
    // 사각 loop 경로 + 4면 나무 펜스
    const top = 240;
    const bot = 800;
    const left = 80;
    const right = 460;
    const halfW = PATH_WIDTH / 2;
    // 아레나 경계
    const arenaTop = 160;
    const arenaBot = 950;
    const arenaLeft = 24;
    const arenaRight = 516;
    const plankColor = 0x8b5a2b;
    const plankShadow = 0x4d2e10;
    // 아레나 그림자
    const sh = this.add.graphics();
    sh.setDepth(2);
    sh.fillStyle(0x2c1d12, 0.18);
    sh.fillRoundedRect(arenaLeft - 4, arenaTop - 4, arenaRight - arenaLeft + 8, arenaBot - arenaTop + 8, 6);

    // dirt loop 경로 (사각 ring)
    const lane = this.add.graphics();
    lane.setDepth(3);
    lane.fillStyle(PALETTE.path, 1);
    // 4 모서리 라인 + 모서리 둥글게
    lane.fillRect(left - halfW, top - halfW, right - left + halfW * 2, halfW * 2); // top
    lane.fillRect(left - halfW, bot - halfW, right - left + halfW * 2, halfW * 2); // bot
    lane.fillRect(left - halfW, top - halfW, halfW * 2, bot - top + halfW * 2);    // left
    lane.fillRect(right - halfW, top - halfW, halfW * 2, bot - top + halfW * 2);   // right

    // 점박이
    const speckle = this.add.graphics();
    speckle.setDepth(4);
    speckle.fillStyle(PALETTE.pathDark, 0.55);
    const drawSpecOnSegment = (x1: number, y1: number, x2: number, y2: number) => {
      const samples = 25;
      for (let i = 0; i < samples; i += 1) {
        const t = i / samples;
        const x = x1 + (x2 - x1) * t + (Math.random() - 0.5) * halfW;
        const y = y1 + (y2 - y1) * t + (Math.random() - 0.5) * halfW;
        speckle.fillCircle(x, y, 1 + Math.random() * 1.4);
      }
    };
    drawSpecOnSegment(left, top, right, top);
    drawSpecOnSegment(right, top, right, bot);
    drawSpecOnSegment(right, bot, left, bot);
    drawSpecOnSegment(left, bot, left, top);

    // 4면 펜스 — Top
    const fence = this.add.graphics();
    fence.setDepth(5);
    const plankH = 14;
    const plankWv = 14;
    // 상단
    const topPlanks = 12;
    const topPlankW = (arenaRight - arenaLeft) / topPlanks;
    for (let i = 0; i < topPlanks; i += 1) {
      const x = arenaLeft + i * topPlankW;
      fence.fillStyle(plankColor, 1);
      fence.lineStyle(1.5, plankShadow, 1);
      fence.fillRect(x + 1, arenaTop, topPlankW - 2, plankH);
      fence.strokeRect(x + 1, arenaTop, topPlankW - 2, plankH);
      fence.fillStyle(plankShadow, 1);
      fence.fillCircle(x + 4, arenaTop + 4, 1);
      fence.fillCircle(x + topPlankW - 4, arenaTop + 4, 1);
    }
    // 하단
    for (let i = 0; i < topPlanks; i += 1) {
      const x = arenaLeft + i * topPlankW;
      fence.fillStyle(plankColor, 1);
      fence.lineStyle(1.5, plankShadow, 1);
      fence.fillRect(x + 1, arenaBot - plankH, topPlankW - 2, plankH);
      fence.strokeRect(x + 1, arenaBot - plankH, topPlankW - 2, plankH);
      fence.fillStyle(plankShadow, 1);
      fence.fillCircle(x + 4, arenaBot - plankH + 4, 1);
      fence.fillCircle(x + topPlankW - 4, arenaBot - plankH + 4, 1);
    }
    // 좌측 전체 펜스 (loop는 사각 안에서 도므로 사방 다 막아도 OK)
    const sidePlanks = 20;
    const sidePlankH = (arenaBot - arenaTop) / sidePlanks;
    for (let i = 0; i < sidePlanks; i += 1) {
      const y = arenaTop + i * sidePlankH;
      fence.fillStyle(plankColor, 1);
      fence.lineStyle(1.5, plankShadow, 1);
      fence.fillRect(arenaLeft, y + 1, plankWv, sidePlankH - 2);
      fence.strokeRect(arenaLeft, y + 1, plankWv, sidePlankH - 2);
      fence.fillStyle(plankShadow, 1);
      fence.fillCircle(arenaLeft + 4, y + 4, 1);
      fence.fillCircle(arenaLeft + 4, y + sidePlankH - 4, 1);
    }
    // 우측 전체 펜스
    for (let i = 0; i < sidePlanks; i += 1) {
      const y = arenaTop + i * sidePlankH;
      fence.fillStyle(plankColor, 1);
      fence.lineStyle(1.5, plankShadow, 1);
      fence.fillRect(arenaRight - plankWv, y + 1, plankWv, sidePlankH - 2);
      fence.strokeRect(arenaRight - plankWv, y + 1, plankWv, sidePlankH - 2);
      fence.fillStyle(plankShadow, 1);
      fence.fillCircle(arenaRight - plankWv + 4, y + 4, 1);
      fence.fillCircle(arenaRight - plankWv + 4, y + sidePlankH - 4, 1);
    }
    // 모서리 기둥 (좀 더 두꺼움)
    const cornerPosts: Array<[number, number]> = [
      [arenaLeft - 4, arenaTop - 4],
      [arenaRight - plankWv - 4, arenaTop - 4],
      [arenaLeft - 4, arenaBot - plankH - 4],
      [arenaRight - plankWv - 4, arenaBot - plankH - 4],
    ];
    for (const [px, py] of cornerPosts) {
      fence.fillStyle(plankShadow, 1);
      fence.lineStyle(2, 0x2c1d12, 1);
      fence.fillRect(px, py, plankWv + 8, plankH + 8);
      fence.strokeRect(px, py, plankWv + 8, plankH + 8);
    }
  }

  private drawFlagAndCastle(): void {
    // 알 + 성 = loop 중앙 (디펜드 목표). 깃발 = 시작 모서리.
    this.drawFlag(80, 240);
    this.drawCastle(EGG_POSITION.x, EGG_POSITION.y);
    this.drawEgg(EGG_POSITION.x, EGG_POSITION.y - 40);
  }

  private drawEgg(x: number, y: number): void {
    // 그림자
    const sh = this.add.graphics();
    sh.setDepth(7);
    sh.fillStyle(0x2c1d12, 0.32);
    sh.fillEllipse(x, y + 22, 32, 10);
    // 글로우 후광
    const glow = this.add.graphics();
    glow.setDepth(7);
    glow.fillStyle(0xffd35e, 0.25);
    glow.fillCircle(x, y, 32);
    // Twemoji 알
    const img = this.add.image(x, y, 'emoji-egg');
    img.setDisplaySize(48, 48);
    img.setDepth(8);
    // 알 펄스 트윈
    this.tweens.add({
      targets: img,
      scale: img.scale * 1.08,
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  private drawFlag(x: number, y: number): void {
    // 그림자
    const sh = this.add.graphics();
    sh.setDepth(7);
    sh.fillStyle(0x2c1d12, 0.32);
    sh.fillEllipse(x, y + 26, 36, 10);
    // Twemoji 깃발
    const img = this.add.image(x, y - 4, 'emoji-flag');
    img.setDisplaySize(50, 50);
    img.setDepth(8);
  }

  private drawCastle(x: number, y: number): void {
    // 그림자
    const sh = this.add.graphics();
    sh.setDepth(7);
    sh.fillStyle(0x2c1d12, 0.32);
    sh.fillEllipse(x, y + 32, 64, 12);
    // Twemoji 성
    const img = this.add.image(x, y, 'emoji-castle');
    img.setDisplaySize(72, 72);
    img.setDepth(8);
  }

  private drawTreesAndFlowers(): void {
    const minDistFromPath = 60;
    const minDistFromSlot = 50;
    const candidates: Array<{ x: number; y: number; size: number; kind: 'tree' | 'bush' | 'flower' }> = [];
    let attempts = 0;
    while (candidates.length < 18 && attempts < 400) {
      attempts += 1;
      const x = 24 + Math.random() * (GAME_WIDTH - 48);
      const y = WORLD.topPad + 30 + Math.random() * (GAME_HEIGHT - WORLD.topPad - WORLD.bottomPad - 60);
      let tooClose = false;
      for (let i = 0; i <= 30; i += 1) {
        const p = this.path.getPoint(i / 30);
        const dx = p.x - x;
        const dy = p.y - y;
        if (dx * dx + dy * dy < minDistFromPath * minDistFromPath) {
          tooClose = true;
          break;
        }
      }
      if (tooClose) continue;
      let nearSlot = false;
      for (const s of SLOT_POSITIONS) {
        const dx = s.x - x;
        const dy = s.y - y;
        if (dx * dx + dy * dy < minDistFromSlot * minDistFromSlot) {
          nearSlot = true;
          break;
        }
      }
      if (nearSlot) continue;
      let close = false;
      for (const c of candidates) {
        const ddx = c.x - x;
        const ddy = c.y - y;
        if (ddx * ddx + ddy * ddy < 60 * 60) {
          close = true;
          break;
        }
      }
      if (close) continue;
      const r = Math.random();
      const kind: 'tree' | 'bush' | 'flower' = r < 0.45 ? 'tree' : r < 0.75 ? 'bush' : 'flower';
      candidates.push({ x, y, size: 0.75 + Math.random() * 0.4, kind });
    }
    candidates.sort((a, b) => a.y - b.y);
    for (const c of candidates) {
      if (c.kind === 'tree') this.drawTree(c.x, c.y, c.size);
      else if (c.kind === 'bush') this.drawBush(c.x, c.y, c.size);
      else this.drawFlower(c.x, c.y, c.size);
    }
  }

  private drawTree(x: number, y: number, scale: number): void {
    const g = this.add.graphics();
    g.setDepth(6);
    const s = scale;
    g.fillStyle(0x2c1d12, 0.28);
    g.fillEllipse(x, y + 10 * s, 40 * s, 12 * s);
    g.fillStyle(PALETTE.treeTrunk, 1);
    g.fillRoundedRect(x - 5 * s, y - 8 * s, 10 * s, 22 * s, 3);
    g.fillStyle(PALETTE.treeLeaves, 1);
    g.lineStyle(2, 0x2c4a1e, 1);
    g.fillCircle(x, y - 20 * s, 22 * s);
    g.strokeCircle(x, y - 20 * s, 22 * s);
    g.fillStyle(PALETTE.treeLeavesAlt, 1);
    g.fillCircle(x - 12 * s, y - 14 * s, 14 * s);
    g.strokeCircle(x - 12 * s, y - 14 * s, 14 * s);
    g.fillCircle(x + 12 * s, y - 14 * s, 14 * s);
    g.strokeCircle(x + 12 * s, y - 14 * s, 14 * s);
  }

  private drawBush(x: number, y: number, scale: number): void {
    const g = this.add.graphics();
    g.setDepth(6);
    const s = scale;
    g.fillStyle(0x2c1d12, 0.22);
    g.fillEllipse(x, y + 6 * s, 28 * s, 8 * s);
    g.fillStyle(PALETTE.treeLeaves, 1);
    g.lineStyle(2, 0x2c4a1e, 1);
    g.fillCircle(x - 8 * s, y, 11 * s);
    g.fillCircle(x + 8 * s, y, 11 * s);
    g.fillCircle(x, y - 4 * s, 13 * s);
    g.strokeCircle(x - 8 * s, y, 11 * s);
    g.strokeCircle(x + 8 * s, y, 11 * s);
    g.strokeCircle(x, y - 4 * s, 13 * s);
  }

  private drawFlower(x: number, y: number, scale: number): void {
    const g = this.add.graphics();
    g.setDepth(6);
    const s = scale;
    const colors = [0xff8c8c, 0xffd35e, 0xffffff, 0xd4a5ff];
    const color = colors[Math.floor(Math.random() * colors.length)] ?? 0xff8c8c;
    g.fillStyle(0x3e7f2f, 1);
    g.fillRect(x - 1, y - 4 * s, 2, 8 * s);
    for (let i = 0; i < 5; i += 1) {
      const a = (Math.PI * 2 * i) / 5;
      const px = x + Math.cos(a) * 5 * s;
      const py = y - 4 * s + Math.sin(a) * 5 * s;
      g.fillStyle(color, 1);
      g.fillCircle(px, py, 3 * s);
    }
    g.fillStyle(0xffd35e, 1);
    g.fillCircle(x, y - 4 * s, 2.5 * s);
  }

  private drawSlotMarkers(): void {
    for (const p of SLOT_POSITIONS) {
      const g = this.add.graphics();
      g.setDepth(9);
      this.redrawSlotMarker(g, p.index, false);
      g.setPosition(p.x, p.y);
      this.slotMarkers.set(p.index, g);
    }
  }

  private redrawSlotMarker(g: Phaser.GameObjects.Graphics, index: number, highlight: boolean): void {
    g.clear();
    const occupied = this.slotGrid.isOccupied(index);
    if (occupied) {
      // 점유 슬롯 = 어두운 발판 그림자
      g.fillStyle(0x2c1d12, 0.22);
      g.fillEllipse(0, 26, 56, 16);
    } else {
      // 빈 슬롯 = 디스크형 그림자 + 점선 테두리
      g.fillStyle(highlight ? 0xffd35e : 0x2c1d12, highlight ? 0.18 : 0.08);
      g.fillCircle(0, 0, 30);
      g.lineStyle(2, highlight ? 0xffd35e : 0xffffff, highlight ? 0.7 : 0.4);
      const radius = 28;
      const segs = 20;
      for (let i = 0; i < segs; i += 2) {
        const a1 = (Math.PI * 2 * i) / segs;
        const a2 = (Math.PI * 2 * (i + 1)) / segs;
        g.beginPath();
        g.arc(0, 0, radius, a1, a2, false);
        g.strokePath();
      }
      // 슬롯 인덱스 작은 점 (가운데)
      g.fillStyle(highlight ? 0xffd35e : 0xffffff, highlight ? 0.55 : 0.25);
      g.fillCircle(0, 0, 3);
    }
  }

  private refreshSlotMarkers(highlightFreeSlots: boolean = false): void {
    for (const [idx, g] of this.slotMarkers.entries()) {
      this.redrawSlotMarker(g, idx, highlightFreeSlots && !this.slotGrid.isOccupied(idx));
    }
  }

  // ─── 드래그/머지 ────────────────────────────────────────────

  private attachDragHandlers(): void {
    // 드래그 임계값 0 — 살짝만 움직여도 드래그 시작
    this.input.dragDistanceThreshold = 0;
    // 드래그 멀티 터치 활성
    this.input.setTopOnly(false);

    this.input.on(
      Phaser.Input.Events.DRAG_START,
      (_pointer: Phaser.Input.Pointer, obj: Phaser.GameObjects.GameObject) => {
        if (!(obj instanceof Unit)) return;
        this.draggingUnit = obj;
        this.dragOriginSlot = this.slotGrid.positionOf(obj.slotIndex) ?? null;
        obj.setDepth(50);
        obj.setHovered(true);
        this.refreshSlotMarkers(true);
      },
    );

    this.input.on(
      Phaser.Input.Events.DRAG,
      (_pointer: Phaser.Input.Pointer, obj: Phaser.GameObjects.GameObject, x: number, y: number) => {
        if (!(obj instanceof Unit)) return;
        obj.setPosition(x, y);
      },
    );

    this.input.on(
      Phaser.Input.Events.DRAG_END,
      (_pointer: Phaser.Input.Pointer, obj: Phaser.GameObjects.GameObject) => {
        if (!(obj instanceof Unit)) return;
        const unit = obj;
        const wasFloating = unit.slotIndex < 0;
        obj.setDepth(wasFloating ? 22 : 12);
        obj.setHovered(false);

        const target = this.slotGrid.findSlotAt(unit.x, unit.y, 60);
        const origin = this.dragOriginSlot;
        this.draggingUnit = null;
        this.dragOriginSlot = null;
        this.refreshSlotMarkers(this.floatingUnit !== null);

        // 슬롯 외부 드롭
        if (!target) {
          if (wasFloating) {
            this.snapFloatingBack(unit);
          } else if (origin) {
            this.slotGrid.place(unit, origin);
          }
          return;
        }
        // 자기 슬롯으로 돌아옴
        if (!wasFloating && origin && target.index === origin.index) {
          this.slotGrid.place(unit, origin);
          return;
        }

        const other = this.slotGrid.getAt(target.index);
        if (other) {
          if (other.level === unit.level && unit.level < MAX_LEVEL) {
            if (wasFloating) {
              this.stopFloatingPulse();
              this.floatingUnit = null;
            }
            this.merge(unit, other);
          } else if (other.level === unit.level && unit.level >= MAX_LEVEL) {
            this.toast('이미 최대 Lv', 'warn', 800);
            if (wasFloating) this.snapFloatingBack(unit);
            else if (origin) this.slotGrid.place(unit, origin);
          } else {
            this.toast('같은 Lv만 합성', 'warn', 800);
            if (wasFloating) this.snapFloatingBack(unit);
            else if (origin) this.slotGrid.place(unit, origin);
          }
        } else {
          // 빈 슬롯
          if (wasFloating) {
            this.stopFloatingPulse();
            unit.setScale(1);
            this.floatingUnit = null;
            this.slotGrid.place(unit, target);
            this.refreshSlotMarkers(false);
          } else {
            this.slotGrid.remove(unit);
            this.slotGrid.place(unit, target);
            this.refreshSlotMarkers(false);
          }
        }
        this.publishState();
      },
    );

    // 유닛 hover로 사거리 표시
    this.input.on(Phaser.Input.Events.GAMEOBJECT_OVER, (_p: Phaser.Input.Pointer, obj: Phaser.GameObjects.GameObject) => {
      if (obj instanceof Unit && this.draggingUnit !== obj) obj.setHovered(true);
    });
    this.input.on(Phaser.Input.Events.GAMEOBJECT_OUT, (_p: Phaser.Input.Pointer, obj: Phaser.GameObjects.GameObject) => {
      if (obj instanceof Unit && this.draggingUnit !== obj) obj.setHovered(false);
    });
    // 유닛 클릭 = 선택 (Sell 대상). 단 floating 유닛은 선택 X.
    this.input.on(Phaser.Input.Events.GAMEOBJECT_DOWN, (_p: Phaser.Input.Pointer, obj: Phaser.GameObjects.GameObject) => {
      if (obj instanceof Unit && obj.slotIndex >= 0) this.selectUnit(obj);
    });
  }

  private snapFloatingBack(unit: Unit): void {
    const sp = MainScene.SPAWN_POINT;
    unit.setPosition(sp.x, sp.y);
  }

  private merge(a: Unit, b: Unit): void {
    if (a.level !== b.level) return;
    const newLevel = (a.level + 1) as UnitLevel;
    const newType = randomType();
    // 슬롯 = 비-floating 쪽 (b 우선, 둘 다 슬롯이면 b, a floating이면 b로)
    const targetSlotIndex = b.slotIndex >= 0 ? b.slotIndex : a.slotIndex;
    const slot = this.slotGrid.positionOf(targetSlotIndex);
    if (!slot) return;
    // 양쪽 제거 (slotGrid에 든 것만 remove)
    if (a.slotIndex >= 0) this.slotGrid.remove(a);
    if (b.slotIndex >= 0) this.slotGrid.remove(b);
    if (a.slotIndex < 0 || b.slotIndex < 0) {
      this.stopFloatingPulse();
      this.floatingUnit = null;
    }
    if (this.selectedUnit === a || this.selectedUnit === b) this.selectedUnit = null;
    a.destroy();
    b.destroy();
    // 새 유닛
    const u = new Unit(this, slot.x, slot.y, newType, newLevel, slot.index);
    u.setDepth(12);
    this.slotGrid.place(u, slot);
    this.mergeBurst(slot.x, slot.y, u.profile.color);
    this.toast(`Lv${newLevel} ${u.profile.label}!`, 'success', 1100);
    this.publishState();
  }

  private mergeBurst(x: number, y: number, color: number): void {
    const g = this.add.graphics();
    g.setDepth(40);
    this.tweens.add({
      targets: { t: 0 },
      t: 1,
      duration: 500,
      onUpdate: (tw) => {
        const t = tw.getValue() as number;
        g.clear();
        g.lineStyle(4, color, 1 - t);
        g.strokeCircle(x, y, 18 + t * 36);
        for (let i = 0; i < 10; i += 1) {
          const a = (Math.PI * 2 * i) / 10;
          const px = x + Math.cos(a) * (10 + t * 32);
          const py = y + Math.sin(a) * (10 + t * 32);
          g.fillStyle(color, 1 - t);
          g.fillCircle(px, py, 4 * (1 - t * 0.5));
        }
      },
      onComplete: () => g.destroy(),
    });
    this.cameras.main.shake(80, 0.0025);
  }

  // ─── 구매 / 판매 ───────────────────────────────────────────

  private tryBuy(): void {
    if (this.isGameOver) return;
    if (this.floatingUnit) {
      this.toast('이전 유닛 먼저 배치', 'warn', 800);
      return;
    }
    if (this.slotGrid.isFull()) {
      this.toast('빈 슬롯 없음', 'warn', 700);
      return;
    }
    const cost = buyCost(this.purchases);
    if (this.gold < cost) {
      this.toast('골드 부족', 'warn', 700);
      return;
    }
    this.gold -= cost;
    this.purchases += 1;
    const type = randomType();
    const sp = MainScene.SPAWN_POINT;
    const unit = new Unit(this, sp.x, sp.y, type, 1, -1);
    unit.setDepth(22);
    this.floatingUnit = unit;
    this.startFloatingPulse(unit);
    this.refreshSlotMarkers(true);
    this.toast(`${unit.profile.label} Lv1 — 슬롯으로 드래그`, 'info', 1400);
    this.publishState();
  }

  private startFloatingPulse(unit: Unit): void {
    this.floatingPulseTween?.stop();
    this.floatingPulseTween = this.tweens.add({
      targets: unit,
      scale: 1.08,
      duration: 360,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  private stopFloatingPulse(): void {
    this.floatingPulseTween?.stop();
    this.floatingPulseTween = null;
  }

  private placeStarterUnit(): void {
    const slot = this.slotGrid.randomEmptySlot();
    if (!slot) return;
    const u = new Unit(this, slot.x, slot.y, 'melee', 1, slot.index);
    u.setDepth(12);
    this.slotGrid.place(u, slot);
  }

  private drawSpawnPad(): void {
    const g = this.add.graphics();
    g.setDepth(7);
    const sp = MainScene.SPAWN_POINT;
    // 동그란 패드 (어디서 유닛 나오는지 시각 안내)
    g.fillStyle(0x2c1d12, 0.18);
    g.fillEllipse(sp.x, sp.y + 8, 90, 26);
    g.lineStyle(2, PALETTE.primary3, 0.45);
    g.strokeEllipse(sp.x, sp.y + 8, 90, 26);
    g.fillStyle(PALETTE.primary1, 0.18);
    g.fillCircle(sp.x, sp.y, 36);
    g.lineStyle(2, PALETTE.primary1, 0.5);
    g.strokeCircle(sp.x, sp.y, 36);
    // 라벨
    const t = this.add.text(sp.x, sp.y + 32, '유닛 등장 ↑', {
      fontFamily: 'Pretendard, system-ui, sans-serif',
      fontSize: '10px',
      color: '#5d4632',
    });
    t.setOrigin(0.5);
    t.setDepth(7);
  }

  private trySell(): void {
    if (!this.selectedUnit) {
      this.toast('판매할 유닛 선택', 'info', 700);
      return;
    }
    const refund = this.selectedUnit.refundOnSell();
    this.gold += refund;
    this.slotGrid.remove(this.selectedUnit);
    this.selectedUnit.destroy();
    this.selectedUnit = null;
    this.refreshSlotMarkers(false);
    this.toast(`+${refund}G`, 'success', 700);
    this.publishState();
  }

  private selectUnit(unit: Unit): void {
    this.selectedUnit = unit;
    this.publishState();
  }

  // ─── 공격 ──────────────────────────────────────────────────

  private pickTarget(unit: Unit): Mob | null {
    const r2 = unit.profile.range * unit.profile.range;
    let best: Mob | null = null;
    let bestScore = -Infinity;
    for (const m of this.mobs) {
      const dx = m.x - unit.x;
      const dy = m.y - unit.y;
      if (dx * dx + dy * dy > r2) continue;
      let score = 0;
      if (unit.profile.targeting === 'firstOnPath') score = m.pathT;
      else if (unit.profile.targeting === 'highestHp') score = m.hp;
      else score = -(dx * dx + dy * dy); // nearest: 더 가까울수록 높은 score
      if (score > bestScore) {
        bestScore = score;
        best = m;
      }
    }
    return best;
  }

  private unitFires(unit: Unit, target: Mob): void {
    const color = unit.profile.color;
    unit.triggerSwing(target.x, target.y);
    if (unit.unitType === 'melee') {
      this.applyDamage(target.x, target.y, unit.profile.damage, unit.profile.splashRadius ?? 80, color);
      this.batSwingFx(unit.x, unit.y, target.x, target.y, color);
      this.swingFx(target.x, target.y, unit.profile.splashRadius ?? 80, color);
      this.spawnDamageNumber(target.x, target.y - 18, unit.profile.damage, color);
      return;
    }
    // 발사체 (ranged/magic/bomb)
    const dx = target.x - unit.x;
    const dy = target.y - unit.y;
    const d = Math.hypot(dx, dy);
    const speed = 540;
    const inv = 1 / Math.max(d, 0.0001);
    const g = this.add.graphics();
    g.setDepth(30);
    const p: Projectile = {
      g,
      x: unit.x,
      y: unit.y,
      vx: dx * inv * speed,
      vy: dy * inv * speed,
      target,
      damage: unit.profile.damage,
      splash: unit.profile.splashRadius ?? 0,
      life: 2400,
      color,
      type: unit.unitType,
    };
    this.redrawProjectile(p);
    this.projectiles.push(p);
  }

  private redrawProjectile(p: Projectile): void {
    p.g.clear();
    if (p.type === 'ranged') {
      // 화살
      p.g.lineStyle(3, 0x4d2e10, 1);
      const ang = Math.atan2(p.vy, p.vx);
      const len = 14;
      p.g.beginPath();
      p.g.moveTo(p.x - Math.cos(ang) * len, p.y - Math.sin(ang) * len);
      p.g.lineTo(p.x + Math.cos(ang) * len, p.y + Math.sin(ang) * len);
      p.g.strokePath();
      p.g.fillStyle(p.color, 1);
      p.g.fillCircle(p.x, p.y, 3);
    } else if (p.type === 'magic') {
      p.g.fillStyle(p.color, 0.9);
      p.g.fillCircle(p.x, p.y, 8);
      p.g.lineStyle(2, 0xffffff, 0.6);
      p.g.strokeCircle(p.x, p.y, 8);
    } else if (p.type === 'bomb') {
      p.g.fillStyle(0x2c1d12, 1);
      p.g.fillCircle(p.x, p.y, 8);
      p.g.fillStyle(0xffd35e, 1);
      p.g.fillCircle(p.x - 4, p.y - 4, 2);
    }
  }

  private checkProjectileHit(p: Projectile): boolean {
    if (!p.target || !p.target.active) {
      // 목표 사라짐 — 가장 가까운 몹 충돌 체크 (작은 반경)
      for (const m of this.mobs) {
        const dx = m.x - p.x;
        const dy = m.y - p.y;
        if (dx * dx + dy * dy < 28 * 28) return true;
      }
      return false;
    }
    const dx = p.target.x - p.x;
    const dy = p.target.y - p.y;
    return dx * dx + dy * dy < 26 * 26;
  }

  private applyDamage(cx: number, cy: number, amount: number, splash: number, color: number): void {
    if (splash <= 0) {
      // 단일 타겟 — 가장 가까운 몹에만
      let best: Mob | null = null;
      let bestD = Infinity;
      for (const m of this.mobs) {
        const dx = m.x - cx;
        const dy = m.y - cy;
        const d = dx * dx + dy * dy;
        if (d < bestD) {
          bestD = d;
          best = m;
        }
      }
      if (best && bestD < 40 * 40) {
        const dead = best.takeDamage(amount);
        if (dead) this.killMob(best);
      }
      return;
    }
    const r2 = splash * splash;
    const hit: Mob[] = [];
    for (const m of this.mobs) {
      const dx = m.x - cx;
      const dy = m.y - cy;
      if (dx * dx + dy * dy <= r2) hit.push(m);
    }
    for (const m of hit) {
      const dead = m.takeDamage(amount);
      if (dead) this.killMob(m);
      this.spawnDamageNumber(m.x, m.y - 20, amount, color);
    }
    if (hit.length > 0) {
      this.splashFx(cx, cy, splash, color);
    }
  }

  private spawnDamageNumber(x: number, y: number, amount: number, color: number): void {
    const fmt = amount >= 1000 ? `${(amount / 1000).toFixed(1)}K` : String(Math.round(amount));
    const colorStr = '#' + color.toString(16).padStart(6, '0');
    const t = this.add.text(x + (Math.random() - 0.5) * 10, y, fmt, {
      fontFamily: 'Pretendard, system-ui, sans-serif',
      fontSize: amount >= 100 ? '20px' : '16px',
      fontStyle: 'bold',
      color: colorStr,
      stroke: '#2c1d12',
      strokeThickness: 3,
    });
    t.setOrigin(0.5);
    t.setDepth(40);
    this.tweens.add({
      targets: t,
      y: y - 35,
      alpha: 0,
      scale: 1.2,
      duration: 600,
      ease: 'Cubic.easeOut',
      onComplete: () => t.destroy(),
    });
  }

  private swingFx(cx: number, cy: number, radius: number, color: number): void {
    const g = this.add.graphics();
    g.setDepth(28);
    const s = { r: radius * 0.4, a: 0.6 };
    this.tweens.add({
      targets: s,
      r: radius,
      a: 0,
      duration: 280,
      ease: 'Cubic.easeOut',
      onUpdate: () => {
        g.clear();
        g.lineStyle(5, color, s.a);
        g.strokeCircle(cx, cy, s.r);
      },
      onComplete: () => g.destroy(),
    });
  }

  private batSwingFx(sx: number, sy: number, ex: number, ey: number, color: number): void {
    const g = this.add.graphics();
    g.setDepth(29);
    const s = { a: 0.7 };
    this.tweens.add({
      targets: s,
      a: 0,
      duration: 200,
      ease: 'Cubic.easeOut',
      onUpdate: () => {
        g.clear();
        g.lineStyle(5, 0xffffff, s.a);
        g.beginPath();
        g.moveTo(sx, sy);
        g.lineTo(ex, ey);
        g.strokePath();
        g.lineStyle(2, color, s.a);
        g.beginPath();
        g.moveTo(sx, sy);
        g.lineTo(ex, ey);
        g.strokePath();
      },
      onComplete: () => g.destroy(),
    });
  }

  private splashFx(cx: number, cy: number, radius: number, color: number): void {
    const g = this.add.graphics();
    g.setDepth(28);
    const s = { r: 8, a: 0.7 };
    this.tweens.add({
      targets: s,
      r: radius,
      a: 0,
      duration: 320,
      ease: 'Cubic.easeOut',
      onUpdate: () => {
        g.clear();
        g.fillStyle(color, s.a * 0.6);
        g.fillCircle(cx, cy, s.r);
        g.lineStyle(3, color, s.a);
        g.strokeCircle(cx, cy, s.r);
      },
      onComplete: () => g.destroy(),
    });
  }

  // ─── 게임 루프 ─────────────────────────────────────────────

  private startStage(stage: number): void {
    this.stage = stage;
    this.mobsToSpawn = mobsThisStage(stage);
    this.lastSpawnAt = STAGE.mobSpawnInterval;
    this.isInterStage = false;
    const text = isBossStage(stage) ? `보스 등장! 스테이지 ${stage}` : `스테이지 ${stage}`;
    this.toast(text, isBossStage(stage) ? 'warn' : 'info', 1400);
    this.publishState();
  }

  private completeStage(): void {
    if (this.isGameOver) return;
    this.isInterStage = true;
    this.score += SCORE.perStageClear;
    this.gold += 20 + this.stage * 2;
    this.toast(`스테이지 ${this.stage} 클리어! +${20 + this.stage * 2}G`, 'success', 1200);
    this.publishState();
    this.time.delayedCall(STAGE.interStageDelay, () => {
      if (!this.isGameOver) this.startStage(this.stage + 1);
    });
  }

  private spawnMob(): void {
    const boss = isBossStage(this.stage);
    const hp = boss ? computeBossHp(this.stage) : computeMobHp(this.stage);
    const speed = boss
      ? computeMobSpeed(this.stage) * STAGE.bossSpeedMult
      : computeMobSpeed(this.stage);
    const goldReward = boss ? STAGE.bossGold : computeMobGold();
    const start = this.path.getPoint(0);
    const mob = new Mob(this, start.x, start.y, {
      kind: boss ? 'boss' : 'normal',
      hp,
      speed,
      goldReward,
      ...(boss ? { bossTier: Math.floor(this.stage / STAGE.bossEvery) } : {}),
    });
    mob.pathT = 0;
    mob.setDepth(10);
    this.mobs.push(mob);
    this.mobsToSpawn = Math.max(0, this.mobsToSpawn - 1);
  }

  private killMob(m: Mob): void {
    const idx = this.mobs.indexOf(m);
    if (idx >= 0) this.mobs.splice(idx, 1);

    const isBoss = m.kind === 'boss';
    this.gold += m.goldReward;
    this.score += isBoss ? SCORE.perBossKill : SCORE.perMobKill;

    this.spawnGoldOrb(m.x, m.y, m.goldReward);
    this.deathBurst(m.x, m.y, isBoss);

    m.destroy();

    if (isBoss) {
      gameBus.emit(BUS_EVENTS.bossKilled, { stage: this.stage, ticketEligible: true });
    }
    this.publishState();
  }

  private spawnGoldOrb(x: number, y: number, amount: number): void {
    if (amount <= 0) return;
    const c = this.add.container(x, y);
    const g = this.add.graphics();
    g.fillStyle(0xf6c531, 1);
    g.lineStyle(2, 0xa8801a, 1);
    g.fillCircle(0, 0, 11);
    g.strokeCircle(0, 0, 11);
    c.add(g);
    const t = this.add.text(0, 0, `+${amount}`, {
      fontFamily: 'Pretendard, system-ui, sans-serif',
      fontSize: '13px',
      color: '#5a3a0a',
      fontStyle: 'bold',
    });
    t.setOrigin(0.5);
    c.add(t);
    c.setDepth(20);
    c.setData('life', 700);
    this.goldOrbs.push(c);
  }

  private deathBurst(x: number, y: number, big: boolean): void {
    const g = this.add.graphics();
    g.setDepth(18);
    const count = big ? 14 : 8;
    const colors = big ? [0xffd35e, 0xff8c42, 0xe25555] : [0xffffff, 0xfceedb, 0xffd35e];
    const dots: Array<{ x: number; y: number; vx: number; vy: number; c: number }> = [];
    for (let i = 0; i < count; i += 1) {
      const a = (Math.PI * 2 * i) / count + Math.random() * 0.4;
      const sp = (big ? 200 : 120) + Math.random() * 80;
      dots.push({
        x: 0,
        y: 0,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        c: colors[i % colors.length]!,
      });
    }
    const lifeMs = big ? 600 : 380;
    this.tweens.add({
      targets: { t: 0 },
      t: 1,
      duration: lifeMs,
      onUpdate: (tw) => {
        const t = tw.getValue() as number;
        g.clear();
        for (const d of dots) {
          const px = x + d.vx * t * 0.5;
          const py = y + d.vy * t * 0.5;
          g.fillStyle(d.c, 1 - t);
          g.fillCircle(px, py, (big ? 6 : 4) * (1 - t * 0.6));
        }
      },
      onComplete: () => g.destroy(),
    });
  }

  private takeLifeHit(): void {
    this.hp = Math.max(0, this.hp - 1);
    this.cameras.main.shake(180, 0.009);
    this.cameras.main.flash(180, 226, 85, 85);
    this.toast('-1 라이프', 'warn', 700);
    if (this.hp <= 0) this.endGame();
    else this.publishState();
  }

  private endGame(): void {
    this.isGameOver = true;
    this.isInterStage = true;
    for (const m of this.mobs) m.destroy();
    this.mobs = [];
    this.publishState();
  }

  private restart(): void {
    this.isGameOver = false;
    this.isInterStage = false;
    this.hp = STATS.baseHp;
    this.hpMax = STATS.baseHp;
    this.gold = 100;
    this.score = 0;
    this.stage = 1;
    this.purchases = 0;
    this.selectedUnit = null;
    // floating 정리
    this.stopFloatingPulse();
    if (this.floatingUnit) {
      this.floatingUnit.destroy();
      this.floatingUnit = null;
    }
    // 모든 유닛 제거
    for (const u of this.slotGrid.allUnits()) u.destroy();
    this.slotGrid.reset();
    // 발사체 제거
    for (const p of this.projectiles) p.g.destroy();
    this.projectiles = [];
    // 시작 유닛 다시
    this.placeStarterUnit();
    this.refreshSlotMarkers(false);
    this.startStage(1);
  }

  private toast(text: string, variant: 'info' | 'success' | 'warn' | 'reward', durationMs = 1200): void {
    gameBus.emit(BUS_EVENTS.toast, { text, variant, durationMs });
  }

  private publishState(): void {
    const buyCostNow = buyCost(this.purchases);
    let selectedInfo: SelectedUnitInfo | null = null;
    if (this.selectedUnit && this.slotGrid.allUnits().includes(this.selectedUnit)) {
      selectedInfo = {
        id: this.selectedUnit.id,
        type: this.selectedUnit.unitType,
        level: this.selectedUnit.level,
        damage: this.selectedUnit.profile.damage,
        range: this.selectedUnit.profile.range,
        cooldown: this.selectedUnit.profile.cooldown,
        sellRefund: this.selectedUnit.refundOnSell(),
      };
    } else if (this.selectedUnit) {
      this.selectedUnit = null;
    }
    gameBus.emit(BUS_EVENTS.state, {
      hp: this.hp,
      hpMax: this.hpMax,
      gold: this.gold,
      stage: this.stage,
      score: this.score,
      isBossStage: isBossStage(this.stage),
      isGameOver: this.isGameOver,
      mobsRemaining: this.mobs.length + this.mobsToSpawn,
      unitsPlaced: this.slotGrid.count(),
      unitsMax: SLOT_POSITIONS.length,
      buyCost: buyCostNow,
      buyAffordable: this.gold >= buyCostNow && this.floatingUnit === null,
      fieldFull: this.slotGrid.isFull(),
      selectedUnitId: selectedInfo?.id ?? null,
      selectedUnitInfo: selectedInfo,
    });
  }
}

// Unused import suppress
void ALL_TYPES;
