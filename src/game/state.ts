import { STATS, STAGE } from './config';
import type { GameStatePayload, UpgradeKind } from './gameBus';

export type CharacterStats = {
  damage: number;
  attackCooldown: number;
  range: number;
  damageTier: number;
  speedTier: number;
  rangeTier: number;
  batTier: number;
};

export const initialStats = (): CharacterStats => ({
  damage: STATS.baseDamage,
  attackCooldown: STATS.baseAttackCooldown,
  range: STATS.baseRange,
  damageTier: 0,
  speedTier: 0,
  rangeTier: 0,
  batTier: 0,
});

export const upgradeCost = (kind: UpgradeKind, stats: CharacterStats): number | null => {
  switch (kind) {
    case 'damage':
      return STATS.damageCosts[stats.damageTier] ?? null;
    case 'speed':
      return STATS.speedCosts[stats.speedTier] ?? null;
    case 'range':
      return STATS.rangeCosts[stats.rangeTier] ?? null;
    case 'bat':
      return STATS.batCosts[stats.batTier] ?? null;
  }
};

export const applyUpgrade = (kind: UpgradeKind, stats: CharacterStats): CharacterStats => {
  const next = { ...stats };
  switch (kind) {
    case 'damage':
      next.damageTier += 1;
      next.damage = STATS.baseDamage * Math.pow(STATS.damageMult, next.damageTier) * Math.pow(STATS.batMult, next.batTier);
      break;
    case 'speed':
      next.speedTier += 1;
      next.attackCooldown = STATS.baseAttackCooldown * Math.pow(STATS.speedMult, next.speedTier);
      break;
    case 'range':
      next.rangeTier += 1;
      next.range = STATS.baseRange * Math.pow(STATS.rangeMult, next.rangeTier);
      break;
    case 'bat':
      next.batTier += 1;
      next.damage = STATS.baseDamage * Math.pow(STATS.damageMult, next.damageTier) * Math.pow(STATS.batMult, next.batTier);
      break;
  }
  return next;
};

export const isBossStage = (stage: number): boolean => stage > 0 && stage % STAGE.bossEvery === 0;

export const computeMobHp = (stage: number): number => {
  return Math.round(STAGE.baseMobHp * Math.pow(STAGE.mobHpGrow, stage - 1));
};

export const computeMobSpeed = (stage: number): number => {
  return STAGE.baseMobSpeed + Math.min(60, stage * 1.5);
};

export const computeBossHp = (stage: number): number => {
  const bossIdx = Math.floor(stage / STAGE.bossEvery); // 1, 2, 3...
  return Math.round(computeMobHp(stage) * STAGE.bossHpMult * Math.pow(STAGE.bossHpGrow, bossIdx - 1));
};

export const mobsThisStage = (stage: number): number => {
  if (isBossStage(stage)) return 1;
  return STAGE.baseMobsPerStage + Math.floor(stage * 0.3);
};

export const computeMobGold = (): number => {
  return Math.floor(
    STAGE.normalGoldMin + Math.random() * (STAGE.normalGoldMax - STAGE.normalGoldMin + 1),
  );
};

export const snapshotState = (input: {
  hp: number;
  hpMax: number;
  gold: number;
  stage: number;
  score: number;
  mobsRemaining: number;
  stats: CharacterStats;
  isGameOver: boolean;
}): GameStatePayload => ({
  hp: input.hp,
  hpMax: input.hpMax,
  gold: input.gold,
  stage: input.stage,
  score: input.score,
  isBossStage: isBossStage(input.stage),
  isGameOver: input.isGameOver,
  mobsRemaining: input.mobsRemaining,
  damageTier: input.stats.damageTier,
  speedTier: input.stats.speedTier,
  rangeTier: input.stats.rangeTier,
  batTier: input.stats.batTier,
  damageCost: upgradeCost('damage', input.stats),
  speedCost: upgradeCost('speed', input.stats),
  rangeCost: upgradeCost('range', input.stats),
  batCost: upgradeCost('bat', input.stats),
  damage: input.stats.damage,
  attackCooldown: input.stats.attackCooldown,
  range: input.stats.range,
});
