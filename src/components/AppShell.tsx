'use client';

import dynamic from 'next/dynamic';
import { useBossReward } from 'lib/useBossReward';
import { useDailyResetSync } from 'lib/useDailyResetSync';
import { usePolyballBridge } from 'lib/usePolyballBridge';
import { BuyPanel } from './BuyPanel';
import { GameOverModal } from './GameOverModal';
import { Hud } from './Hud';
import { ToastStack } from './ToastStack';
import styles from './AppShell.module.scss';

const PhaserCanvas = dynamic(
  () => import('./PhaserCanvas').then((m) => ({ default: m.PhaserCanvas })),
  { ssr: false },
);

type Props = Readonly<{ children?: React.ReactNode }>;

export const AppShell = ({ children }: Props) => {
  usePolyballBridge();
  useDailyResetSync();
  useBossReward();

  return (
    <div className={styles.shell}>
      <div className={styles.appFrame}>
        <PhaserCanvas />
        <Hud />
        <BuyPanel />
        <ToastStack />
        <GameOverModal />
        {children}
      </div>
    </div>
  );
};
