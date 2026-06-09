'use client';

import clsx from 'clsx';
import { DAILY_CAP, useDaily } from 'lib/useDaily';
import { useGameState } from 'lib/useGameState';
import { usePlayer } from 'lib/usePlayer';
import styles from './Hud.module.scss';

export const Hud = () => {
  const state = useGameState();
  const player = usePlayer((s) => s.player);
  const ticketsToday = useDaily((s) => s.ticketsToday);

  if (!state) return null;

  const hpRatio = Math.max(0, Math.min(1, state.hp / state.hpMax));

  return (
    <div className={styles.hud}>
      <div className={styles.bar}>
        <div className={styles.cell}>
          <span className={styles.lbl}>{player?.nickname ?? '게스트'}</span>
        </div>
        <div
          className={clsx(styles.cell, styles.stage, state.isBossStage ? styles.boss : null)}
        >
          <span className={styles.k}>WAVE</span> {state.stage}
          {state.isBossStage ? <span className={styles.bossPill}>BOSS</span> : null}
        </div>
        <div className={styles.cell}>
          <span className={styles.k}>점수</span> {state.score.toLocaleString()}
        </div>
      </div>
      <div className={styles.bar2}>
        <div className={styles.hpWrap}>
          <div className={styles.hpBar}>
            <div className={styles.hpFill} style={{ width: `${hpRatio * 100}%` }} />
          </div>
          <span className={styles.hpText}>
            {state.hp}/{state.hpMax}
          </span>
        </div>
        <div className={styles.pill}>
          ⛁ {state.gold.toLocaleString()}
        </div>
        <div className={styles.pill}>
          🎟 {ticketsToday}/{DAILY_CAP}
        </div>
      </div>
    </div>
  );
};
