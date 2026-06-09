import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, PALETTE } from '../config';

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super({ key: 'Preload' });
  }

  preload(): void {
    this.generateProceduralTextures();
  }

  create(): void {
    // 짧은 페이드 후 메인 진입
    this.cameras.main.fadeIn(220, 0xff, 0xf7, 0xea);
    this.time.delayedCall(120, () => {
      this.scene.start('Main');
    });
  }

  private generateProceduralTextures(): void {
    // 그림자 ellipse
    {
      const g = this.add.graphics();
      g.fillStyle(0x2c1d12, 0.22);
      g.fillEllipse(40, 12, 80, 22);
      g.generateTexture('shadow', 80, 24);
      g.destroy();
    }

    // 풀밭 타일 (격자 패턴)
    {
      const size = 64;
      const g = this.add.graphics();
      g.fillStyle(PALETTE.grass, 1);
      g.fillRect(0, 0, size, size);
      // 점박이
      g.fillStyle(PALETTE.grassDark, 0.6);
      g.fillCircle(12, 18, 3);
      g.fillCircle(40, 8, 2);
      g.fillCircle(50, 44, 3);
      g.fillCircle(20, 52, 2);
      g.generateTexture('tile-grass', size, size);
      g.destroy();
    }

    // 흙길 타일
    {
      const size = 64;
      const g = this.add.graphics();
      g.fillStyle(PALETTE.path, 1);
      g.fillRect(0, 0, size, size);
      g.fillStyle(PALETTE.pathDark, 0.55);
      g.fillCircle(20, 14, 2);
      g.fillCircle(50, 24, 3);
      g.fillCircle(10, 48, 2);
      g.fillCircle(46, 50, 2);
      g.generateTexture('tile-path', size, size);
      g.destroy();
    }

    // 로딩 인디케이터
    {
      const g = this.add.graphics();
      g.fillStyle(PALETTE.textPrimary, 1);
      g.fillCircle(8, 8, 8);
      g.generateTexture('dot', 16, 16);
      g.destroy();
    }

    // 단순 사각 (HP바 등에 재활용)
    {
      const g = this.add.graphics();
      g.fillStyle(0xffffff, 1);
      g.fillRect(0, 0, 4, 4);
      g.generateTexture('px', 4, 4);
      g.destroy();
    }

    // 로딩 화면 (preload 단계에선 비주얼만)
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, PALETTE.surfaceBase).setOrigin(0, 0);
    const label = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2, '준비 중…', {
      fontFamily: 'Pretendard, system-ui, sans-serif',
      fontSize: '24px',
      color: '#2c1d12',
    });
    label.setOrigin(0.5);
  }
}
