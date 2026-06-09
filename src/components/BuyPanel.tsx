'use client';

import clsx from 'clsx';
import { BUS_EVENTS, gameBus } from 'game/gameBus';
import { useGameState } from 'lib/useGameState';
import styles from './BuyPanel.module.scss';

const TYPE_LABELS = {
  melee: '빠따',
  ranged: '활',
  magic: '마법',
  bomb: '폭탄',
} as const;

export const BuyPanel = () => {
  const state = useGameState();
  if (!state || state.isGameOver) return null;

  const selected = state.selectedUnitInfo;

  return (
    <div className={styles.panel}>
      {selected ? (
        <div className={styles.selected}>
          <div className={styles.selTitle}>
            {TYPE_LABELS[selected.type]} <span className={styles.selLv}>Lv{selected.level}</span>
          </div>
          <button
            type="button"
            className={styles.sell}
            onClick={() => gameBus.emit(BUS_EVENTS.sellRequest)}
          >
            판매 +⛁{selected.sellRefund}
          </button>
        </div>
      ) : null}
      <div className={styles.row}>
        <button
          type="button"
          className={clsx(styles.buy, state.buyAffordable && !state.fieldFull ? styles.affordable : null)}
          onClick={() => gameBus.emit(BUS_EVENTS.buyRequest)}
          disabled={!state.buyAffordable || state.fieldFull}
        >
          <span className={styles.buyCost}>⛁ {state.buyCost.toLocaleString()}</span>
          <span className={styles.buyMain}>유닛 소환</span>
          <span className={styles.slotCount}>
            {state.unitsPlaced}/{state.unitsMax}
          </span>
        </button>
      </div>
    </div>
  );
};
