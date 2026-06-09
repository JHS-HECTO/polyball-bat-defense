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
      <div className={styles.row1}>
        <div className={styles.nickBlock}>
          <div className={styles.nick}>{player?.nickname ?? '게스트'}</div>
          {player?.team ? <div className={styles.team}>{player.team}</div> : null}
        </div>
        <div className={styles.ticketBlock} aria-label="오늘 응모권">
          <span className={styles.ticketIcon} aria-hidden>
            🎟
          </span>
          <span className={styles.ticketCount}>
            {ticketsToday} / {DAILY_CAP}
          </span>
        </div>
      </div>
      <div className={styles.row2}>
        <div className={styles.stageBlock}>
          <div className={styles.stageLabel}>스테이지</div>
          <div
            className={clsx(
              styles.stageValue,
              state.isBossStage ? styles.stageBoss : null,
            )}
          >
            {state.stage}
            {state.isBossStage ? <span className={styles.bossPill}>BOSS</span> : null}
          </div>
        </div>
        <div className={styles.scoreBlock}>
          <div className={styles.scoreLabel}>점수</div>
          <div className={styles.scoreValue}>{state.score.toLocaleString()}</div>
        </div>
      </div>
      <div className={styles.row3}>
        <div className={styles.hpBlock}>
          <div className={styles.hpLabel}>
            <span>라이프</span>
            <span>
              {state.hp} / {state.hpMax}
            </span>
          </div>
          <div className={styles.hpBar}>
            <div className={styles.hpFill} style={{ width: `${hpRatio * 100}%` }} />
          </div>
        </div>
        <div className={styles.goldBlock} aria-label="골드">
          <span className={styles.goldIcon} aria-hidden>
            ⛁
          </span>
          <span className={styles.goldValue}>{state.gold.toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
};
