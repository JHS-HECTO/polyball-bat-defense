import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, PALETTE } from '../config';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'Boot' });
  }

  preload(): void {
    // Twemoji 스프라이트 (Twitter CC-BY 4.0)
    const emojis = [
      'bat', 'bow', 'crystal', 'bomb',          // 유닛
      'skull', 'ogre', 'slime', 'ghost', 'batmob', // 일반 몹
      'dragon',                                  // 보스
      'egg', 'castle', 'flag', 'coin',          // 환경/UI
      'boy', 'knight',                          // 캐릭터 베이스
    ];
    for (const e of emojis) {
      this.load.image(`emoji-${e}`, `/images/emoji/${e}.png`);
    }
  }

  create(): void {
    this.generateProceduralTextures();
    this.scene.start('Main');
  }

  private generateProceduralTextures(): void {
    {
      const g = this.add.graphics();
      g.fillStyle(0x2c1d12, 0.32);
      g.fillEllipse(40, 12, 80, 22);
      g.generateTexture('shadow', 80, 24);
      g.destroy();
    }
    {
      const size = 64;
      const g = this.add.graphics();
      g.fillStyle(PALETTE.grass, 1);
      g.fillRect(0, 0, size, size);
      g.fillStyle(PALETTE.grassDark, 0.55);
      g.fillCircle(12, 18, 3);
      g.fillCircle(40, 8, 2);
      g.fillCircle(50, 44, 3);
      g.fillCircle(20, 52, 2);
      g.fillStyle(PALETTE.grassLight, 0.5);
      g.fillCircle(28, 28, 4);
      g.fillCircle(8, 38, 3);
      g.fillCircle(56, 12, 2);
      g.generateTexture('tile-grass', size, size);
      g.destroy();
    }
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
    {
      const g = this.add.graphics();
      g.fillStyle(0xffffff, 1);
      g.fillRect(0, 0, 4, 4);
      g.generateTexture('px', 4, 4);
      g.destroy();
    }
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, PALETTE.surfaceBase).setOrigin(0, 0);
  }
}
