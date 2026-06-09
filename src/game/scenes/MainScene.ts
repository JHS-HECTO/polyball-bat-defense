import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, PALETTE, WORLD } from '../config';

// 게임플레이는 4단계에서. 지금은 배경 + 캐릭터 placeholder.
export class MainScene extends Phaser.Scene {
  constructor() {
    super({ key: 'Main' });
  }

  create(): void {
    this.drawBackground();
    this.drawLane();
    this.drawCharacterPlaceholder();
    this.drawDebugLabel();
  }

  private drawBackground(): void {
    // 풀밭 타일링
    const tileSize = 64;
    for (let y = 0; y < GAME_HEIGHT; y += tileSize) {
      for (let x = 0; x < GAME_WIDTH; x += tileSize) {
        this.add.image(x, y, 'tile-grass').setOrigin(0, 0);
      }
    }
    // 상하단 패딩 영역 (HUD / 업그레이드 패널 자리)
    this.add
      .rectangle(0, 0, GAME_WIDTH, WORLD.topPad, PALETTE.surfaceCard, 0.92)
      .setOrigin(0, 0);
    this.add
      .rectangle(0, GAME_HEIGHT - WORLD.bottomPad, GAME_WIDTH, WORLD.bottomPad, PALETTE.surfacePanel, 0.95)
      .setOrigin(0, 0);
  }

  private drawLane(): void {
    // 길 — 횡 단일 레인 (몹이 좌→우)
    const laneY = (WORLD.laneTop + WORLD.laneBottom) / 2;
    const laneH = 180;
    const tileSize = 64;
    for (let x = 0; x < GAME_WIDTH; x += tileSize) {
      for (let y = laneY - laneH / 2; y < laneY + laneH / 2; y += tileSize) {
        this.add.image(x, y, 'tile-path').setOrigin(0, 0);
      }
    }
    // 길 경계선 (살짝 어둡게)
    this.add
      .rectangle(0, laneY - laneH / 2 - 2, GAME_WIDTH, 4, 0x9a7a52, 0.4)
      .setOrigin(0, 0);
    this.add
      .rectangle(0, laneY + laneH / 2 - 2, GAME_WIDTH, 4, 0x9a7a52, 0.4)
      .setOrigin(0, 0);
  }

  private drawCharacterPlaceholder(): void {
    const x = WORLD.characterX;
    const y = WORLD.characterY;

    // 그림자
    this.add.image(x, y + 40, 'shadow').setAlpha(0.55);

    // 몸통 (둥근 직사각)
    const body = this.add.graphics();
    body.fillStyle(0x4b8de8, 1); // 유니폼 블루 (야구 분위기)
    body.fillRoundedRect(x - 26, y - 24, 52, 48, 14);
    body.lineStyle(3, 0x2b5fa8, 1);
    body.strokeRoundedRect(x - 26, y - 24, 52, 48, 14);

    // 머리
    const head = this.add.graphics();
    head.fillStyle(0xfdd9b8, 1); // 살색
    head.fillCircle(x, y - 42, 18);
    head.lineStyle(3, 0xc9a07a, 1);
    head.strokeCircle(x, y - 42, 18);

    // 야구 모자
    const cap = this.add.graphics();
    cap.fillStyle(0xe25555, 1);
    cap.fillEllipse(x, y - 54, 38, 18);
    cap.fillRect(x - 19, y - 54, 38, 8);
    cap.fillStyle(0xa53939, 1);
    cap.fillRect(x + 6, y - 50, 22, 4); // 챙

    // 빠따 (대각선)
    const bat = this.add.graphics();
    bat.fillStyle(0x8b5a2b, 1);
    bat.lineStyle(2, 0x5b3a1c, 1);
    // 손잡이~머리 방향: 캐릭터 우측 위로 들고있는 모양
    const batLen = 70;
    const angle = -0.35; // 약간 위쪽
    const sx = x + 14;
    const sy = y - 6;
    const ex = sx + Math.cos(angle) * batLen;
    const ey = sy + Math.sin(angle) * batLen;
    // 굵은 선 형태
    const dx = ex - sx;
    const dy = ey - sy;
    const len = Math.hypot(dx, dy);
    const ux = dx / len;
    const uy = dy / len;
    const perpX = -uy;
    const perpY = ux;
    const w1 = 5; // 손잡이 굵기
    const w2 = 11; // 끝 굵기
    bat.fillPoints(
      [
        { x: sx + perpX * w1, y: sy + perpY * w1 },
        { x: sx - perpX * w1, y: sy - perpY * w1 },
        { x: ex - perpX * w2, y: ey - perpY * w2 },
        { x: ex + perpX * w2, y: ey + perpY * w2 },
      ],
      true,
    );
    bat.strokePoints(
      [
        { x: sx + perpX * w1, y: sy + perpY * w1 },
        { x: sx - perpX * w1, y: sy - perpY * w1 },
        { x: ex - perpX * w2, y: ey - perpY * w2 },
        { x: ex + perpX * w2, y: ey + perpY * w2 },
        { x: sx + perpX * w1, y: sy + perpY * w1 },
      ],
      true,
    );

    // 사거리 표시 (반투명 원)
    const range = this.add.graphics();
    range.lineStyle(2, PALETTE.primary1, 0.45);
    range.strokeCircle(x, y, 140);
    range.fillStyle(PALETTE.primary1, 0.06);
    range.fillCircle(x, y, 140);
  }

  private drawDebugLabel(): void {
    const t = this.add.text(GAME_WIDTH / 2, 36, '3단계: Phaser 씬 마운트 OK', {
      fontFamily: 'Pretendard, system-ui, sans-serif',
      fontSize: '20px',
      color: '#2c1d12',
      fontStyle: 'bold',
    });
    t.setOrigin(0.5);

    const sub = this.add.text(
      GAME_WIDTH / 2,
      66,
      `${GAME_WIDTH} × ${GAME_HEIGHT} 논리좌표 · Scale.FIT`,
      {
        fontFamily: 'Pretendard, system-ui, sans-serif',
        fontSize: '14px',
        color: '#5d4632',
      },
    );
    sub.setOrigin(0.5);
  }
}
