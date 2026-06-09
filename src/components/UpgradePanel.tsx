'use client';

import clsx from 'clsx';
import { BUS_EVENTS, gameBus, type UpgradeKind } from 'game/gameBus';
import { useGameState } from 'lib/useGameState';
import styles from './UpgradePanel.module.scss';

type ButtonSpec = {
  kind: UpgradeKind;
  label: string;
  sub: (s: ReturnType<typeof useGameState>) => string;
  tier: (s: ReturnType<typeof useGameState>) => number;
  cost: (s: ReturnType<typeof useGameState>) => number | null;
};

const BUTTONS: readonly ButtonSpec[] = [
  {
    kind: 'damage',
    label: '데미지',
    sub: (s) => `${Math.round(s?.damage ?? 0)}`,
    tier: (s) => s?.damageTier ?? 0,
    cost: (s) => s?.damageCost ?? null,
  },
  {
    kind: 'speed',
    label: '공속',
    sub: (s) => `${((1000 / (s?.attackCooldown ?? 700)) || 0).toFixed(2)}/s`,
    tier: (s) => s?.speedTier ?? 0,
    cost: (s) => s?.speedCost ?? null,
  },
  {
    kind: 'range',
    label: '사거리',
    sub: (s) => `${Math.round(s?.range ?? 0)}`,
    tier: (s) => s?.rangeTier ?? 0,
    cost: (s) => s?.rangeCost ?? null,
  },
  {
    kind: 'bat',
    label: '빠따',
    sub: (s) => `Tier ${s?.batTier ?? 0}`,
    tier: (s) => s?.batTier ?? 0,
    cost: (s) => s?.batCost ?? null,
  },
];

export const UpgradePanel = () => {
  const state = useGameState();
  if (!state || state.isGameOver) return null;

  return (
    <div className={styles.panel}>
      {BUTTONS.map((b) => {
        const cost = b.cost(state);
        const affordable = cost !== null && state.gold >= cost;
        const isMax = cost === null;
        return (
          <button
            key={b.kind}
            type="button"
            className={clsx(styles.btn, isMax ? styles.btnMax : null, affordable && !isMax ? styles.btnAffordable : null)}
            onClick={() => gameBus.emit(BUS_EVENTS.upgradeRequest, b.kind)}
            disabled={!affordable}
          >
            <span className={styles.title}>{b.label}</span>
            <span className={styles.sub}>{b.sub(state)}</span>
            <span className={styles.tier}>Lv. {b.tier(state) + 1}</span>
            <span className={styles.cost}>
              {isMax ? 'MAX' : `⛁ ${cost?.toLocaleString()}`}
            </span>
          </button>
        );
      })}
    </div>
  );
};
