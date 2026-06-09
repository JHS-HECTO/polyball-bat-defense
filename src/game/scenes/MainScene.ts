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
import { Character } from '../entities/Character';
import { Mob } from '../entities/Mob';
import { gameBus, BUS_EVENTS, type UpgradeKind } from '../gameBus';
import {
  applyUpgrade,
  computeBossHp,
  computeMobGold,
  computeMobHp,
  computeMobSpeed,
  initialStats,
  isBossStage,
  mobsThisStage,
  snapshotState,
  type CharacterStats,
} from '../state';

export class MainScene extends Phaser.Scene {
  private character!: Character;
  private mobs: Mob[] = [];
  private goldOrbs: Phaser.GameObjects.Container[] = [];
  private path!: Phaser.Curves.Path;
  private pathLength: number = 0;

  private hp: number = STATS.baseHp;
  private hpMax: number = STATS.baseHp;
  private gold: number = 0;
  private score: number = 0;
  private stage: number = 1;
  private mobsToSpawn: number = 0;
  private mobsSpawnedThisStage: number = 0;
  private lastSpawnAt: number = 0;
  private lastAttackAt: number = 0;
  private stats: CharacterStats = initialStats();
  private isGameOver: boolean = false;
  private isInterStage: boolean = false;

  private onUpgradeRequest = (kind: UpgradeKind) => this.tryUpgrade(kind);
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

    this.character = new Character(this, WORLD.characterX, WORLD.characterY);
    this.character.setDepth(15);
    this.character.drawRange(this.stats.range);

    gameBus.on(BUS_EVENTS.upgradeRequest, this.onUpgradeRequest);
    gameBus.on(BUS_EVENTS.restart, this.onRestart);

    this.events.on(Phaser.Scenes.Events.SHUTDOWN, () => {
      gameBus.off(BUS_EVENTS.upgradeRequest, this.onUpgradeRequest);
      gameBus.off(BUS_EVENTS.restart, this.onRestart);
    });

