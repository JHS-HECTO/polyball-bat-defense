import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, PALETTE } from '../config';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'Boot' });
  }

  preload(): void {
    // Twemoji 폴백
    const emojis = [
      'bat', 'bow', 'crystal', 'bomb',
      'skull', 'ogre', 'slime', 'ghost', 'batmob',
      'dragon', 'egg', 'castle', 'flag', 'coin',
      'boy', 'knight', 'elf', 'ninja',
    ];
    for (const e of emojis) {
      this.load.image(`emoji-${e}`, `/images/emoji/${e}.png`);
    }
    // Stable Horde 생성 캐릭터 (4종, 누끼 처리됨)
    this.load.image('sprite-char-melee', '/images/sprites_nobg/10_char_melee.png');
    this.load.image('sprite-char-ranged', '/images/sprites_nobg/13_char_ranged.png');
    this.load.image('sprite-char-magic', '/images/sprites_nobg/14_char_magic.png');
    this.load.image('sprite-char-bomb', '/images/sprites_nobg/15_char_bomb.png');
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
      // 그라데이션 풀밭 (다층 명암 + 클로버 + 디테일)
      const size = 128;
      const g = this.add.graphics();
      // 베이스 그라데이션 (위→아래로 진해짐)
      for (let y = 0; y < size; y += 4) {
        const t = y / size;
        const r = Math.round(0x87 + (0x6c - 0x87) * t * 0.3);
        const gg = Math.round(0xb0 + (0x98 - 0xb0) * t * 0.3);
        const b = Math.round(0x4a + (0x39 - 0x4a) * t * 0.3);
        g.fillStyle((r << 16) | (gg << 8) | b, 1);
        g.fillRect(0, y, size, 4);
      }
      // 진한 풀잎 점
      g.fillStyle(0x4d7f2c, 0.55);
      for (let i = 0; i < 16; i += 1) {
        const x = Math.random() * size;
        const y = Math.random() * size;
        g.fillCircle(x, y, 1.5 + Math.random() * 2);
      }
      // 밝은 풀잎 점
      g.fillStyle(0xb8d68a, 0.6);
      for (let i = 0; i < 10; i += 1) {
        const x = Math.random() * size;
        const y = Math.random() * size;
        g.fillCircle(x, y, 1 + Math.random() * 1.5);
      }
      // 흰 꽃
      const flowers = [
        [22, 18], [88, 32], [54, 76], [16, 96], [104, 68], [76, 110],
      ];
      for (const [fx, fy] of flowers) {
        if (!fx || !fy) continue;
        g.fillStyle(0xffffff, 0.92);
        for (let k = 0; k < 5; k += 1) {
          const a = (Math.PI * 2 * k) / 5;
          g.fillCircle(fx + Math.cos(a) * 2.2, fy + Math.sin(a) * 2.2, 1.4);
        }
        g.fillStyle(0xffd35e, 1);
        g.fillCircle(fx, fy, 1.4);
      }
      // 클로버 잎
      g.fillStyle(0x5cb04a, 0.8);
      for (let i = 0; i < 4; i += 1) {
        const x = Math.random() * size;
        const y = Math.random() * size;
        for (let k = 0; k < 3; k += 1) {
          const a = (Math.PI * 2 * k) / 3 - Math.PI / 2;
          g.fillCircle(x + Math.cos(a) * 2, y + Math.sin(a) * 2, 1.8);
        }
      }
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
