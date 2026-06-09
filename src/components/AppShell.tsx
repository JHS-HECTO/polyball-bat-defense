'use client';

import { useDaily, DAILY_CAP } from 'lib/useDaily';
import { useDailyResetSync } from 'lib/useDailyResetSync';
import { usePlayer } from 'lib/usePlayer';
import { usePolyballBridge } from 'lib/usePolyballBridge';
import styles from './AppShell.module.scss';

type Props = Readonly<{ children?: React.ReactNode }>;

export const AppShell = ({ children }: Props) => {
  usePolyballBridge();
  useDailyResetSync();

  const player = usePlayer((s) => s.player);
  const totalScore = usePlayer((s) => s.totalScore);
  const ticketsToday = useDaily((s) => s.ticketsToday);

  return (
    <div className={styles.shell}>
      <div className={styles.appFrame}>
        {children ?? (
          <div className={styles.placeholder}>
            <div className={styles.title}>빠따 디펜스</div>
            <div className={styles.subtitle}>postMessage scaffold 완료</div>

            <dl className={styles.status}>
              <dt>닉네임</dt>
              <dd>{player?.nickname ?? '(미수신)'}</dd>
              <dt>팀</dt>
              <dd>{player?.team ?? '-'}</dd>
              <dt>누적 점수</dt>
              <dd>{totalScore.toLocaleString()}</dd>
              <dt>오늘 응모권</dt>
              <dd>
                {ticketsToday} / {DAILY_CAP}
              </dd>
            </dl>
          </div>
        )}
      </div>
    </div>
  );
};
