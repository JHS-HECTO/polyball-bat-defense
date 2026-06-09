import Phaser from 'phaser';
import {
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
  private isGameOver: boolean = false;
  private isInterStage: boolean = false;

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

    // 시작 유닛 1마리 무료 배치 (게임 시작 가능하게)
    const firstSlot = this.slotGrid.randomEmptySlot();
    if (firstSlot) {
      const unit = new Unit(this, firstSlot.x, firstSlot.y, 'melee', 1, firstSlot.index);
      unit.setDepth(12);
      this.slotGrid.place(unit, firstSlot);
    }

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
    const rest = PATH_POINTS.slice(1).map((p) => new Phaser.Math.Vector2(p.x, p.y));
    this.path = new Phaser.Curves.Path(head.x, head.y);
    this.path.splineTo(rest);
    this.pathLength = this.path.getLength();
  }

  private drawPath(): void {
    const shadow = this.add.graphics();
    shadow.setDepth(2);
    shadow.lineStyle(PATH_EDGE_WIDTH + 8, 0x2c1d12, 0.18);
    this.path.draw(shadow, 96);

    const edge = this.add.graphics();
    edge.setDepth(3);
    edge.lineStyle(PATH_EDGE_WIDTH, PALETTE.pathDark, 1);
    this.path.draw(edge, 96);

    const inner = this.add.graphics();
    inner.setDepth(4);
    inner.lineStyle(PATH_WIDTH, PALETTE.path, 1);
    this.path.draw(inner, 96);

    const speckle = this.add.graphics();
    speckle.setDepth(5);
    for (let i = 0; i < 80; i += 1) {
      const t = i / 80;
      const p = this.path.getPoint(t);
      const ox = (Math.random() - 0.5) * 18;
      const oy = (Math.random() - 0.5) * 18;
      speckle.fillStyle(PALETTE.pathDark, 0.5);
      speckle.fillCircle(p.x + ox, p.y + oy, 1.5);
    }
  }

  private drawFlagAndCastle(): void {
    const start = PATH_POINTS[0]!;
    this.drawFlag(start.x, start.y - 14);
    const end = PATH_POINTS[PATH_POINTS.length - 1]!;
    this.drawCastle(end.x, end.y + 32);
  }

  private drawFlag(x: number, y: number): void {
    const g = this.add.graphics();
    g.setDepth(8);
    g.fillStyle(PALETTE.flagPole, 1);
    g.fillRect(x - 2, y - 60, 4, 60);
    g.fillStyle(PALETTE.flagCloth, 1);
    g.fillTriangle(x + 2, y - 56, x + 34, y - 48, x + 2, y - 40);
    const sh = this.add.image(x, y + 4, 'shadow');
    sh.setAlpha(0.35);
    sh.setDepth(7);
  }

  private drawCastle(x: number, y: number): void {
    const g = this.add.graphics();
    g.setDepth(8);
    g.fillStyle(0x2c1d12, 0.25);
    g.fillEllipse(x, y + 56, 130, 22);
    g.fillStyle(PALETTE.castleStone, 1);
    g.lineStyle(3, PALETTE.castleStoneDark, 1);
    g.fillRoundedRect(x - 56, y - 30, 112, 80, 6);
    g.strokeRoundedRect(x - 56, y - 30, 112, 80, 6);
    g.fillRoundedRect(x - 70, y - 50, 24, 100, 4);
    g.strokeRoundedRect(x - 70, y - 50, 24, 100, 4);
    g.fillRoundedRect(x + 46, y - 50, 24, 100, 4);
    g.strokeRoundedRect(x + 46, y - 50, 24, 100, 4);
    g.fillStyle(PALETTE.castleStone, 1);
    for (let i = -3; i <= 3; i += 1) {
      const cx = x + i * 14;
      g.fillRect(cx - 4, y - 38, 8, 10);
      g.lineStyle(2, PALETTE.castleStoneDark, 1);
      g.strokeRect(cx - 4, y - 38, 8, 10);
    }
    g.fillStyle(PALETTE.castleRoof, 1);
    g.lineStyle(2, 0x6f2222, 1);
    g.fillTriangle(x - 72, y - 50, x - 44, y - 50, x - 58, y - 76);
    g.strokeTriangle(x - 72, y - 50, x - 44, y - 50, x - 58, y - 76);
    g.fillTriangle(x + 44, y - 50, x + 72, y - 50, x + 58, y - 76);
    g.strokeTriangle(x + 44, y - 50, x + 72, y - 50, x + 58, y - 76);
    g.fillStyle(0x6b4523, 1);
    g.lineStyle(2, 0x3e2710, 1);
    g.fillRoundedRect(x - 14, y + 12, 28, 38, { tl: 14, tr: 14, bl: 0, br: 0 });
    g.strokeRoundedRect(x - 14, y + 12, 28, 38, { tl: 14, tr: 14, bl: 0, br: 0 });
    g.fillStyle(PALETTE.flagCloth, 1);
    g.fillRect(x - 1, y - 96, 2, 22);
    g.fillTriangle(x + 1, y - 96, x + 18, y - 90, x + 1, y - 84);
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
      // 점유 슬롯 = 옅은 그림자만
      g.fillStyle(0x2c1d12, 0.12);
      g.fillCircle(0, 18, 22);
    } else {
      // 빈 슬롯 = 점선 동그라미
      g.lineStyle(2, highlight ? 0xffd35e : 0x2c1d12, highlight ? 0.65 : 0.32);
      const radius = 26;
      const segs = 18;
      for (let i = 0; i < segs; i += 2) {
        const a1 = (Math.PI * 2 * i) / segs;
        const a2 = (Math.PI * 2 * (i + 1)) / segs;
        g.beginPath();
        g.arc(0, 0, radius, a1, a2, false);
        g.strokePath();
      }
      if (highlight) {
        g.fillStyle(0xffd35e, 0.18);
        g.fillCircle(0, 0, radius);
      }
    }
  }

  private refreshSlotMarkers(highlightFreeSlots: boolean = false): void {
    for (const [idx, g] of this.slotMarkers.entries()) {
      this.redrawSlotMarker(g, idx, highlightFreeSlots && !this.slotGrid.isOccupied(idx));
    }
  }

  // ─── 드래그/머지 ────────────────────────────────────────────

  private attachDragHandlers(): void {
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
        obj.setDepth(12);
        obj.setHovered(false);

        const target = this.slotGrid.findSlotAt(unit.x, unit.y, 60);
        const origin = this.dragOriginSlot;
        this.draggingUnit = null;
        this.dragOriginSlot = null;
        this.refreshSlotMarkers(false);

        if (!target || !origin) {
          if (origin) {
            this.slotGrid.place(unit, origin);
          }
          return;
        }
        if (target.index === origin.index) {
          this.slotGrid.place(unit, origin);
          return;
        }
        const other = this.slotGrid.getAt(target.index);
        if (other) {
          if (other.level === unit.level && unit.level < MAX_LEVEL) {
            // 머지!
            this.merge(unit, other);
          } else if (other.level === unit.level && unit.level >= MAX_LEVEL) {
            this.toast('이미 최대 Lv', 'warn', 800);
            this.slotGrid.place(unit, origin);
          } else {
            this.toast('같은 Lv만 합성', 'warn', 800);
            this.slotGrid.place(unit, origin);
          }
        } else {
          // 빈 슬롯으로 이동
          this.slotGrid.remove(unit);
          this.slotGrid.place(unit, target);
          this.refreshSlotMarkers(false);
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
    // 유닛 클릭 = 선택 (Sell 대상)
    this.input.on(Phaser.Input.Events.GAMEOBJECT_DOWN, (_p: Phaser.Input.Pointer, obj: Phaser.GameObjects.GameObject) => {
      if (obj instanceof Unit) this.selectUnit(obj);
    });
  }

  private merge(a: Unit, b: Unit): void {
    if (a.level !== b.level) return;
    const newLevel = (a.level + 1) as UnitLevel;
    const newType = randomType();
    const slot = this.slotGrid.positionOf(b.slotIndex);
    if (!slot) return;
    // 두 유닛 제거
    this.slotGrid.remove(a);
    this.slotGrid.remove(b);
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
    const cost = buyCost(this.purchases);
    if (this.gold < cost) {
      this.toast('골드 부족', 'warn', 700);
      return;
    }
    const slot = this.slotGrid.randomEmptySlot();
    if (!slot) {
      this.toast('빈 슬롯 없음', 'warn', 700);
      return;
    }
    this.gold -= cost;
    this.purchases += 1;
    const type = randomType();
    const unit = new Unit(this, slot.x, slot.y, type, 1, slot.index);
    unit.setDepth(12);
    this.slotGrid.place(unit, slot);
    this.refreshSlotMarkers(false);
    this.toast(`Lv1 ${unit.profile.label}`, 'info', 700);
    this.spawnGoldOrb(slot.x, slot.y, 0); // visual placeholder skipped (amount=0 — could improve)
    this.publishState();
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
    if (unit.unitType === 'melee') {
      // AOE 즉시 데미지
      this.applyDamage(unit.x, unit.y, unit.profile.damage, unit.profile.splashRadius ?? 100, color);
      this.swingFx(unit.x, unit.y, unit.profile.splashRadius ?? 100, color);
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
    }
    if (hit.length > 0) {
      this.splashFx(cx, cy, splash, color);
    }
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
    // 모든 유닛 제거
    for (const u of this.slotGrid.allUnits()) u.destroy();
    this.slotGrid.reset();
    // 발사체 제거
    for (const p of this.projectiles) p.g.destroy();
    this.projectiles = [];
    // 시작 유닛 다시
    const firstSlot = this.slotGrid.randomEmptySlot();
    if (firstSlot) {
      const u = new Unit(this, firstSlot.x, firstSlot.y, 'melee', 1, firstSlot.index);
      u.setDepth(12);
      this.slotGrid.place(u, firstSlot);
    }
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
      buyAffordable: this.gold >= buyCostNow,
      fieldFull: this.slotGrid.isFull(),
      selectedUnitId: selectedInfo?.id ?? null,
      selectedUnitInfo: selectedInfo,
    });
  }
}

// Unused import suppress
void ALL_TYPES;
