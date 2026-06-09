// Phaser 게임 캔버스 설정
// 폴리볼 frame: 9:19.5 비율. 내부 좌표계는 540 x 1170 (논리적 픽셀).
// Scale.FIT으로 부모 div에 맞춰 비율 유지 스케일링.

export const GAME_WIDTH = 540;
export const GAME_HEIGHT = 1170;

// 게임 영역 (월드) 좌표 헬퍼
export const WORLD = {
  topPad: 140, // HUD 영역 (HP/스테이지/골드)
  bottomPad: 220, // 업그레이드 패널 영역
  laneTop: 200,
  laneBottom: 880,
  characterX: GAME_WIDTH * 0.5,
  characterY: 760,
} as const;

// 컬러 (--colors-* SCSS 토큰과 동기화)
export const PALETTE = {
  surfaceBase: 0xfff7ea,
  surfaceCard: 0xffffff,
  surfacePanel: 0xfceedb,
  primary1: 0xffb347,
  primary2: 0xff8c42,
  primary3: 0xd96a2c,
  textPrimary: 0x2c1d12,
  textSecondary: 0x5d4632,
  hp: 0xe25555,
  hpBg: 0x5a2424,
  gold: 0xf6c531,
  ticket: 0xffd166,
  boss: 0x8e3e3e,
  grass: 0x87b04a,
  grassDark: 0x6c9839,
  path: 0xc89968,
  pathDark: 0xa67b50,
} as const;