    this.startStage(1);
    this.publishState();
  }

  override update(_time: number, delta: number): void {
    if (this.isGameOver) return;

    this.character.tickAnim(delta);
    for (const m of this.mobs) m.tickAnim(delta);

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

    // 스폰
    if (!this.isInterStage && this.mobsToSpawn > 0) {
      this.lastSpawnAt += delta;
      const interval = isBossStage(this.stage) ? 800 : STAGE.mobSpawnInterval;
      if (this.lastSpawnAt >= interval) {
        this.spawnMob();
        this.lastSpawnAt = 0;
      }
    }

    // 자동 공격
    this.lastAttackAt += delta;
    if (this.lastAttackAt >= this.stats.attackCooldown) {
      if (this.tryAttack()) this.lastAttackAt = 0;
    }

    // 경로 진행
    const dtSec = delta / 1000;
    for (let i = this.mobs.length - 1; i >= 0; i -= 1) {
      const m = this.mobs[i];
      if (!m) continue;
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

    // 스테이지 종료
    if (
      !this.isInterStage &&
      this.mobsToSpawn === 0 &&
      this.mobs.length === 0 &&
      !this.isGameOver
    ) {
      this.completeStage();
    }
  }

  // ─── 배경/경로/데코 ────────────────────────────────────────

  private drawBackground(): void {
    const tileSize = 64;
    for (let y = 0; y < GAME_HEIGHT; y += tileSize) {
      for (let x = 0; x < GAME_WIDTH; x += tileSize) {
        this.add.image(x, y, 'tile-grass').setOrigin(0, 0).setDepth(0);
      }
    }
    // 그라데이션 비네팅 (가장자리 살짝 어둡게)
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
    // 경로 그림자
    const shadow = this.add.graphics();
    shadow.setDepth(2);
    shadow.lineStyle(PATH_EDGE_WIDTH + 8, 0x2c1d12, 0.18);
    this.path.draw(shadow, 96);

    // 경로 외곽 (어두운 흙)
    const edge = this.add.graphics();
    edge.setDepth(3);
    edge.lineStyle(PATH_EDGE_WIDTH, PALETTE.pathDark, 1);
    this.path.draw(edge, 96);

    // 경로 내부 (밝은 흙)
    const inner = this.add.graphics();
    inner.setDepth(4);
    inner.lineStyle(PATH_WIDTH, PALETTE.path, 1);
    this.path.draw(inner, 96);

    // 경로 위 가벼운 점박이 (자갈)
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
    // 시작 지점 깃발
    const start = PATH_POINTS[0]!;
    this.drawFlag(start.x, start.y - 14);

    // 끝 지점 성채
    const end = PATH_POINTS[PATH_POINTS.length - 1]!;
    this.drawCastle(end.x, end.y + 32);
  }

  private drawFlag(x: number, y: number): void {
    const g = this.add.graphics();
    g.setDepth(8);
    // 깃대
    g.fillStyle(PALETTE.flagPole, 1);
    g.fillRect(x - 2, y - 60, 4, 60);
    // 깃발 (펄럭이는 모양)
    g.fillStyle(PALETTE.flagCloth, 1);
    g.fillTriangle(x + 2, y - 56, x + 34, y - 48, x + 2, y - 40);
    // 그림자
    const sh = this.add.image(x, y + 4, 'shadow');
    sh.setAlpha(0.35);
    sh.setDepth(7);
  }

  private drawCastle(x: number, y: number): void {
    const g = this.add.graphics();
    g.setDepth(8);
    // 그림자
    g.fillStyle(0x2c1d12, 0.25);
    g.fillEllipse(x, y + 56, 130, 22);
    // 본체
    g.fillStyle(PALETTE.castleStone, 1);
    g.lineStyle(3, PALETTE.castleStoneDark, 1);
    g.fillRoundedRect(x - 56, y - 30, 112, 80, 6);
    g.strokeRoundedRect(x - 56, y - 30, 112, 80, 6);
    // 좌우 탑
    g.fillRoundedRect(x - 70, y - 50, 24, 100, 4);
    g.strokeRoundedRect(x - 70, y - 50, 24, 100, 4);
    g.fillRoundedRect(x + 46, y - 50, 24, 100, 4);
    g.strokeRoundedRect(x + 46, y - 50, 24, 100, 4);
    // 톱니 (성가퀴)
    g.fillStyle(PALETTE.castleStone, 1);
    for (let i = -3; i <= 3; i += 1) {
      const cx = x + i * 14;
      g.fillRect(cx - 4, y - 38, 8, 10);
      g.lineStyle(2, PALETTE.castleStoneDark, 1);
      g.strokeRect(cx - 4, y - 38, 8, 10);
    }
    // 지붕 (좌우 탑)
    g.fillStyle(PALETTE.castleRoof, 1);
    g.lineStyle(2, 0x6f2222, 1);
    g.fillTriangle(x - 72, y - 50, x - 44, y - 50, x - 58, y - 76);
    g.strokeTriangle(x - 72, y - 50, x - 44, y - 50, x - 58, y - 76);
    g.fillTriangle(x + 44, y - 50, x + 72, y - 50, x + 58, y - 76);
    g.strokeTriangle(x + 44, y - 50, x + 72, y - 50, x + 58, y - 76);
    // 정문
    g.fillStyle(0x6b4523, 1);
    g.lineStyle(2, 0x3e2710, 1);
    g.fillRoundedRect(x - 14, y + 12, 28, 38, { tl: 14, tr: 14, bl: 0, br: 0 });
    g.strokeRoundedRect(x - 14, y + 12, 28, 38, { tl: 14, tr: 14, bl: 0, br: 0 });
    // 깃발 위
    g.fillStyle(PALETTE.flagCloth, 1);
    g.fillRect(x - 1, y - 96, 2, 22);
    g.fillTriangle(x + 1, y - 96, x + 18, y - 90, x + 1, y - 84);
  }

  private drawTreesAndFlowers(): void {
    // 경로 외 영역에 나무/꽃 산발 배치 (경로 침범 방지)
    const minDistFromPath = 60;
    const candidates: Array<{ x: number; y: number; size: number; kind: 'tree' | 'bush' | 'flower' }> = [];
    let attempts = 0;
    while (candidates.length < 28 && attempts < 600) {
      attempts += 1;
      const x = 24 + Math.random() * (GAME_WIDTH - 48);
      const y = WORLD.topPad + 30 + Math.random() * (GAME_HEIGHT - WORLD.topPad - WORLD.bottomPad - 60);
      // 경로 거리 체크 (샘플)
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
      // 캐릭터 가드포스트 근처도 회피
      const cdx = x - WORLD.characterX;
      const cdy = y - WORLD.characterY;
      if (cdx * cdx + cdy * cdy < 90 * 90) continue;
      // 기존 후보와 너무 가까우면 회피
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
      candidates.push({ x, y, size: 0.8 + Math.random() * 0.5, kind });
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
    // 그림자
    g.fillStyle(0x2c1d12, 0.28);
    g.fillEllipse(x, y + 10 * s, 40 * s, 12 * s);
    // 줄기
    g.fillStyle(PALETTE.treeTrunk, 1);
    g.fillRoundedRect(x - 5 * s, y - 8 * s, 10 * s, 22 * s, 3);
    // 잎 (3겹)
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

  // ─── 게임 루프 ─────────────────────────────────────────────

  private startStage(stage: number): void {
    this.stage = stage;
    this.mobsToSpawn = mobsThisStage(stage);
    this.mobsSpawnedThisStage = 0;
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
    this.toast(`스테이지 ${this.stage} 클리어!`, 'success', 1200);
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
    this.mobsSpawnedThisStage += 1;
    this.mobsToSpawn = Math.max(0, this.mobsToSpawn - 1);
  }

  private tryAttack(): boolean {
    if (this.mobs.length === 0) return false;
    const cx = this.character.x;
    const cy = this.character.y;
    const r = this.stats.range;
    const hit: Mob[] = [];
    for (const m of this.mobs) {
      const dx = m.x - cx;
      const dy = m.y - cy;
      if (dx * dx + dy * dy <= r * r) hit.push(m);
    }
    if (hit.length === 0) return false;

    this.character.playSwing(r, this.stats.batTier);

    for (const m of hit) {
      const dead = m.takeDamage(this.stats.damage);
      if (dead) this.killMob(m);
    }
    return true;
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
    if (this.hp <= 0) {
      this.endGame();
    } else {
      this.publishState();
    }
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
    this.gold = 0;
    this.score = 0;
    this.stage = 1;
    this.stats = initialStats();
    this.character.drawRange(this.stats.range);
    this.character.drawBat(-0.35, this.stats.batTier);
    this.startStage(1);
  }

  private tryUpgrade(kind: UpgradeKind): void {
    if (this.isGameOver) return;
    const c =
      kind === 'damage'
        ? STATS.damageCosts[this.stats.damageTier]
        : kind === 'speed'
          ? STATS.speedCosts[this.stats.speedTier]
          : kind === 'range'
            ? STATS.rangeCosts[this.stats.rangeTier]
            : STATS.batCosts[this.stats.batTier];
    if (c === undefined) {
      this.toast('최대 강화', 'warn', 900);
      return;
    }
    if (this.gold < c) {
      this.toast('골드 부족', 'warn', 700);
      return;
    }
    this.gold -= c;
    this.stats = applyUpgrade(kind, this.stats);
    this.character.drawRange(this.stats.range);
    this.character.drawBat(-0.35, this.stats.batTier);
    const labels: Record<UpgradeKind, string> = {
      damage: '데미지 +',
      speed: '공속 +',
      range: '사거리 +',
      bat: '빠따 교체!',
    };
    this.toast(labels[kind], 'success', 700);
    this.publishState();
  }

  private toast(text: string, variant: 'info' | 'success' | 'warn' | 'reward', durationMs = 1200): void {
    gameBus.emit(BUS_EVENTS.toast, { text, variant, durationMs });
  }

  private publishState(): void {
    gameBus.emit(
      BUS_EVENTS.state,
      snapshotState({
        hp: this.hp,
        hpMax: this.hpMax,
        gold: this.gold,
        stage: this.stage,
        score: this.score,
        mobsRemaining: this.mobs.length + this.mobsToSpawn,
        stats: this.stats,
        isGameOver: this.isGameOver,
      }),
    );
  }
}
