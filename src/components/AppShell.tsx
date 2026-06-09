'use client';

import dynamic from 'next/dynamic';
import { useDailyResetSync } from 'lib/useDailyResetSync';
import { usePolyballBridge } from 'lib/usePolyballBridge';
import styles from './AppShell.module.scss';

const PhaserCanvas = dynamic(
  () => import('./PhaserCanvas').then((m) => ({ default: m.PhaserCanvas })),
  { ssr: false },
);

type Props = Readonly<{ children?: React.ReactNode }>;

export const AppShell = ({ children }: Props) => {
  usePolyballBridge();
  useDailyResetSync();

  return (
    <div className={styles.shell}>
      <div className={styles.appFrame}>
        <PhaserCanvas />
        {children}
      </div>
    </div>
  );
};
