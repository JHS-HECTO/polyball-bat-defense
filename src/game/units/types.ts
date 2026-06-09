// 머지 TD 유닛 타입 정의
// 4종: 근접(melee) / 원거리(ranged) / 마법(magic) / 폭탄(bomb)
// 각 Lv 1~7. 같은 Lv 둘 → 랜덤 타입 Lv+1.

export type UnitType = 'melee' | 'ranged' | 'magic' | 'bomb';

export type UnitLevel = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export const MAX_LEVEL: UnitLevel = 7;

export type UnitProfile = {
  type: UnitType;
  damage: number;
  range: number;
  cooldown: number;       // ms
  splashRadius?: number;  // 0 = 단일 타겟
  targeting: 'nearest' | 'highestHp' | 'firstOnPath';
  color: number;
  label: string;
};

const baseProfiles: Record<UnitType, Omit<UnitProfile, 'damage' | 'range' | 'cooldown'>> = {
  melee: {
    type: 'melee',
    splashRadius: 110,
    targeting: 'nearest',
    color: 0x4b8de8,
    label: '빠따',
  },
  ranged: {
    type: 'ranged',
    targeting: 'nearest',
    color: 0x5bb95b,
    label: '활',
  },
  magic: {
    type: 'magic',
    splashRadius: 70,
    targeting: 'nearest',
    color: 0xb46be0,
    label: '마법',
  },
  bomb: {
    type: 'bomb',
    splashRadius: 130,
    targeting: 'highestHp',
    cooldown: 0, // overridden
    color: 0xe25555,
    label: '폭탄',
  } as Omit<UnitProfile, 'damage' | 'range' | 'cooldown'> & { cooldown: number },
};

// Lv별 데미지/사거리/쿨다운 스케일
const baseStats: Record<UnitType, { damage: number; range: number; cooldown: number }> = {
  melee: { damage: 8, range: 160, cooldown: 700 },
  ranged: { damage: 7, range: 280, cooldown: 750 },
  magic: { damage: 11, range: 220, cooldown: 1100 },
  bomb: { damage: 25, range: 320, cooldown: 1800 },
};

export const profileFor = (type: UnitType, level: UnitLevel): UnitProfile => {
  const base = baseStats[type];
  const dmgMult = Math.pow(1.55, level - 1);
  const rangeMult = 1 + (level - 1) * 0.05;
  const cdMult = Math.pow(0.93, level - 1);
  return {
    ...baseProfiles[type],
    damage: Math.round(base.damage * dmgMult),
    range: Math.round(base.range * rangeMult),
    cooldown: Math.round(base.cooldown * cdMult),
  } as UnitProfile;
};

// BUY 비용 — 누적 구매 수에 따라 곡선
export const buyCost = (purchasesSoFar: number): number => {
  return Math.round(30 + purchasesSoFar * 12 + Math.pow(purchasesSoFar, 1.55) * 1.8);
};

// SELL 환급 = 현재 유닛이 든 자원 일부 (Lv 가중)
export const sellRefund = (level: UnitLevel): number => {
  return Math.round(15 * Math.pow(2.2, level - 1));
};

export const ALL_TYPES: UnitType[] = ['melee', 'ranged', 'magic', 'bomb'];

export const randomType = (): UnitType => {
  return ALL_TYPES[Math.floor(Math.random() * ALL_TYPES.length)] ?? 'melee';
};
