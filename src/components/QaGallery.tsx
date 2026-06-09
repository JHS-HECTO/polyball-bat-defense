'use client';

import type { GameStatePayload } from 'game/gameBus';
import { GameStateProvider } from 'lib/GameStateContext';
import { GameOverModal } from './GameOverModal';
import { Hud } from './Hud';
import { UpgradePanel } from './UpgradePanel';
import styles from './QaGallery.module.scss';

const SCENARIOS: Array<{ title: string; state: GameStatePayload; modal?: boolean }> = [
  {
    title: '신규 게임 시작 (스테이지 1, 골드 0)',
    state: makeState({ stage: 1, gold: 0, score: 0, hp: 10 }),
  },
  {
    title: '중반 (스테이지 5, 골드 풍족, Lv 진행)',
    state: makeState({
      stage: 5,
      gold: 850,
      score: 7600,
      hp: 8,
      damageTier: 3,
      speedTier: 2,
      rangeTier: 1,
      batTier: 1,
    }),
  },
  {
    title: '보스 스테이지 (10, BOSS 배지)',
    state: makeState({
      stage: 10,
      gold: 240,
      score: 18500,
      hp: 5,
      damageTier: 5,
      speedTier: 4,
      rangeTier: 3,
      batTier: 2,
      isBossStage: true,
    }),
  },
  {
    title: '저체력 위기 (HP 1)',
    state: makeState({ stage: 7, gold: 60, score: 12000, hp: 1, damageTier: 2 }),
  },
  {
    title: '게임 오버',
    state: makeState({
      stage: 13,
      gold: 480,
      score: 41200,
      hp: 0,
      damageTier: 6,
      speedTier: 4,
      rangeTier: 3,
      batTier: 3,
      isGameOver: true,
    }),
    modal: true,
  },
  {
    title: '엔드게임 (모든 업그레이드 만렙)',
    state: makeState({
      stage: 28,
      gold: 99999,
      score: 980000,
      hp: 10,
      damageTier: 10,
      speedTier: 10,
      rangeTier: 10,
      batTier: 8,
    }),
  },
];

function makeState(partial: Partial<GameStatePayload>): GameStatePayload {
  const base: GameStatePayload = {
    hp: 10,
    hpMax: 10,
    gold: 0,
    stage: 1,
    score: 0,
    isBossStage: false,
    isGameOver: false,
    mobsRemaining: 0,
    damageTier: 0,
    speedTier: 0,
    rangeTier: 0,
    batTier: 0,
    damageCost: 10,
    speedCost: 12,
    rangeCost: 15,
    batCost: 200,
    damage: 10,
    attackCooldown: 700,
    range: 140,
  };
  return { ...base, ...partial };
}

export const QaGallery = () => {
  return (
    <div className={styles.shell}>
      <div className={styles.intro}>
        <h1 className={styles.title}>빠따 디펜스 — QA 갤러리</h1>
        <p className={styles.subtitle}>
          모든 UI 상태를 한 페이지로. 컴포넌트 단위 시각 검수용. 실제 게임 캔버스는 빠짐.
        </p>
      </div>
      <div className={styles.grid}>
        {SCENARIOS.map((sc, i) => (
          <section key={i} className={styles.card}>
            <header className={styles.cardHead}>
              <span className={styles.cardIdx}>{String(i + 1).padStart(2, '0')}</span>
              <span className={styles.cardTitle}>{sc.title}</span>
            </header>
            <div className={styles.mini}>
              <GameStateProvider value={sc.state}>
                <div className={styles.miniBg} />
                <Hud />
                <UpgradePanel />
                {sc.modal ? <GameOverModal /> : null}
              </GameStateProvider>
            </div>
          </section>
        ))}
      </div>
    </div>
  );
};
