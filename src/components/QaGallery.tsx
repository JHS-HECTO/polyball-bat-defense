'use client';

import type { GameStatePayload, SelectedUnitInfo } from 'game/gameBus';
import { GameStateProvider } from 'lib/GameStateContext';
import { BuyPanel } from './BuyPanel';
import { GameOverModal } from './GameOverModal';
import { Hud } from './Hud';
import styles from './QaGallery.module.scss';

const sel = (
  type: 'melee' | 'ranged' | 'magic' | 'bomb',
  level: number,
  damage: number,
  range: number,
): SelectedUnitInfo => ({
  id: 1,
  type,
  level,
  damage,
  range,
  cooldown: 700,
  sellRefund: 30,
});

const SCENARIOS: Array<{ title: string; state: GameStatePayload; modal?: boolean }> = [
  {
    title: '신규 시작 (스테이지 1, 100G)',
    state: makeState({ stage: 1, gold: 100, score: 0, hp: 10, unitsPlaced: 1, buyCost: 30, buyAffordable: true }),
  },
  {
    title: '중반 (스테이지 5, 슬롯 7/12)',
    state: makeState({
      stage: 5,
      gold: 240,
      score: 7600,
      hp: 8,
      unitsPlaced: 7,
      buyCost: 142,
      buyAffordable: true,
    }),
  },
  {
    title: '유닛 선택 (활 Lv3)',
    state: makeState({
      stage: 4,
      gold: 88,
      score: 4200,
      hp: 9,
      unitsPlaced: 5,
      buyCost: 102,
      buyAffordable: false,
      selectedUnitId: 42,
      selectedUnitInfo: sel('ranged', 3, 16, 296),
    }),
  },
  {
    title: '보스 스테이지 (10, BOSS)',
    state: makeState({
      stage: 10,
      gold: 320,
      score: 18500,
      hp: 5,
      unitsPlaced: 9,
      buyCost: 230,
      buyAffordable: true,
      isBossStage: true,
    }),
  },
  {
    title: '필드 풀',
    state: makeState({
      stage: 14,
      gold: 580,
      score: 28000,
      hp: 7,
      unitsPlaced: 12,
      buyCost: 330,
      fieldFull: true,
    }),
  },
  {
    title: '게임 오버',
    state: makeState({
      stage: 13,
      gold: 480,
      score: 41200,
      hp: 0,
      isGameOver: true,
      unitsPlaced: 10,
      buyCost: 280,
    }),
    modal: true,
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
    unitsPlaced: 0,
    unitsMax: 12,
    buyCost: 30,
    buyAffordable: true,
    fieldFull: false,
    selectedUnitId: null,
    selectedUnitInfo: null,
  };
  return { ...base, ...partial };
}

export const QaGallery = () => {
  return (
    <div className={styles.shell}>
      <div className={styles.intro}>
        <h1 className={styles.title}>빠따 디펜스 — QA 갤러리</h1>
        <p className={styles.subtitle}>
          머지 TD UI 상태 정적 렌더. 게임 캔버스 없음.
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
                <BuyPanel />
                {sc.modal ? <GameOverModal /> : null}
              </GameStateProvider>
            </div>
          </section>
        ))}
      </div>
    </div>
  );
};
