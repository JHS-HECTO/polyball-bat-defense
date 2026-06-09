// Phaser 게임 캔버스 설정 + 게임플레이 상수
// 폴리볼 frame: 9:19.5 비율. 내부 좌표계 540 x 1170 (논리적 픽셀).

export const GAME_WIDTH = 540;
export const GAME_HEIGHT = 1170;

export const WORLD = {
  topPad: 140,
  bottomPad: 220,
  laneTop: 200,
  laneBottom: 880,
  characterX: GAME_WIDTH * 0.5,
  characterY: 760,
  laneCenterY: 500,
  laneHalfH: 90,
} as const;

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

// 캐릭터 베이스 스탯 + 업그레이드 곡선
export const STATS = {
  baseHp: 10,                // 라이프 (몹 도달 시 -1)
  baseDamage: 10,
  baseAttackCooldown: 700,   // ms
  baseRange: 140,
  swingArcMs: 220,           // 스윙 모션 길이

  // 업그레이드별 효과
  damageMult: 1.5,           // 티어마다 +50%
  speedMult: 0.82,           // 쿨다운 18% 감소
  rangeMult: 1.18,           // 사거리 +18%
  batMult: 1.6,              // 빠따 교체 시 데미지 60% 부스트

  // 코스트 (gold) — 티어 인덱스 → 비용
  damageCosts: [10, 25, 60, 150, 360, 800, 1800, 4000, 9000, 20000],
  speedCosts: [12, 30, 75, 180, 420, 950, 2100, 4600, 10000, 22000],
  rangeCosts: [15, 40, 100, 240, 560, 1280, 2800, 6200, 14000, 30000],
  batCosts: [200, 500, 1200, 3000, 7500, 18000, 42000, 95000],

  // 빠따 티어별 시각 색상
  batColors: [0x8b5a2b, 0xa67139, 0xd4a04a, 0xe8c878, 0xf4d35e, 0xf2a35a, 0xe25555, 0x8b3e9c, 0x4aa3df],
} as const;

// 스테이지 → 몹 수, HP, 속도, 보상
export const STAGE = {
  bossEvery: 10,
  baseMobHp: 18,
  baseMobSpeed: 60,          // px/sec
  baseMobsPerStage: 6,
  bossHpMult: 18,
  bossSpeedMult: 0.55,
  bossGold: 60,
  normalGoldMin: 1,
  normalGoldMax: 3,
  // HP 스테이지마다 곱셈 인자
  mobHpGrow: 1.22,
  // 보스 스테이지 인덱스마다 추가 강화
  bossHpGrow: 1.45,
  // 몹 스폰 간격 (ms)
  mobSpawnInterval: 1200,
  // 스테이지 클리어 후 다음 시작까지 (ms)
  interStageDelay: 1600,
} as const;

// 점수
export const SCORE = {
  perMobKill: 50,
  perBossKill: 1500,
  perStageClear: 200,
} as const;
