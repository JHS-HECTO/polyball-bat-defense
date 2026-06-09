import { STAGE } from './config';

export const isBossStage = (stage: number): boolean => stage > 0 && stage % STAGE.bossEvery === 0;

export const computeMobHp = (stage: number): number => {
  return Math.round(STAGE.baseMobHp * Math.pow(STAGE.mobHpGrow, stage - 1));
};

export const computeMobSpeed = (stage: number): number => {
  return STAGE.baseMobSpeed + Math.min(60, stage * 1.5);
};

export const computeBossHp = (stage: number): number => {
  const bossIdx = Math.floor(stage / STAGE.bossEvery);
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
