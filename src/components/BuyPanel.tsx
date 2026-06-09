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
      <div className={styles.hint}>같은 Lv 유닛 끼리 드래그 → 합성</div>
      <div className={styles.row}>
        <button
          type="button"
          className={clsx(styles.buy, state.buyAffordable && !state.fieldFull ? styles.affordable : null)}
          onClick={() => gameBus.emit(BUS_EVENTS.buyRequest)}
          disabled={!state.buyAffordable || state.fieldFull}
        >
          <span className={styles.buyMain}>유닛 뽑기</span>
          <span className={styles.buyCost}>⛁ {state.buyCost.toLocaleString()}</span>
          <span className={styles.slotCount}>
            슬롯 {state.unitsPlaced}/{state.unitsMax}
          </span>
        </button>
        {selected ? (
          <div className={styles.selected}>
            <div className={styles.selTitle}>
              {TYPE_LABELS[selected.type]} <span className={styles.selLv}>Lv{selected.level}</span>
            </div>
            <div className={styles.selStat}>DMG {selected.damage}</div>
            <div className={styles.selStat}>RNG {selected.range}</div>
            <button
              type="button"
              className={styles.sell}
              onClick={() => gameBus.emit(BUS_EVENTS.sellRequest)}
            >
              판매 +⛁{selected.sellRefund}
            </button>
          </div>
        ) : (
          <div className={styles.selectedEmpty}>유닛 탭 → 판매</div>
        )}
      </div>
    </div>
  );
};
