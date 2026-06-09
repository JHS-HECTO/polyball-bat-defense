import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, PALETTE, STAGE, STATS, SCORE, WORLD } from '../config';
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

  // 게임 상태 (literal-narrowing 회피용 명시적 number)
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
  private isGameOver = false;
  private isInterStage = false;

  // 정적 그래픽 (1회 그림)
  private hudFrame!: Phaser.GameObjects.Graphics;

  // 정리용 핸들러 ref
  private onUpgradeRequest = (kind: UpgradeKind) => this.tryUpgrade(kind);
  private onRestart = () => this.restart();

  constructor() {
    super({ key: 'Main' });
  }

  create(): void {
    this.drawBackground();
    this.drawLane();

    this.character = new Character(this, WORLD.characterX, WORLD.characterY);

    // 사거리는 캐릭터 옆에 있고 차선은 위(laneCenterY). 캐릭터를 차선과 가깝게.
    this.character.setPosition(WORLD.characterX, WORLD.laneCenterY + WORLD.laneHalfH + 60);
    this.character.drawRange(this.stats.range);

    this.hudFrame = this.add.graphics();
    this.hudFrame.setDepth(50);
    this.drawHudFrame();

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

    // 캐릭터 / 몹 애니메이션
    this.character.tickAnim(delta);
    for (const m of this.mobs) m.tickAnim(delta);

    // 골드 orb 부유 애니메이션
    for (const o of this.goldOrbs) {
      o.y -= delta * 0.04;
      const data = o.getData('life') as number | undefined;
      const nextLife = (data ?? 600) - delta;
      o.setData('life', nextLife);
      o.setAlpha(Math.max(0, Math.min(1, nextLife / 600)));
      if (nextLife <= 0) {
        o.destroy();
      }
    }
    this.goldOrbs = this.goldOrbs.filter((o) => o.active);

    // 몹 스폰
    if (!this.isInterStage && this.mobsToSpawn > 0) {
      this.lastSpawnAt += delta;
      const interval = isBossStage(this.stage) ? 600 : STAGE.mobSpawnInterval;
      if (this.lastSpawnAt >= interval) {
        this.spawnMob();
        this.lastSpawnAt = 0;
      }
    }

    // 자동 공격
    this.lastAttackAt += delta;
    if (this.lastAttackAt >= this.stats.attackCooldown) {
      const hit = this.tryAttack();
      if (hit) this.lastAttackAt = 0;
    }

    // 몹 진행 / 도달 처리
    for (let i = this.mobs.length - 1; i >= 0; i -= 1) {
      const m = this.mobs[i];
      if (!m) continue;
      if (m.x > GAME_WIDTH + 60) {
        // 도달 → 라이프 감소
        this.takeLifeHit();
        m.destroy();
        this.mobs.splice(i, 1);
      }
    }

    // 스테이지 종료 체크
    if (
      !this.isInterStage &&
      this.mobsToSpawn === 0 &&
      this.mobs.length === 0 &&
      !this.isGameOver
    ) {
      this.completeStage();
    }
  }

  private drawBackground(): void {
    const tileSize = 64;
    for (let y = 0; y < GAME_HEIGHT; y += tileSize) {
      for (let x = 0; x < GAME_WIDTH; x += tileSize) {
        this.add.image(x, y, 'tile-grass').setOrigin(0, 0).setDepth(0);
      }
    }
  }

  private drawLane(): void {
    const cy = WORLD.laneCenterY;
    const h = WORLD.laneHalfH * 2;
    const tileSize = 64;
    for (let x = 0; x < GAME_WIDTH; x += tileSize) {
      for (let y = cy - h / 2; y < cy + h / 2; y += tileSize) {
        this.add.image(x, y, 'tile-path').setOrigin(0, 0).setDepth(1);
      }
    }
    // 경계
    this.add.rectangle(0, cy - WORLD.laneHalfH - 2, GAME_WIDTH, 4, 0x9a7a52, 0.5).setOrigin(0, 0).setDepth(2);
    this.add.rectangle(0, cy + WORLD.laneHalfH - 2, GAME_WIDTH, 4, 0x9a7a52, 0.5).setOrigin(0, 0).setDepth(2);

    // 시작 / 종료 게이트
    const startGate = this.add.graphics();
    startGate.fillStyle(0x2c1d12, 0.18);
    startGate.fillRect(0, cy - WORLD.laneHalfH, 10, WORLD.laneHalfH * 2);
    startGate.setDepth(2);
    const endGate = this.add.graphics();
    endGate.fillStyle(PALETTE.hp, 0.32);
    endGate.fillRect(GAME_WIDTH - 10, cy - WORLD.laneHalfH, 10, WORLD.laneHalfH * 2);
    endGate.setDepth(2);
  }

  private drawHudFrame(): void {
    // 상단 / 하단 패널 배경만 — 텍스트는 React 오버레이가 담당
    this.hudFrame.clear();
    this.hudFrame.fillStyle(PALETTE.surfaceCard, 0.94);
    this.hudFrame.fillRect(0, 0, GAME_WIDTH, WORLD.topPad);
    this.hudFrame.fillStyle(PALETTE.surfacePanel, 0.96);
    this.hudFrame.fillRect(0, GAME_HEIGHT - WORLD.bottomPad, GAME_WIDTH, WORLD.bottomPad);
  }

  private startStage(stage: number): void {
    this.stage = stage;
    this.mobsToSpawn = mobsThisStage(stage);
    this.mobsSpawnedThisStage = 0;
    this.lastSpawnAt = STAGE.mobSpawnInterval; // 즉시 첫 스폰
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
    const speed = boss ? computeMobSpeed(this.stage) * STAGE.bossSpeedMult : computeMobSpeed(this.stage);
    const goldReward = boss ? STAGE.bossGold : computeMobGold();
    const y = WORLD.laneCenterY + (Math.random() * 2 - 1) * (WORLD.laneHalfH * 0.55);
    const mob = new Mob(this, -40, y, {
      kind: boss ? 'boss' : 'normal',
      hp,
      speed,
      goldReward,
      ...(boss ? { bossTier: Math.floor(this.stage / STAGE.bossEvery) } : {}),
    });
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
    const cost = this.stats.damageTier !== undefined ? undefined : undefined; // tsc placeholder
    const c =
      kind === 'damage'
        ? STATS.damageCosts[this.stats.damageTier]
        : kind === 'speed'
          ? STATS.speedCosts[this.stats.speedTier]
          : kind === 'range'
            ? STATS.rangeCosts[this.stats.rangeTier]
            : STATS.batCosts[this.stats.batTier];
    void cost;
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
