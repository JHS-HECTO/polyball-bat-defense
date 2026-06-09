'use client';

import { BUS_EVENTS, gameBus } from 'game/gameBus';
import { useGameState } from 'lib/useGameState';
import styles from './GameOverModal.module.scss';

export const GameOverModal = () => {
  const state = useGameState();
  if (!state || !state.isGameOver) return null;

  return (
    <div className={styles.backdrop} role="dialog" aria-modal aria-label="게임 오버">
      <div className={styles.card}>
        <div className={styles.title}>게임 오버</div>
        <div className={styles.subtitle}>스테이지 {state.stage}까지 진행</div>
        <dl className={styles.stats}>
          <dt>최종 점수</dt>
          <dd>{state.score.toLocaleString()}</dd>
          <dt>도달 스테이지</dt>
          <dd>{state.stage}</dd>
          <dt>유닛 수</dt>
          <dd>
            {state.unitsPlaced} / {state.unitsMax}
          </dd>
        </dl>
        <button
          type="button"
          className={styles.cta}
          onClick={() => gameBus.emit(BUS_EVENTS.restart)}
        >
          다시 시작
        </button>
      </div>
    </div>
  );
};
