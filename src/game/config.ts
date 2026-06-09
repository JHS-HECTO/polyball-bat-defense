// Phaser 게임 캔버스 설정 + 게임플레이 상수

export const GAME_WIDTH = 540;
export const GAME_HEIGHT = 1170;

export const WORLD = {
  topPad: 140,
  bottomPad: 220,
  // 캐릭터 가드포스트 (S-커브 중심 부근)
  characterX: 295,
  characterY: 605,
} as const;

// 가로 lane (좌→우). 알키우기 스타일 — 몹이 왼쪽에서 들어와 오른쪽 알/성채로.
// 슬롯: lane 위/아래 잔디 영역에 분포.
export const PATH_POINTS: ReadonlyArray<{ x: number; y: number }> = [
  { x: -30, y: 520 },  // 시작 (왼쪽 화면 밖)
  { x: 570, y: 520 },  // 끝 (오른쪽 화면 밖 — 알/성채 도착)
];

export const PATH_WIDTH = 92;
export const PATH_EDGE_WIDTH = 102;

// 알/성채 디펜더 영역 좌표
export const EGG_POSITION = { x: 470, y: 520 } as const;
export const CASTLE_POSITION = { x: 520, y: 520 } as const;

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
  grassLight: 0x9bc564,
  path: 0xc89968,
  pathDark: 0xa67b50,
  pathLight: 0xddb586,
  treeLeaves: 0x4d883a,
  treeLeavesAlt: 0x65a04f,
  treeTrunk: 0x6b4523,
  castleStone: 0xc4bba8,
  castleStoneDark: 0x8a7e6c,
  castleRoof: 0xa53939,
  flagPole: 0x6b4523,
  flagCloth: 0xe25555,
} as const;

// 캐릭터 베이스 + 업그레이드
export const STATS = {
  baseHp: 10,
  baseDamage: 10,
  baseAttackCooldown: 700,
  baseRange: 175,
  swingArcMs: 220,

  damageMult: 1.5,
  speedMult: 0.82,
  rangeMult: 1.16,
  batMult: 1.6,

  damageCosts: [10, 25, 60, 150, 360, 800, 1800, 4000, 9000, 20000],
  speedCosts: [12, 30, 75, 180, 420, 950, 2100, 4600, 10000, 22000],
  rangeCosts: [15, 40, 100, 240, 560, 1280, 2800, 6200, 14000, 30000],
  batCosts: [200, 500, 1200, 3000, 7500, 18000, 42000, 95000],

  batColors: [0x8b5a2b, 0xa67139, 0xd4a04a, 0xe8c878, 0xf4d35e, 0xf2a35a, 0xe25555, 0x8b3e9c, 0x4aa3df],
} as const;

export const STAGE = {
  bossEvery: 10,
  baseMobHp: 18,
  baseMobSpeed: 95,          // px/sec along path
  baseMobsPerStage: 6,
  bossHpMult: 18,
  bossSpeedMult: 0.55,
  bossGold: 60,
  normalGoldMin: 1,
  normalGoldMax: 3,
  mobHpGrow: 1.22,
  bossHpGrow: 1.45,
  mobSpawnInterval: 1200,
  interStageDelay: 1600,
} as const;

export const SCORE = {
  perMobKill: 50,
  perBossKill: 1500,
  perStageClear: 200,
} as const;
